"""Baseline training script for FarmKonnect forecasting.

Usage:
  python train_models.py --features ml/training/data/features.parquet

This script trains a LightGBM baseline using time-series cross-validation,
 saves out-of-fold predictions, evaluation metrics, and a final model artifact.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit
from lightgbm import LGBMRegressor


def detect_target(df: pd.DataFrame) -> str:
    candidates = [
        "target",
        "price",
        "price_40kg",
        "price_per_40kg",
        "weekly_price",
        "price_wk",
    ]
    for c in candidates:
        if c in df.columns:
            return c
    # fallback: any column with 'price' in its name
    for c in df.columns:
        if "price" in c.lower():
            return c
    raise ValueError("Couldn't detect target column. Pass --target explicitly.")


def metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = mean_squared_error(y_true, y_pred, squared=False)
    # MAPE: handle zeros safely
    nonzero = y_true != 0
    if nonzero.sum() > 0:
        mape = (np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])).mean() * 100
    else:
        mape = float('nan')
    return {"mae": float(mae), "rmse": float(rmse), "mape": float(mape)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--features", default="ml/training/data/features.parquet")
    parser.add_argument("--output-dir", default="ml/training/models")
    parser.add_argument("--n-splits", type=int, default=5)
    parser.add_argument("--target", default=None)
    args = parser.parse_args(argv)

    features_path = Path(args.features)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not features_path.exists():
        raise FileNotFoundError(f"Features file not found: {features_path}")

    print(f"Loading features from {features_path}")
    df = pd.read_parquet(features_path)

    if args.target:
        target_col = args.target
    else:
        target_col = detect_target(df)

    print(f"Detected target column: {target_col}")

    # keep rows with non-null target
    df = df.copy()
    df = df.dropna(subset=[target_col])

    # sort by date if available
    if "date" in df.columns:
        df = df.sort_values("date")

    y = df[target_col].values
    X = df.drop(columns=[target_col])

    # drop obvious identifiers from features (but keep categorical location/commodity)
    drop_cols = [c for c in ("id", "index") if c in X.columns]
    X = X.drop(columns=drop_cols)

    # convert object columns to category for LightGBM
    for c in X.select_dtypes(include="object").columns:
        X[c] = X[c].astype("category")

    tscv = TimeSeriesSplit(n_splits=args.n_splits)

    oof_preds = np.zeros(len(y))
    fold_metrics = []

    print("Starting time-series cross-validation...")
    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        print(f"Fold {fold + 1}/{args.n_splits}: train={len(train_idx)} val={len(val_idx)}")
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y[train_idx], y[val_idx]

        model = LGBMRegressor(n_estimators=1000, learning_rate=0.05, random_state=42)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model.fit(
                X_train,
                y_train,
                eval_set=[(X_val, y_val)],
                early_stopping_rounds=50,
                verbose=False,
            )

        preds = model.predict(X_val)
        oof_preds[val_idx] = preds
        m = metrics(y_val, preds)
        m["fold"] = int(fold + 1)
        fold_metrics.append(m)

    # overall metrics
    overall = metrics(y, oof_preds)
    print("Cross-validation results:")
    print(overall)

    metrics_df = pd.DataFrame(fold_metrics)
    metrics_df.loc["overall"] = {"mae": overall["mae"], "rmse": overall["rmse"], "mape": overall["mape"], "fold": "overall"}
    metrics_df.to_csv(out_dir / "cv_metrics.csv", index=False)

    # save OOF predictions alongside identifiers if present
    preds_df = df.reset_index(drop=True)
    preds_df["oof_pred"] = oof_preds
    preds_df.to_parquet(out_dir / "oof_predictions.parquet")

    # train final model on full data
    print("Training final model on full data...")
    final_model = LGBMRegressor(n_estimators=1000, learning_rate=0.05, random_state=42)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        final_model.fit(X, y, verbose=False)

    model_path = out_dir / "lgbm_full.joblib"
    joblib.dump(final_model, model_path)
    print(f"Saved final model to {model_path}")

    # write a short report
    report = {
        "features_path": str(features_path),
        "rows": int(len(df)),
        "target": target_col,
        "cv_mae": float(overall["mae"]),
        "cv_rmse": float(overall["rmse"]),
        "cv_mape": float(overall["mape"]),
    }
    pd.Series(report).to_csv(out_dir / "run_report.csv")

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
