"""Phase 12 — rolling-MAPE monitoring for routed forecasts.

For each (commodity, horizon_weeks) cell, compute the rolling MAPE over the
most recent `--window-weeks` weeks (default 4) by joining `pricepredictions`
docs that have a now-past `forecast_date` against the actual weekly panel
prices in `/work/data/panel.parquet` (regenerated each predict cycle).

Outputs:
- Writes one summary doc per (commodity, horizon_weeks, window) into the
  `prediction_monitoring` collection in Atlas. Keys
  (commodity, horizon_weeks, window_weeks, computed_at_week) so reruns within
  the same week overwrite via upsert.
- Logs WARN to stdout for any cell whose rolling MAPE exceeds
  `--alarm-multiplier × router_expected_mape` (default 1.5×). This is the
  "router cell is drifting; consider retraining" signal that Phase 12.B
  (monthly retrain) will eventually consume automatically.

Designed to run AFTER predict_and_upsert.py inside the same container — that
guarantees `/work/data/panel.parquet` is fresh. Run it standalone too:

    python monitor.py --window-weeks 4 --alarm-multiplier 1.5
"""
from __future__ import annotations

import argparse
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from pymongo import MongoClient, UpdateOne

WORK_DIR = Path(os.environ.get("WORK_DIR", "/work"))
DB_NAME = os.environ.get("MONGODB_DB", "FarmKonnect")
PRED_COLLECTION = os.environ.get("PREDICTION_COLLECTION", "pricepredictions")
MONITOR_COLLECTION = os.environ.get("MONITORING_COLLECTION", "prediction_monitoring")


def _log(stage: str, msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] [{stage}] {msg}", flush=True)


def _most_recent_friday(today: datetime) -> datetime:
    # Mon=0 … Fri=4 … Sun=6
    d = today.date()
    days_back = (d.weekday() - 4) % 7
    fri = d - timedelta(days=days_back)
    return datetime(fri.year, fri.month, fri.day, tzinfo=timezone.utc)


def _load_panel(panel_path: Path) -> pd.DataFrame:
    """Returns a panel keyed by (commodity, variety, city, date)."""
    df = pd.read_parquet(panel_path, columns=["commodity", "variety", "city", "date", "price"])
    # The panel writes variety="" for varietyless commodities; Atlas docs use
    # variety=null. Normalize both sides to None.
    df["variety"] = df["variety"].where(df["variety"].notna() & (df["variety"] != ""), None)
    df["date"] = pd.to_datetime(df["date"]).dt.tz_localize("UTC")
    return df


def _load_predictions(coll, since: datetime, today: datetime) -> pd.DataFrame:
    """All predictions whose forecast_date has already passed (so actuals exist)
    and is within the monitoring window."""
    cursor = coll.find(
        {"forecast_date": {"$gte": since, "$lt": today}},
        {
            "commodity": 1, "variety": 1, "city": 1, "horizon_weeks": 1,
            "anchor_date": 1, "anchor_price": 1, "forecast_date": 1,
            "predicted_price": 1, "model": 1, "expected_mape": 1,
            "_id": 0,
        },
    )
    rows = list(cursor)
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["forecast_date"] = pd.to_datetime(df["forecast_date"], utc=True)
    df["anchor_date"] = pd.to_datetime(df["anchor_date"], utc=True)
    return df


def compute_rolling_mape(
    preds: pd.DataFrame, panel: pd.DataFrame
) -> pd.DataFrame:
    """Per-row absolute pct error after joining predictions with actuals."""
    if preds.empty:
        return pd.DataFrame()
    # variety: panel uses None for varietyless; preds may have None or "" — already normalized
    merged = preds.merge(
        panel.rename(columns={"date": "forecast_date", "price": "actual_price"}),
        on=["commodity", "variety", "city", "forecast_date"],
        how="left",
    )
    matched = merged[merged["actual_price"].notna()].copy()
    if matched.empty:
        return matched
    matched["abs_pct_err"] = (
        (matched["predicted_price"] - matched["actual_price"]).abs()
        / matched["actual_price"]
    ) * 100
    return matched


def aggregate_by_cell(
    matched: pd.DataFrame, alarm_multiplier: float, today: datetime, window_weeks: int
) -> pd.DataFrame:
    if matched.empty:
        return pd.DataFrame()

    summary = matched.groupby(["commodity", "horizon_weeks"]).agg(
        n=("abs_pct_err", "size"),
        rolling_mape=("abs_pct_err", "mean"),
        worst_pct_err=("abs_pct_err", "max"),
        expected_mape=("expected_mape", "first"),
        model=("model", "first"),
    ).reset_index()

    summary["alarm_threshold"] = summary["expected_mape"].fillna(np.inf) * alarm_multiplier
    summary["drift_alarm"] = summary["rolling_mape"] > summary["alarm_threshold"]
    summary["window_weeks"] = window_weeks
    summary["computed_at"] = today.isoformat()
    summary["computed_at_week"] = _most_recent_friday(today).date().isoformat()
    return summary


def upsert_summary(summary: pd.DataFrame, mongo_uri: str) -> int:
    if summary.empty:
        _log("upsert", "no monitoring rows to write")
        return 0
    client = MongoClient(mongo_uri)
    coll = client[DB_NAME][MONITOR_COLLECTION]
    coll.create_index(
        [("commodity", 1), ("horizon_weeks", 1), ("window_weeks", 1), ("computed_at_week", 1)],
        unique=True,
        name="cell_window_week_unique",
    )

    ops = []
    for _, r in summary.iterrows():
        key = {
            "commodity": r["commodity"],
            "horizon_weeks": int(r["horizon_weeks"]),
            "window_weeks": int(r["window_weeks"]),
            "computed_at_week": r["computed_at_week"],
        }
        body = {
            **key,
            "n": int(r["n"]),
            "rolling_mape": float(r["rolling_mape"]),
            "worst_pct_err": float(r["worst_pct_err"]),
            "expected_mape": float(r["expected_mape"]) if pd.notna(r["expected_mape"]) else None,
            "alarm_threshold": float(r["alarm_threshold"]) if r["alarm_threshold"] != np.inf else None,
            "drift_alarm": bool(r["drift_alarm"]),
            "model": r["model"],
            "computed_at": r["computed_at"],
        }
        ops.append(UpdateOne(key, {"$set": body}, upsert=True))

    result = coll.bulk_write(ops, ordered=False)
    n = (result.upserted_count or 0) + (result.modified_count or 0)
    _log("upsert", f"wrote {n}/{len(ops)} monitoring rows to {DB_NAME}.{MONITOR_COLLECTION}")
    return n


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--window-weeks", type=int, default=4,
                    help="rolling window over which to compute MAPE per cell")
    ap.add_argument("--alarm-multiplier", type=float, default=1.5,
                    help="alarm if rolling_mape > expected_mape * multiplier")
    ap.add_argument("--panel", type=Path, default=WORK_DIR / "data" / "panel.parquet")
    args = ap.parse_args(argv)

    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        _log("main", "MONGODB_URI not set; aborting")
        return 2

    if not args.panel.exists():
        _log("main", f"missing {args.panel}; run predict_and_upsert.py first (it produces this file)")
        return 1

    today = datetime.now(timezone.utc)
    since = today - timedelta(weeks=args.window_weeks)
    _log("main", f"monitoring window: {since.date()} → {today.date()} ({args.window_weeks} wks)")

    client = MongoClient(mongo_uri)
    pred_coll = client[DB_NAME][PRED_COLLECTION]

    preds = _load_predictions(pred_coll, since, today)
    _log("load", f"loaded {len(preds)} predictions with past forecast_date in window")
    if preds.empty:
        _log("main", "no scoreable predictions — nothing to monitor yet")
        return 0

    panel = _load_panel(args.panel)
    _log("load", f"loaded {len(panel):,} panel rows from {args.panel}")

    matched = compute_rolling_mape(preds, panel)
    _log("match", f"matched {len(matched)}/{len(preds)} predictions to actual prices")

    summary = aggregate_by_cell(matched, args.alarm_multiplier, today, args.window_weeks)
    if summary.empty:
        _log("main", "no per-cell summaries produced (matched preds had NaN groups?)")
        return 0

    upsert_summary(summary, mongo_uri)

    # Report + alarm
    print()
    print("=== Rolling MAPE per (commodity, horizon) ===")
    cols = ["commodity", "horizon_weeks", "model", "n", "rolling_mape",
            "expected_mape", "alarm_threshold", "drift_alarm"]
    print(summary[cols].round(2).to_string(index=False))

    alarms = summary[summary["drift_alarm"]]
    if not alarms.empty:
        print()
        for _, r in alarms.iterrows():
            _log("ALARM",
                 f"{r['commodity']} h={r['horizon_weeks']} rolling MAPE "
                 f"{r['rolling_mape']:.2f}% > {r['alarm_threshold']:.2f}% "
                 f"(expected {r['expected_mape']:.2f}% × {args.alarm_multiplier})")
    else:
        _log("ok", "no drift alarms — all cells within threshold")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
