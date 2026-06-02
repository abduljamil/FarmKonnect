"""Phase 6 — global LightGBM trainer (one model per horizon).

Trains a separate LGBMRegressor for each forecast horizon h ∈ {1, 2, 4, 12}
on ``features_lagged.parquet``. The model is *global* (all 146 series share
parameters); series identity (commodity, variety, city, unit, msp_regime)
flows in as native LightGBM categoricals.

Target is the **percentage change** ``(y_h - price) / price`` rather than
the absolute level or absolute delta. This makes the persistence baseline
(pct_change=0) a free starting point AND normalizes across commodities with
wildly different unit scales (Sugar in Rs/Kg ~30-180 vs grains in Rs/40Kg
~600-6000) — without this, a global model's loss is dominated by high-price
rows and Sugar's predictions blow up. Final reconstruction is
``y_h_pred = price * (1 + pct_pred)``.

Split: held-out last ``--test-weeks`` per series (default 52), matching the
"recent_year" scope used by the naive-baselines report so the numbers compare
apples-to-apples.

Outputs (under ``--out-dir``):
- ``lgbm_h{1,2,4,12}.joblib`` — trained models
- ``metrics.csv`` — per-horizon overall + per-commodity MAE / RMSE / MAPE
- ``predictions.parquet`` — test-set row, target, prediction (all horizons)
- ``vs_baselines.csv`` — side-by-side MAPE vs persistence/ma4 baseline

Usage:
    python train_lgbm.py --in data/features_lagged.parquet \
                         --out-dir models --test-weeks 52
"""
from __future__ import annotations

import argparse
import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor, early_stopping, log_evaluation

GROUP_COLS = ["commodity", "variety", "city"]
HORIZONS = [1, 2, 4, 12]
CATEGORICALS = ["commodity", "variety", "city", "unit", "msp_regime"]
DROP_ALWAYS = ["date", "n_obs", "filled", "winsorized"]


def _features_target_split(
    df: pd.DataFrame, horizon: int
) -> tuple[pd.DataFrame, pd.Series]:
    """Returns (X, pct_change) where pct_change = (y_h - price) / price."""
    other_targets = [f"y_{h}" for h in HORIZONS if h != horizon]
    drop_cols = DROP_ALWAYS + other_targets + [f"y_{horizon}"]
    X = df.drop(columns=[c for c in drop_cols if c in df.columns])
    pct = (df[f"y_{horizon}"] - df["price"]) / df["price"]
    pct = pct.where(df["price"] > 0)
    for c in CATEGORICALS:
        if c in X.columns:
            X[c] = X[c].astype("category")
    return X, pct


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mask = ~(pd.isna(y_true) | pd.isna(y_pred))
    if not mask.any():
        return {"mae": np.nan, "rmse": np.nan, "mape": np.nan, "n": 0}
    yt = y_true[mask].astype(float)
    yp = y_pred[mask].astype(float)
    err = yt - yp
    mae = float(np.abs(err).mean())
    rmse = float(np.sqrt((err ** 2).mean()))
    nz = yt != 0
    mape = (
        float(np.abs(err[nz] / yt[nz]).mean() * 100) if nz.any() else np.nan
    )
    return {"mae": mae, "rmse": rmse, "mape": mape, "n": int(mask.sum())}


def _train_one(
    df_train: pd.DataFrame, df_test: pd.DataFrame, horizon: int
) -> tuple[LGBMRegressor, pd.Series, list[str]]:
    """Train one LGBM on the pct-change target; return absolute-price predictions."""
    X_tr, pct_tr = _features_target_split(df_train, horizon)
    X_te, pct_te = _features_target_split(df_test, horizon)

    keep = ~pct_tr.isna()
    X_tr, pct_tr = X_tr[keep], pct_tr[keep]

    model = LGBMRegressor(
        n_estimators=2000,
        learning_rate=0.05,
        num_leaves=63,
        min_data_in_leaf=20,
        feature_fraction=0.9,
        bagging_fraction=0.9,
        bagging_freq=5,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model.fit(
            X_tr,
            pct_tr,
            eval_set=[(X_te[~pct_te.isna()], pct_te[~pct_te.isna()])],
            callbacks=[early_stopping(100, verbose=False), log_evaluation(0)],
            categorical_feature=[c for c in CATEGORICALS if c in X_tr.columns],
        )

    pct_pred = model.predict(X_te)
    abs_pred = df_test["price"].values * (1.0 + pct_pred)
    pred = pd.Series(abs_pred, index=X_te.index, name=f"pred_h{horizon}")
    return model, pred, X_tr.columns.tolist()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="data/features_lagged.parquet")
    ap.add_argument("--out-dir", default="models")
    ap.add_argument("--test-weeks", type=int, default=52)
    ap.add_argument(
        "--baselines",
        default="baselines/baseline_metrics.csv",
        help="optional CSV from run_baselines.py for the vs_baselines comparison",
    )
    args = ap.parse_args(argv)

    in_path = Path(args.in_path)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Reading {in_path}")
    df = pd.read_parquet(in_path)
    df = df.sort_values(GROUP_COLS + ["date"]).reset_index(drop=True)
    n_series = df.groupby(GROUP_COLS, dropna=False).ngroups
    print(f"  rows={len(df):,}  series={n_series}  cols={df.shape[1]}")

    max_date = df.groupby(GROUP_COLS, dropna=False, sort=False)["date"].transform("max")
    weeks_from_end = (max_date - df["date"]).dt.days // 7
    test_mask = weeks_from_end < args.test_weeks
    df_train = df[~test_mask].copy()
    df_test = df[test_mask].copy()
    print(f"Split: train={len(df_train):,} rows  test={len(df_test):,} rows")

    test_preds = df_test[GROUP_COLS + ["date", "price"]].copy()
    for h in HORIZONS:
        test_preds[f"y_{h}"] = df_test[f"y_{h}"].values

    metrics_rows: list[dict] = []
    n_feats_used = None
    for h in HORIZONS:
        print(f"\n--- horizon {h} ---")
        model, preds, feature_cols = _train_one(df_train, df_test, h)
        n_feats_used = len(feature_cols) if n_feats_used is None else n_feats_used

        test_preds[f"pred_h{h}"] = preds.values
        y_true = df_test[f"y_{h}"].values
        overall = _metrics(y_true, preds.values)
        overall.update({"horizon": h, "commodity": "ALL"})
        metrics_rows.append(overall)
        print(
            f"  overall: mae={overall['mae']:.2f}  rmse={overall['rmse']:.2f}  "
            f"mape={overall['mape']:.3f}%  n={overall['n']}"
        )

        for commodity, sub in df_test.groupby("commodity", sort=True):
            yt = sub[f"y_{h}"].values
            yp = preds.loc[sub.index].values
            m = _metrics(yt, yp)
            m.update({"horizon": h, "commodity": commodity})
            metrics_rows.append(m)

        model_path = out_dir / f"lgbm_h{h}.joblib"
        joblib.dump(
            {
                "model": model,
                "feature_cols": feature_cols,
                "categoricals": [c for c in CATEGORICALS if c in feature_cols],
                "horizon": h,
                "best_iteration": getattr(model, "best_iteration_", None),
            },
            model_path,
        )
        print(f"  -> {model_path}  best_iter={getattr(model, 'best_iteration_', None)}")

    metrics_df = pd.DataFrame(metrics_rows)
    metrics_df.to_csv(out_dir / "metrics.csv", index=False)
    test_preds.to_parquet(out_dir / "predictions.parquet", index=False)
    print(f"\nMetrics -> {out_dir / 'metrics.csv'}")
    print(f"Predictions -> {out_dir / 'predictions.parquet'}")

    summary = metrics_df[metrics_df.commodity == "ALL"].set_index("horizon")[
        ["mae", "rmse", "mape", "n"]
    ]
    print("\n=== LightGBM — recent year test (ALL commodities) ===")
    print(summary.round(3).to_string())

    bl_path = Path(args.baselines)
    if bl_path.exists():
        bl = pd.read_csv(bl_path)
        bl = bl[(bl.scope == "recent_year") & (bl.commodity == "ALL")]
        bl_pivot = bl.pivot(index="horizon", columns="baseline", values="mape")
        cmp = bl_pivot.copy()
        cmp["lgbm"] = summary["mape"]
        cmp["lgbm_vs_persistence_pct"] = (
            (cmp["lgbm"] - cmp["persistence"]) / cmp["persistence"] * 100
        )
        cmp.to_csv(out_dir / "vs_baselines.csv")
        print("\n=== MAPE % vs naive baselines ===")
        print(cmp.round(3).to_string())
    else:
        print(f"(no {bl_path} found; skipping vs_baselines comparison)")

    meta = {
        "rows_in": int(len(df)),
        "rows_train": int(len(df_train)),
        "rows_test": int(len(df_test)),
        "n_series": int(n_series),
        "n_features": int(n_feats_used) if n_feats_used else None,
        "test_weeks": int(args.test_weeks),
        "horizons": HORIZONS,
    }
    (out_dir / "run_meta.json").write_text(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
