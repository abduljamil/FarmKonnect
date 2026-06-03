"""Phase 5 — lagged feature engineering for forecasting.

Reads ``features.parquet`` (weekly panel + deterministic + exogenous joined),
adds proper lag / rolling / shifted-target columns per series, and writes
``features_lagged.parquet`` for downstream modeling.

Per (commodity, variety, city) series we add:
- Own-price lags at 1, 2, 4, 8, 13 weeks
- Rolling statistics over the 1-week-lagged price (no look-ahead):
    * price_lag1_ma4   — 4-week moving average
    * price_lag1_std4  — 4-week stddev
    * price_lag1_ma13  — 13-week moving average
- 1-week lag of every exogenous column (anti-leakage):
    * wx_*  (weather)        -> wx_*_lag1
    * yf_*  (markets / FX)   -> yf_*_lag1
    * wb_*  (World Bank)     -> wb_*_lag1
- Shifted targets for the forecast horizons we'll model:
    * y_1, y_2, y_4, y_12 = price.shift(-h) per series

Dropped:
- ``price_raw`` (un-winsorized current-week price -> target leakage)
- Contemporaneous exogenous columns (replaced by their *_lag1 counterparts)

The original ``price`` column is kept as the source-of-truth target for the
modeling step, but training code must select one of the y_h columns as the
actual target so that no contemporaneous information leaks in.

Usage:
    python build_lagged.py --in  data/features.parquet \
                           --out data/features_lagged.parquet
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

GROUP_COLS = ["commodity", "variety", "city"]
# Phase 6.5 (2026-06-03): extended price lags to include 26 / 39 / 52 weeks.
# At h=12, "what was the price 6/9/12 months ago" gives the model a year-shaped
# anchor that the prior 1-13 wk window misses (pure seasonal_naive at 52 wk is
# bad, but blended with recent lags it helps LGBM at h=12 on the hard series).
PRICE_LAGS = [1, 2, 4, 8, 13, 26, 39, 52]
TARGET_HORIZONS = [1, 2, 4, 12]
EXOG_PREFIXES = ("wx_", "yf_", "wb_")


def _exog_cols(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c.startswith(EXOG_PREFIXES)]


def build_lagged(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(GROUP_COLS + ["date"]).reset_index(drop=True).copy()
    g = df.groupby(GROUP_COLS, dropna=False, sort=False)

    for k in PRICE_LAGS:
        df[f"price_lag_{k}"] = g["price"].shift(k)

    df["_lag1"] = g["price"].shift(1)
    g2 = df.groupby(GROUP_COLS, dropna=False, sort=False)
    df["price_lag1_ma4"] = g2["_lag1"].transform(
        lambda s: s.rolling(4, min_periods=1).mean()
    )
    df["price_lag1_std4"] = g2["_lag1"].transform(
        lambda s: s.rolling(4, min_periods=2).std()
    )
    df["price_lag1_ma13"] = g2["_lag1"].transform(
        lambda s: s.rolling(13, min_periods=1).mean()
    )
    df = df.drop(columns=["_lag1"])

    exog_cols = _exog_cols(df)
    for c in exog_cols:
        df[f"{c}_lag1"] = g[c].shift(1)

    for h in TARGET_HORIZONS:
        df[f"y_{h}"] = g["price"].shift(-h)

    drop_after = ["price_raw", *exog_cols]
    return df.drop(columns=[c for c in drop_after if c in df.columns])


def _summary(df_in: pd.DataFrame, df_out: pd.DataFrame) -> pd.DataFrame:
    n_groups = df_in.groupby(GROUP_COLS, dropna=False).ngroups
    new_cols = sorted(set(df_out.columns) - set(df_in.columns))
    dropped_cols = sorted(set(df_in.columns) - set(df_out.columns))

    target_nan = {
        f"y_{h}": int(df_out[f"y_{h}"].isna().sum()) for h in TARGET_HORIZONS
    }
    lag_nan = {
        f"price_lag_{k}": int(df_out[f"price_lag_{k}"].isna().sum())
        for k in PRICE_LAGS
    }

    return pd.DataFrame(
        [
            {"metric": "rows_in", "value": len(df_in)},
            {"metric": "rows_out", "value": len(df_out)},
            {"metric": "cols_in", "value": df_in.shape[1]},
            {"metric": "cols_out", "value": df_out.shape[1]},
            {"metric": "series", "value": n_groups},
            {"metric": "new_cols", "value": ", ".join(new_cols)},
            {"metric": "dropped_cols", "value": ", ".join(dropped_cols)},
            *[
                {"metric": f"nan_{k}", "value": v}
                for k, v in {**target_nan, **lag_nan}.items()
            ],
        ]
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="data/features.parquet")
    ap.add_argument("--out", dest="out_path", default="data/features_lagged.parquet")
    ap.add_argument("--summary", default="data/features_lagged_summary.csv")
    args = ap.parse_args(argv)

    in_path = Path(args.in_path)
    out_path = Path(args.out_path)
    summary_path = Path(args.summary)

    print(f"Reading {in_path}")
    df_in = pd.read_parquet(in_path)
    print(f"  rows={len(df_in):,}  cols={df_in.shape[1]}")

    df_out = build_lagged(df_in)
    assert len(df_out) == len(df_in), (
        f"row count changed: {len(df_in)} -> {len(df_out)}"
    )
    print(f"Wrote lagged frame: rows={len(df_out):,}  cols={df_out.shape[1]}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_parquet(out_path, index=False)
    print(f"  -> {out_path}")

    summary = _summary(df_in, df_out)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary.to_csv(summary_path, index=False)
    print(f"Summary -> {summary_path}")
    print(summary.to_string(index=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
