from pymongo import MongoClient
from logging_config import get_logger, start_metrics

logger = get_logger("predict_and_push")
# start metrics server if available
start_metrics()

try:
    from prometheus_client import Counter
    METRICS_ENABLED = True
except Exception:
    METRICS_ENABLED = False

if METRICS_ENABLED:
    FORECASTS_WRITTEN = Counter("fk_forecasts_written_total", "Total forecasts written to DB")
"""Generate short-horizon forecasts and push them to the backend MongoDB.

This script:
- loads the latest feature panel
- builds simple future-week deterministic rows per (commodity,variety,city)
- loads ensemble artifacts (stacked meta if available) and predicts
- writes forecast documents into MongoDB collection `priceforecasts`

Usage:
  MONGODB_URI="..." python predict_and_push.py --features ml/training/data/features.parquet --ensemble ml/training/ensemble_models --horizon 4
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta
from pathlib import Path
import os
import json

import joblib
import numpy as np
import pandas as pd
from pymongo import MongoClient

try:
    from hijri_converter import Gregorian
except Exception:
    Gregorian = None


def cal_fields_for_date(d: pd.Timestamp) -> dict:
    dt = d
    woy = int(dt.isocalendar().week)
    cal_woy_sin = np.sin(2 * np.pi * woy / 52.0)
    cal_woy_cos = np.cos(2 * np.pi * woy / 52.0)
    is_ramadan = is_eid_fitr = is_eid_adha = 0
    if Gregorian is not None:
        try:
            h = Gregorian(dt.year, dt.month, dt.day).to_hijri()
            m, day = h.month, h.day
            is_ramadan = int(m == 9)
            is_eid_fitr = int(m == 10 and day <= 3)
            is_eid_adha = int(m == 12 and 8 <= day <= 13)
        except Exception:
            pass
    return {
        "date": dt,
        "cal_year": int(dt.year),
        "cal_month": int(dt.month),
        "cal_woy": int(woy),
        "cal_woy_sin": float(cal_woy_sin),
        "cal_woy_cos": float(cal_woy_cos),
        "cal_is_ramadan": int(is_ramadan),
        "cal_is_eid_fitr": int(is_eid_fitr),
        "cal_is_eid_adha": int(is_eid_adha),
    }


def load_models(ensemble_dir: Path):
    meta_path = ensemble_dir / "meta_ridge.joblib"
    base_lgb = ensemble_dir / "base_lgbm.joblib"
    base_rf = ensemble_dir / "base_rf.joblib"
    models = {}
    if meta_path.exists():
        models["meta"] = joblib.load(meta_path)
    if base_lgb.exists():
        models["lgbm"] = joblib.load(base_lgb)
    if base_rf.exists():
        models["rf"] = joblib.load(base_rf)
    return models


def predict_rows(models: dict, X: pd.DataFrame) -> dict:
    preds = {}
    # base preds
    for name in ("lgbm", "rf"):
        if name in models:
            try:
                preds[name] = models[name].predict(X)
            except Exception:
                preds[name] = np.full(len(X), np.nan)
    # stacking
    if "meta" in models and all(k in preds for k in ("lgbm", "rf")):
        meta_X = pd.DataFrame({k: preds[k] for k in preds})
        preds["stack"] = models["meta"].predict(meta_X)
    else:
        # mean ensemble fallback
        arrs = [v for v in preds.values() if v is not None]
        if arrs:
            preds["mean"] = np.nanmean(np.vstack(arrs), axis=0)
    return preds


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", default="ml/training/data/features.parquet")
    ap.add_argument("--ensemble", default="ml/training/ensemble_models")
    ap.add_argument("--horizon", type=int, default=4, help="weeks ahead to forecast")
    ap.add_argument("--collection", default="priceforecasts")
    args = ap.parse_args(argv)

    features_path = Path(args.features)
    ensemble_dir = Path(args.ensemble)
    if not features_path.exists():
        raise FileNotFoundError(features_path)

    df = pd.read_parquet(features_path)
    if "date" not in df.columns:
        raise ValueError("features must include a 'date' column")
    df["date"] = pd.to_datetime(df["date"])

    # get last row per group
    group_cols = ["commodity", "variety", "city", "priceType"]
    groups = df.groupby(group_cols, dropna=False)
    last_rows = groups.tail(1).reset_index(drop=True)

    models = load_models(ensemble_dir)

    forecasts = []
    now = datetime.utcnow()
    for h in range(1, args.horizon + 1):
        future_date = last_rows["date"] + pd.Timedelta(weeks=h)
        X_future = last_rows.copy()
        X_future["date"] = future_date.values
        # add simple calendar fields
        calcols = X_future["date"].apply(cal_fields_for_date).apply(pd.Series)
        for c in calcols.columns:
            X_future[c] = calcols[c].values

        # drop non-feature columns for model input
        # assume models were trained on the full feature set minus target
        # here we keep all columns except price and any indexing columns
        drop_cols = ["price", "target"]
        input_X = X_future.drop(columns=[c for c in drop_cols if c in X_future.columns])

        preds = predict_rows(models, input_X)

        for i, row in X_future.iterrows():
            base = {
                "commodity": row.get("commodity"),
                "variety": row.get("variety"),
                "city": row.get("city"),
                "priceType": row.get("priceType"),
                "forecast_date": pd.Timestamp(row.get("date")).to_pydatetime(),
                "generated_at": now,
            }
            for k, arr in preds.items():
                val = float(arr[i]) if (k in preds and len(preds[k]) > i) else None
                doc = dict(base)
                doc.update({"horizon_weeks": int(h), "model": k, "predicted_price": val})
                forecasts.append(doc)

    # push to MongoDB
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise EnvironmentError("Set MONGODB_URI environment variable to push forecasts")

    client = MongoClient(mongo_uri)
    # derive a database from URI if present, else fallback to a sensible default
    from urllib.parse import urlparse
    parsed = urlparse(mongo_uri)
    if parsed.path and parsed.path != "/":
        dbname = parsed.path.lstrip("/")
        db = client.get_database(dbname)
    else:
        try:
            db = client.get_default_database()
        except Exception:
            db = client.get_database("farmkonnect_ml")
    coll = db[args.collection]
    if forecasts:
        # upsert by unique key (commodity,variety,city,forecast_date,horizon_weeks,model)
        for doc in forecasts:
            key = {
                "commodity": doc["commodity"],
                "variety": doc.get("variety"),
                "city": doc.get("city"),
                "forecast_date": doc["forecast_date"],
                "horizon_weeks": doc["horizon_weeks"],
                "model": doc["model"],
            }
            coll.update_one(key, {"$set": doc}, upsert=True)

            logger.info("Wrote %d forecast documents to %s.%s", len(forecasts), db.name, args.collection)
            if METRICS_ENABLED:
                try:
                    FORECASTS_WRITTEN.inc(len(forecasts))
                except Exception:
                    pass
        else:
            logger.info("No forecasts to write")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
