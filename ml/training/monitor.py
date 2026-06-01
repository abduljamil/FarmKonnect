"""Monitoring and drift detection for FarmKonnect ML forecasts.

Computes recent forecast accuracy, tests distributional drift of recent actual
prices vs historical using KS test, writes a monitoring document to MongoDB and
enqueues a retrain job when thresholds are exceeded.

Usage:
  MONGODB_URI="..." python monitor.py --features ml/training/data/features.parquet
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta
from pathlib import Path
import math

import numpy as np
import pandas as pd
from pymongo import MongoClient
from scipy.stats import ks_2samp


def choose_model_preference(models: list[str]) -> str:
    for pref in ("stack", "mean", "lgbm", "rf"):
        if pref in models:
            return pref
    return models[0] if models else None


def compute_errors(actuals: pd.Series, preds: pd.Series) -> dict:
    mask = ~actuals.isna() & ~preds.isna()
    if mask.sum() == 0:
        return {"mae": None, "rmse": None, "mape": None, "n": 0}
    a = actuals[mask].astype(float)
    p = preds[mask].astype(float)
    mae = float((a - p).abs().mean())
    rmse = float(((a - p) ** 2).mean() ** 0.5)
    nonzero = a != 0
    if nonzero.sum() > 0:
        mape = float(((a[nonzero] - p[nonzero]).abs() / a[nonzero]).mean() * 100)
    else:
        mape = None
    return {"mae": mae, "rmse": rmse, "mape": mape, "n": int(mask.sum())}


def main(argv: list[str] | None = None) -> int:
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--features", default="ml/training/data/features.parquet")
    ap.add_argument("--lookback-days", type=int, default=28)
    ap.add_argument("--drift-p", type=float, default=0.01)
    ap.add_argument("--retrain-error-mae-rel", type=float, default=0.08, help="MAE relative to median price to trigger retrain")
    args = ap.parse_args(argv)

    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise EnvironmentError("Set MONGODB_URI environment variable")

    client = MongoClient(mongo_uri)
    # derive DB name from URI when possible, otherwise fall back to a default
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

    # collections
    coll_forecasts = db["priceforecasts"]
    coll_prices = db["commodityprices"]
    coll_monitor = db["ml_monitoring"]
    coll_jobs = db["ml_jobs"]

    # load recent forecasts (last lookback window)
    now = datetime.utcnow()
    since = now - timedelta(days=args.lookback_days)
    # forecasts with forecast_date in the lookback window
    cursor = coll_forecasts.find({"forecast_date": {"$gte": since}, "horizon_weeks": 1})
    forecasts = list(cursor)
    if len(forecasts) == 0:
        print("No recent forecasts found in DB for the lookback window.")
        return 0

    fdf = pd.DataFrame(forecasts)
    # prefer stacked predictions when available
    models_present = sorted(fdf["model"].unique().tolist())
    chosen_model = choose_model_preference(models_present)
    fdf = fdf[fdf["model"] == chosen_model]

    # fetch actual prices matching forecast_date
    # build list of keys to query
    keys = []
    for _, r in fdf.iterrows():
        keys.append({
            "commodity": r.get("commodity"),
            "variety": r.get("variety"),
            "city": r.get("city"),
            "date": r.get("forecast_date"),
        })

    # Query by date equality may require rounding; convert forecast_date to date-only
    fdf["forecast_date_day"] = pd.to_datetime(fdf["forecast_date"]).dt.floor("D")

    # Pull actual prices for the days in the lookback window
    dates = fdf["forecast_date_day"].dt.to_pydatetime().tolist()
    actual_cursor = coll_prices.find({"date": {"$in": dates}})
    actuals = list(actual_cursor)
    a_df = pd.DataFrame(actuals)
    if a_df.empty:
        print("No matching actual prices found for forecast dates.")

    # Merge forecasts with actuals on commodity,variety,city and date
    # normalize keys
    def key_row(df):
        return df[["commodity", "variety", "city"]].astype(object).fillna("")

    fdf_keys = fdf.copy()
    fdf_keys["date_day"] = fdf["forecast_date_day"].dt.to_pydatetime()
    if not a_df.empty:
        a_df["date_day"] = pd.to_datetime(a_df["date"]).dt.floor("D").dt.to_pydatetime()
        merged = fdf_keys.merge(a_df, left_on=["commodity", "variety", "city", "date_day"], right_on=["commodity", "variety", "city", "date_day"], how="left", suffixes=("_f", "_a"))
    else:
        merged = fdf_keys.copy()

    # compute global and per-group errors
    merged["predicted_price"] = pd.to_numeric(merged["predicted_price"], errors="coerce")
    merged["price"] = pd.to_numeric(merged.get("price"), errors="coerce")

    overall = compute_errors(merged["price"], merged["predicted_price"])

    group_cols = ["commodity", "city", "variety"]
    group_metrics = []
    drift_count = 0
    total_groups = 0

    for name, g in merged.groupby(group_cols):
        total_groups += 1
        a = g["price"].dropna()
        if a.empty:
            continue
        # historical distribution from DB: all prices for that group
        hist_cursor = coll_prices.find({"commodity": name[0], "city": name[1], "variety": name[2]}, {"price": 1})
        hist = [d["price"] for d in hist_cursor if d.get("price") is not None]
        if len(hist) < 20 or len(a) < 5:
            # insufficient data for KS test
            ks_p = None
        else:
            try:
                ks_stat, ks_p = ks_2samp(hist, a)
            except Exception:
                ks_p = None

        errs = compute_errors(g["price"], g["predicted_price"]) if not g.empty else {"mae": None}
        median_price = float(np.median(hist)) if len(hist) > 0 else float(np.nan)
        retrain_flag = False
        if ks_p is not None and ks_p < args.drift_p:
            drift_flag = True
            drift_count += 1
        else:
            drift_flag = False

        if errs.get("mae") is not None and not math.isnan(median_price) and median_price > 0:
            if errs["mae"] / median_price > args.retrain_error_mae_rel:
                retrain_flag = True

        group_metrics.append({
            "commodity": name[0],
            "city": name[1],
            "variety": name[2],
            "n_forecasts": int(errs.get("n", 0)),
            "mae": errs.get("mae"),
            "rmse": errs.get("rmse"),
            "mape": errs.get("mape"),
            "ks_p": ks_p,
            "drift": drift_flag,
            "retrain_suggested": retrain_flag,
        })

    overall_retrain = False
    # trigger retrain if many groups drifted or average MAE relative is large
    if total_groups > 0 and drift_count / total_groups > 0.25:
        overall_retrain = True
    # trigger if any individual group suggested retrain
    if any(g.get("retrain_suggested") for g in group_metrics):
        overall_retrain = True
    # or if overall MAE relative to median of all prices > threshold
    all_hist_prices = [d.get("price") for d in coll_prices.find({}, {"price": 1}) if d.get("price") is not None]
    overall_median = float(np.median(all_hist_prices)) if len(all_hist_prices) > 0 else float('nan')
    if overall.get("mae") is not None and not math.isnan(overall_median) and overall_median > 0:
        if overall["mae"] / overall_median > args.retrain_error_mae_rel:
            overall_retrain = True

    # Additional heuristic: if median predicted deviates greatly from historical median
    try:
        pred_median = float(pd.to_numeric(fdf['predicted_price'], errors='coerce').median())
    except Exception:
        pred_median = float('nan')
    if not overall_retrain and not math.isnan(overall_median) and overall_median > 0 and not math.isnan(pred_median):
        if abs(pred_median - overall_median) / overall_median > args.retrain_error_mae_rel:
            overall_retrain = True

    report = {
        "generated_at": datetime.utcnow(),
        "lookback_days": args.lookback_days,
        "model_used": chosen_model,
        "overall": overall,
        "groups": group_metrics,
        "drift_count": drift_count,
        "total_groups": total_groups,
        "retrain_suggested": overall_retrain,
    }

    coll_monitor.insert_one(report)
    print("Wrote monitoring report to ml_monitoring")

    if overall_retrain:
        job = {"type": "retrain", "created_at": datetime.utcnow(), "reason": "drift_or_high_error"}
        coll_jobs.insert_one(job)
        print("Enqueued retrain job in ml_jobs collection")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
