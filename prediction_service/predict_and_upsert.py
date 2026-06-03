"""Phase 8 — prediction service.

Refreshes the Phase 2+3+5 pipeline (panel + external collectors + lagged features),
then for every (commodity, variety, city) series picks the latest valid row and
emits a forecast at h ∈ {1, 2, 4, 12} weeks using whichever model the Phase 7
router assigned to that (commodity, horizon) cell. Upserts results into the
Atlas `pricepredictions` collection.

We deliberately re-run the existing training-side pipeline scripts rather than
re-implementing lag/rolling/exogenous-join logic inline — the "mirror exactly"
rule applies; any drift between training and inference silently corrupts
predictions. See PLAN.md decision (2026-06-03).

Modes:
    --mode live       only the most-recent valid row per series (default)
    --mode backfill   the last --backfill-weeks rows per series (for chart context)

Usage:
    python predict_and_upsert.py --mode live
    python predict_and_upsert.py --mode backfill --backfill-weeks 12
    python predict_and_upsert.py --skip-pipeline   # reuse existing features_lagged.parquet
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from pymongo import MongoClient, UpdateOne

HORIZONS = [1, 2, 4, 12]
GROUP_COLS = ["commodity", "variety", "city"]

REPO_ROOT = Path(os.environ.get("REPO_ROOT", "/app"))
WORK_DIR = Path(os.environ.get("WORK_DIR", "/work"))
COLLECTION = os.environ.get("PREDICTION_COLLECTION", "pricepredictions")
DB_NAME = os.environ.get("MONGODB_DB", "FarmKonnect")

ROUTER_PATH = REPO_ROOT / "ml" / "training" / "router" / "router_config.json"
MODELS_DIR = REPO_ROOT / "ml" / "training" / "models"
POLICY_CSV = REPO_ROOT / "ml" / "external" / "policy_events.csv"


def log(stage: str, msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] [{stage}] {msg}", flush=True)


def _run(name: str, cmd: list[str]) -> None:
    log("pipeline", f"-> {name}")
    result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        # tail logs so we can diagnose failures from `docker logs`
        log("pipeline", f"{name} FAILED rc={result.returncode}")
        if result.stdout:
            log("pipeline", f"stdout tail: {result.stdout[-800:]}")
        if result.stderr:
            log("pipeline", f"stderr tail: {result.stderr[-800:]}")
        raise RuntimeError(f"{name} failed (rc={result.returncode})")


def refresh_pipeline(skip_if_cached_external: bool = True) -> None:
    """Re-run Phase 2 + 3 + 5 to produce a fresh features_lagged.parquet.

    External collectors (WB / yfinance / NASA POWER) are skipped if their cache
    parquet already exists in /work/data/external — they're slow and don't
    change within a single weekly cycle. Set skip_if_cached_external=False to
    always refresh them.
    """
    work = str(WORK_DIR)
    ext = WORK_DIR / "data" / "external"
    py = sys.executable

    _run("build_panel", [
        py, str(REPO_ROOT / "ml/training/build_panel.py"),
        "--out", work,
    ])

    collectors = [
        ("fetch_worldbank",  "worldbank_monthly.parquet", "ml/training/collectors/fetch_worldbank.py"),
        ("fetch_yfinance",   "markets_daily.parquet",     "ml/training/collectors/fetch_yfinance.py"),
        ("fetch_nasa_power", "weather_daily.parquet",     "ml/training/collectors/fetch_nasa_power.py"),
    ]
    for name, cache_file, script in collectors:
        if skip_if_cached_external and (ext / cache_file).exists():
            log("pipeline", f"-> {name}: cached ({ext / cache_file}), skipping")
            continue
        _run(name, [py, str(REPO_ROOT / script), "--out", work])

    _run("build_deterministic", [
        py, str(REPO_ROOT / "ml/training/features/build_deterministic.py"),
        "--panel",  f"{work}/data/panel.parquet",
        "--policy", str(POLICY_CSV),
        "--out",    work,
    ])

    _run("build_features", [
        py, str(REPO_ROOT / "ml/training/build_features.py"),
        "--out", work,
    ])

    _run("build_lagged", [
        py, str(REPO_ROOT / "ml/training/features/build_lagged.py"),
        "--in",  f"{work}/data/features.parquet",
        "--out", f"{work}/data/features_lagged.parquet",
        "--summary", f"{work}/data/features_lagged_summary.csv",
    ])


def load_router() -> dict:
    with open(ROUTER_PATH) as f:
        cfg = json.load(f)
    log("router", f"loaded {len(cfg['cells'])} cells, version={cfg.get('version')}, generated_at={cfg.get('generated_at')}")
    return cfg


def _slug(c: str) -> str:
    return (c.lower()
              .replace(" ", "_")
              .replace("(", "")
              .replace(")", ""))


def load_models(router: dict) -> dict:
    """Load only the joblib bundles the router actually references.

    Returns a dict keyed by:
      ("lgbm", h)                                — global mean LGBM per horizon
      ("lgbm_per_commodity", commodity, h)      — Phase 6.5 specialist
      ("lgbm_quantile_median", h)               — Phase 6.5 quantile median
    """
    cells = router["cells"]
    need_global: set[int] = set()
    need_per_commodity: set[tuple[str, int]] = set()
    need_quantile_median: set[int] = set()

    for cell in cells.values():
        m = cell["model"]
        h = cell["horizon"]
        if m == "lgbm":
            need_global.add(h)
        elif m == "lgbm_per_commodity":
            need_per_commodity.add((cell["commodity"], h))
        elif m == "lgbm_quantile_median":
            need_quantile_median.add(h)

    models: dict = {}
    for h in need_global:
        models[("lgbm", h)] = joblib.load(MODELS_DIR / f"lgbm_h{h}.joblib")
    for commodity, h in need_per_commodity:
        models[("lgbm_per_commodity", commodity, h)] = joblib.load(
            MODELS_DIR / f"lgbm_{_slug(commodity)}_h{h}.joblib"
        )
    for h in need_quantile_median:
        models[("lgbm_quantile_median", h)] = joblib.load(
            MODELS_DIR / f"lgbm_h{h}_q50.joblib"
        )

    log("models",
        f"loaded global={sorted(need_global)} "
        f"per_commodity={sorted(need_per_commodity)} "
        f"quantile_median={sorted(need_quantile_median)}")
    return models


def _select_anchors(df: pd.DataFrame, mode: str, backfill_weeks: int) -> pd.DataFrame:
    """Pick the rows we'll anchor predictions on.

    'live'     -> last valid row per series (one anchor per series)
    'backfill' -> last `backfill_weeks` valid rows per series
    """
    df = df[df["price"].notna()].copy()
    df = df.sort_values(GROUP_COLS + ["date"])
    n = 1 if mode == "live" else backfill_weeks
    return df.groupby(GROUP_COLS, dropna=False, sort=False).tail(n).reset_index(drop=True)


def _predict_lgbm_batch(anchors: pd.DataFrame, bundle: dict) -> pd.Series:
    """Vectorized LGBM prediction. Returns absolute price predictions.

    Works for any LGBM bundle: global, per-commodity, or quantile. All share
    the same {model, feature_cols, categoricals} structure.
    """
    feature_cols = bundle["feature_cols"]
    cats = bundle["categoricals"]
    model = bundle["model"]
    X = anchors.reindex(columns=feature_cols).copy()
    for c in cats:
        if c in X.columns:
            X[c] = X[c].astype("category")
    pct = model.predict(X)
    return pd.Series(anchors["price"].values * (1.0 + pct), index=anchors.index)


def _dispatch_for_horizon(
    anchors: pd.DataFrame, h: int, cells: dict, models: dict,
) -> dict[int, float]:
    """One-horizon dispatch: returns dict {anchor_idx: predicted_price}.

    Routes each anchor to whichever model the router chose for (commodity, h),
    then runs each model type as one batched call over its routed slice.
    """
    out: dict[int, float] = {}

    # Map each anchor to its model name at this horizon
    anchor_models = anchors["commodity"].map(
        lambda c: cells.get(f"{c}__h{h}", {}).get("model")
    )

    # persistence: y_pred = price
    m_p = anchor_models == "persistence"
    if m_p.any():
        for idx, price in zip(anchors.index[m_p], anchors.loc[m_p, "price"].values):
            out[idx] = float(price)

    # ma4: y_pred = price_lag1_ma4
    m_ma = anchor_models == "ma4"
    if m_ma.any():
        for idx, v in zip(anchors.index[m_ma], anchors.loc[m_ma, "price_lag1_ma4"].values):
            if not pd.isna(v):
                out[idx] = float(v)

    # global LGBM (mean): one batched predict over the routed slice
    m_lg = anchor_models == "lgbm"
    if m_lg.any() and ("lgbm", h) in models:
        preds = _predict_lgbm_batch(anchors[m_lg], models[("lgbm", h)])
        for idx, p in preds.items():
            if not pd.isna(p):
                out[idx] = float(p)

    # per-commodity LGBM: one batched predict per (commodity, h) slice
    m_pc = anchor_models == "lgbm_per_commodity"
    if m_pc.any():
        for commodity, csub in anchors[m_pc].groupby("commodity"):
            key = ("lgbm_per_commodity", commodity, h)
            if key not in models:
                log("predict", f"missing model bundle {key}; skipping {len(csub)} anchors")
                continue
            preds = _predict_lgbm_batch(csub, models[key])
            for idx, p in preds.items():
                if not pd.isna(p):
                    out[idx] = float(p)

    # quantile-median LGBM: one batched predict over the routed slice
    m_qm = anchor_models == "lgbm_quantile_median"
    if m_qm.any() and ("lgbm_quantile_median", h) in models:
        preds = _predict_lgbm_batch(anchors[m_qm], models[("lgbm_quantile_median", h)])
        for idx, p in preds.items():
            if not pd.isna(p):
                out[idx] = float(p)

    return out


def build_prediction_docs(
    features_path: Path,
    router: dict,
    models: dict,
    mode: str = "live",
    backfill_weeks: int = 12,
) -> list[dict]:
    cells = router["cells"]
    router_version = router.get("version")
    router_generated_at = router.get("generated_at")

    df = pd.read_parquet(features_path)
    anchors = _select_anchors(df, mode, backfill_weeks)
    log("predict", f"mode={mode} anchors={len(anchors)} across {anchors.groupby(GROUP_COLS, dropna=False).ngroups} series")

    now = datetime.now(timezone.utc)
    docs: list[dict] = []

    for h in HORIZONS:
        # Per-horizon dispatch — one batched LGBM call per (model_type [× commodity]) slice.
        preds_by_idx = _dispatch_for_horizon(anchors, h, cells, models)

        for idx, row in anchors.iterrows():
            cell_key = f"{row['commodity']}__h{h}"
            cell = cells.get(cell_key)
            if cell is None:
                continue
            if idx not in preds_by_idx:
                continue  # anchor missing its required feature (e.g. NaN price_lag1_ma4)
            y_pred = preds_by_idx[idx]

            anchor_date = pd.Timestamp(row["date"]).to_pydatetime()
            forecast_date = (pd.Timestamp(row["date"]) + pd.Timedelta(weeks=h)).to_pydatetime()

            # Mirror the live commodityprices convention: variety is NULL for
            # varietyless commodities (Wheat/Sugar/Maize/Seed Cotton). The
            # build_panel.py pipeline writes "" instead, so normalize here.
            v = row.get("variety")
            variety = None if (pd.isna(v) or v == "") else str(v)

            docs.append({
                "commodity":            str(row["commodity"]),
                "variety":              variety,
                "city":                 str(row["city"]),
                "unit":                 None if pd.isna(row.get("unit")) else str(row["unit"]),
                "anchor_date":          anchor_date,
                "anchor_price":         float(row["price"]),
                "forecast_date":        forecast_date,
                "horizon_weeks":        h,
                "predicted_price":      y_pred,
                "model":                cell["model"],
                "expected_mape":        cell.get("expected_mape"),
                "router_version":       router_version,
                "router_generated_at":  router_generated_at,
                "generated_at":         now,
            })

    log("predict", f"emitted {len(docs)} prediction docs")
    return docs


def ensure_indexes(coll) -> None:
    coll.create_index(
        [("commodity", 1), ("variety", 1), ("city", 1),
         ("forecast_date", 1), ("horizon_weeks", 1)],
        unique=True,
        name="series_forecast_unique",
    )
    coll.create_index([("forecast_date", -1)], name="forecast_date_desc")
    coll.create_index([("anchor_date", -1)], name="anchor_date_desc")


def upsert_predictions(docs: list[dict], mongo_uri: str) -> int:
    if not docs:
        log("upsert", "no docs to upsert")
        return 0

    client = MongoClient(mongo_uri)
    coll = client[DB_NAME][COLLECTION]
    ensure_indexes(coll)

    ops = [
        UpdateOne(
            {
                "commodity":     d["commodity"],
                "variety":       d["variety"],
                "city":          d["city"],
                "forecast_date": d["forecast_date"],
                "horizon_weeks": d["horizon_weeks"],
            },
            {"$set": d},
            upsert=True,
        )
        for d in docs
    ]

    total_upserted = 0
    total_modified = 0
    BATCH = 500
    for i in range(0, len(ops), BATCH):
        chunk = ops[i:i + BATCH]
        result = coll.bulk_write(chunk, ordered=False)
        total_upserted += result.upserted_count
        total_modified += result.modified_count

    log("upsert", f"wrote to {DB_NAME}.{COLLECTION}: upserted={total_upserted} modified={total_modified} (of {len(docs)})")
    return total_upserted + total_modified


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default="live", choices=["live", "backfill"])
    ap.add_argument("--backfill-weeks", type=int, default=12)
    ap.add_argument("--skip-pipeline", action="store_true",
                    help="reuse existing /work/data/features_lagged.parquet")
    ap.add_argument("--refresh-external", action="store_true",
                    help="re-fetch WB / yfinance / NASA POWER (default reuses cached)")
    args = ap.parse_args(argv)

    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        log("main", "MONGODB_URI not set; aborting")
        return 2

    if not args.skip_pipeline:
        refresh_pipeline(skip_if_cached_external=not args.refresh_external)

    features_path = WORK_DIR / "data" / "features_lagged.parquet"
    if not features_path.exists():
        log("main", f"missing {features_path}; cannot --skip-pipeline on a cold workspace")
        return 1

    router = load_router()
    models = load_models(router)
    docs = build_prediction_docs(
        features_path, router, models,
        mode=args.mode, backfill_weeks=args.backfill_weeks,
    )
    upsert_predictions(docs, mongo_uri)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
