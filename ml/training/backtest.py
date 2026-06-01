"""Rolling-origin backtesting for time-series forecasting.

Produces per-fold predictions and metrics using an expanding-window scheme.

Usage:
  python backtest.py --features ml/training/data/features.parquet --horizon 4
"""
from __future__ import annotations

import argparse
from pathlib import Path
import warnings

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor


def detect_target(df: pd.DataFrame) -> str:
    candidates = ["target", "price", "price_40kg", "weekly_price"]
    for c in candidates:
        if c in df.columns:
            return c
    for c in df.columns:
        if "price" in c.lower():
            return c
    raise ValueError("Couldn't detect target column. Pass --target explicitly.")


def metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    from sklearn.metrics import mean_absolute_error, mean_squared_error

    mae = mean_absolute_error(y_true, y_pred)
    rmse = mean_squared_error(y_true, y_pred, squared=False)
    nonzero = y_true != 0
    if nonzero.sum() > 0:
        mape = (np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])).mean() * 100
    else:
        mape = float('nan')
    return {"mae": float(mae), "rmse": float(rmse), "mape": float(mape)}


def expanding_backtest(df: pd.DataFrame, target_col: str, horizon: int = 4, min_train_periods: int = 52):
    if "date" not in df.columns:
        raise ValueError("DataFrame must contain a 'date' column for time ordering")

    df = df.sort_values("date").reset_index(drop=True)
    dates = df["date"].dt.to_period("W").unique()
    dates = sorted(dates)

    if len(dates) < min_train_periods + horizon:
        raise ValueError("Not enough time periods for requested backtest configuration")

    fold_metrics = []
    all_preds = []

    # step by horizon
    for i in range(min_train_periods, len(dates) - horizon + 1, horizon):
        train_per = set(dates[:i])
        val_per = set(dates[i : i + horizon])

        train_idx = df["date"].dt.to_period("W").isin(train_per)
        val_idx = df["date"].dt.to_period("W").isin(val_per)

        if val_idx.sum() == 0:
            continue

        X_train = df.loc[train_idx].drop(columns=[target_col])
        y_train = df.loc[train_idx, target_col].values
        X_val = df.loc[val_idx].drop(columns=[target_col])
        y_val = df.loc[val_idx, target_col].values

        # convert object columns to category
        for c in X_train.select_dtypes(include="object").columns:
            X_train[c] = X_train[c].astype("category")
            X_val[c] = X_val[c].astype("category")

        model = LGBMRegressor(n_estimators=1000, learning_rate=0.05, random_state=42)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], early_stopping_rounds=50, verbose=False)

        preds = model.predict(X_val)

        m = metrics(y_val, preds)
        m["train_end_period"] = str(dates[i - 1])
        m["val_start_period"] = str(dates[i])
        m["val_end_period"] = str(dates[i + horizon - 1])
        fold_metrics.append(m)

        preds_df = df.loc[val_idx, ["date"]].copy()
        preds_df["y_true"] = y_val
        preds_df["y_pred"] = preds
        preds_df["train_end_period"] = str(dates[i - 1])
        all_preds.append(preds_df)

    metrics_df = pd.DataFrame(fold_metrics)
    preds_all = pd.concat(all_preds, ignore_index=True) if all_preds else pd.DataFrame()

    return metrics_df, preds_all


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--features", default="ml/training/data/features.parquet")
    parser.add_argument("--output-dir", default="ml/training/backtest_reports")
    parser.add_argument("--horizon", type=int, default=4)
    parser.add_argument("--min-train-periods", type=int, default=52)
    parser.add_argument("--target", default=None)
    args = parser.parse_args(argv)

    features_path = Path(args.features)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading features from {features_path}")
    df = pd.read_parquet(features_path)

    if args.target:
        target_col = args.target
    else:
        target_col = detect_target(df)

    if df[target_col].isnull().all():
        raise ValueError("Target column contains only nulls")

    # ensure date column is datetime
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"])

    print(f"Backtesting target: {target_col}, horizon={args.horizon}, min_train_periods={args.min_train_periods}")

    metrics_df, preds_df = expanding_backtest(df, target_col, horizon=args.horizon, min_train_periods=args.min_train_periods)

    metrics_df.to_csv(out_dir / "fold_metrics.csv", index=False)
    if not preds_df.empty:
        preds_df.to_parquet(out_dir / "backtest_predictions.parquet")

    print("Backtest complete")
    print(metrics_df)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
