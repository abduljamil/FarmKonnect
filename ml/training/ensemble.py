"""Ensembling utilities: mean ensemble and stacking for forecasts.

Creates OOF predictions for base learners using TimeSeriesSplit and trains a
meta-learner (Ridge) to produce stacked forecasts. Saves models and reports.

Usage:
  python ensemble.py --features ml/training/data/features.parquet
"""
from __future__ import annotations

import argparse
from pathlib import Path
import warnings

import joblib
from sklearn.base import clone
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


def detect_target(df: pd.DataFrame) -> str:
    for c in ("target", "price", "weekly_price"):
        if c in df.columns:
            return c
    for c in df.columns:
        if "price" in c.lower():
            return c
    raise ValueError("Couldn't detect target column. Pass --target explicitly.")


def metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae = mean_absolute_error(y_true, y_pred)
    # compute RMSE directly for compatibility
    rmse = float(((y_true - y_pred) ** 2).mean() ** 0.5)
    nonzero = y_true != 0
    if nonzero.sum() > 0:
        mape = (np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])).mean() * 100
    else:
        mape = float('nan')
    return {"mae": float(mae), "rmse": float(rmse), "mape": float(mape)}


def make_oof_preds(models, X: pd.DataFrame, y: np.ndarray, n_splits: int = 5):
    tscv = TimeSeriesSplit(n_splits=n_splits)
    oof = {name: np.zeros(len(y)) for name in models}

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train = y[train_idx]
        for name, model in models.items():
            # clone model to avoid state leakage
            try:
                mdl = clone(model)
            except Exception:
                # fallback: try joblib roundtrip
                mdl = joblib.loads(joblib.dumps(model))
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                mdl.fit(X_train, y_train)
            preds = mdl.predict(X_val)
            oof[name][val_idx] = preds

    return oof


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--features", default="ml/training/data/features.parquet")
    parser.add_argument("--output-dir", default="ml/training/ensemble_models")
    parser.add_argument("--n-splits", type=int, default=5)
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

    df = df.dropna(subset=[target_col]).reset_index(drop=True)
    if "date" in df.columns:
        df = df.sort_values("date").reset_index(drop=True)

    y = df[target_col].values
    X = df.drop(columns=[target_col])
    drop_cols = [c for c in ("id", "index") if c in X.columns]
    X = X.drop(columns=drop_cols)

    for c in X.select_dtypes(include="object").columns:
        X[c] = X[c].astype("category")

    # define base learners
    base_models = {
        "lgbm": LGBMRegressor(n_estimators=1000, learning_rate=0.05, random_state=42),
        "rf": RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
    }

    print("Generating OOF predictions for base learners...")
    oof = make_oof_preds(base_models, X, y, n_splits=args.n_splits)
    oof_df = pd.DataFrame(oof)

    # mean ensemble
    mean_pred = oof_df.mean(axis=1).values
    mean_metrics = metrics(y, mean_pred)
    print("Mean ensemble metrics:", mean_metrics)

    # stacking: train meta-learner on OOF preds
    meta_X = oof_df
    meta_y = y
    meta_model = Ridge(alpha=1.0)
    meta_model.fit(meta_X, meta_y)
    stack_pred = meta_model.predict(meta_X)
    stack_metrics = metrics(meta_y, stack_pred)
    print("Stacking metrics (on OOF):", stack_metrics)

    # save models and artifacts
    for name, mdl in base_models.items():
        path = out_dir / f"base_{name}.joblib"
        joblib.dump(mdl, path)
    joblib.dump(meta_model, out_dir / "meta_ridge.joblib")

    # save oof and metrics
    oof_save = df.reset_index(drop=True).copy()
    for col in oof_df.columns:
        oof_save[f"oof_{col}"] = oof_df[col].values
    oof_save["mean_ensemble"] = mean_pred
    oof_save["stack_ensemble"] = stack_pred
    oof_save.to_parquet(out_dir / "ensemble_oof.parquet")

    pd_metrics = pd.DataFrame([{"method": "mean", **mean_metrics}, {"method": "stack", **stack_metrics}])
    pd_metrics.to_csv(out_dir / "ensemble_metrics.csv", index=False)

    print("Ensembling complete. Artifacts written to", out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
