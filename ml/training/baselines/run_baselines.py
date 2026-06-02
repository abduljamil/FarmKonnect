"""Phase 4 — naive baselines on features_lagged.parquet.

Three causal baselines per (commodity, variety, city) series, per horizon:

- persistence    : y_pred[t, h] = price[t]                  ("price won't change")
- seasonal_naive : y_pred[t, h] = price[t + h - 52]         ("looks like last year")
- ma4            : y_pred[t, h] = price_lag1_ma4[t]         ("recent 4-wk average")

These are the floor any LightGBM / TFT / Chronos model must beat.

Reports MAE / RMSE / MAPE per (commodity, horizon, baseline) on two scopes:
- full         : every row where both y_h and y_pred are defined
- recent_year  : last 52 weeks per series (mirrors what a held-out test set sees)

Usage:
    python run_baselines.py --in  data/features_lagged.parquet \
                            --out-dir baselines
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

GROUP_COLS = ["commodity", "variety", "city"]
HORIZONS = [1, 2, 4, 12]
BASELINES = ["persistence", "seasonal_naive", "ma4"]


def add_baseline_predictions(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby(GROUP_COLS, dropna=False, sort=False)
    for h in HORIZONS:
        df[f"pred_persistence_h{h}"] = df["price"]
        df[f"pred_seasonal_naive_h{h}"] = g["price"].shift(52 - h)
        df[f"pred_ma4_h{h}"] = df["price_lag1_ma4"]
    return df


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mask = ~(pd.isna(y_true) | pd.isna(y_pred))
    if not mask.any():
        return {"mae": np.nan, "rmse": np.nan, "mape": np.nan, "n": 0}
    yt = y_true[mask].astype(float)
    yp = y_pred[mask].astype(float)
    err = yt - yp
    mae = float(np.abs(err).mean())
    rmse = float(np.sqrt((err ** 2).mean()))
    nonzero = yt != 0
    mape = (
        float(np.abs(err[nonzero] / yt[nonzero]).mean() * 100)
        if nonzero.any()
        else np.nan
    )
    return {"mae": mae, "rmse": rmse, "mape": mape, "n": int(mask.sum())}


def evaluate(
    df: pd.DataFrame, horizon: int, baseline: str, scope: str, commodity: str
) -> dict:
    y_true = df[f"y_{horizon}"].values
    y_pred = df[f"pred_{baseline}_h{horizon}"].values
    return {
        "scope": scope,
        "commodity": commodity,
        "horizon": horizon,
        "baseline": baseline,
        **_metrics(y_true, y_pred),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="data/features_lagged.parquet")
    ap.add_argument("--out-dir", default="baselines")
    ap.add_argument("--holdout-weeks", type=int, default=52)
    args = ap.parse_args(argv)

    in_path = Path(args.in_path)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Reading {in_path}")
    df = pd.read_parquet(in_path)
    df = df.sort_values(GROUP_COLS + ["date"]).reset_index(drop=True)
    n_series = df.groupby(GROUP_COLS, dropna=False).ngroups
    print(f"  rows={len(df):,}  series={n_series}")

    df = add_baseline_predictions(df)

    max_date = df.groupby(GROUP_COLS, dropna=False, sort=False)["date"].transform("max")
    weeks_from_end = (max_date - df["date"]).dt.days // 7
    df["is_recent"] = weeks_from_end < args.holdout_weeks

    rows: list[dict] = []
    scopes = [("full", pd.Series(True, index=df.index)), ("recent_year", df["is_recent"])]
    for scope, mask in scopes:
        sub = df[mask]
        for h in HORIZONS:
            for b in BASELINES:
                rows.append(evaluate(sub, h, b, scope, "ALL"))
        for commodity, sub_c in sub.groupby("commodity", sort=True):
            for h in HORIZONS:
                for b in BASELINES:
                    rows.append(evaluate(sub_c, h, b, scope, commodity))

    metrics_df = pd.DataFrame(rows)
    metrics_path = out_dir / "baseline_metrics.csv"
    metrics_df.to_csv(metrics_path, index=False)
    print(f"\nMetrics -> {metrics_path}")

    pred_cols = (
        GROUP_COLS
        + ["date", "price"]
        + [f"y_{h}" for h in HORIZONS]
        + [f"pred_{b}_h{h}" for h in HORIZONS for b in BASELINES]
    )
    pred_path = out_dir / "baseline_predictions.parquet"
    df[pred_cols].to_parquet(pred_path, index=False)
    print(f"Predictions -> {pred_path}")

    print("\n=== Baseline MAPE % — ALL commodities ===")
    for scope in ("full", "recent_year"):
        sub = metrics_df[(metrics_df.scope == scope) & (metrics_df.commodity == "ALL")]
        pivot = sub.pivot(index="baseline", columns="horizon", values="mape").round(2)
        print(f"\n  [{scope}]")
        print(pivot.to_string())

    print("\n=== Per-commodity best baseline (recent_year MAPE %) ===")
    rec = metrics_df[(metrics_df.scope == "recent_year") & (metrics_df.commodity != "ALL")]
    rec = rec.dropna(subset=["mape"])
    best = rec.loc[rec.groupby(["commodity", "horizon"])["mape"].idxmin()][
        ["commodity", "horizon", "baseline", "mape", "n"]
    ].sort_values(["commodity", "horizon"])
    print(best.to_string(index=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
