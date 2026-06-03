"""Phase 8 — scheduler loop (container entrypoint).

Ticks every RUN_INTERVAL_SECONDS (default 3600). On each tick:

  1. If `pricepredictions` is empty           -> run a one-shot backfill (last
                                                  12 weeks of history + current).
  2. Else if today is Saturday or later in
     the week, AND no doc with anchor_date
     >= the most recent Friday yet           -> run a live cycle.
  3. Otherwise                                -> sleep.

We anchor the marker on `anchor_date` (the Friday of the latest panel week)
rather than `generated_at`, so that container restarts don't double-run and
missed Fridays self-heal on the next tick (catch-up).

We deliberately wait until Saturday (UTC) before running for week-ending-Friday
so the scraper has had time to ingest the full Friday's prices into Atlas
before the panel is rebuilt. EARLIEST_RUN_DAY_OFFSET=1 enforces this; set to 0
to allow same-day Friday runs (not recommended).
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from datetime import date, datetime, timedelta, timezone

from pymongo import MongoClient

INTERVAL_SECONDS = int(os.environ.get("RUN_INTERVAL_SECONDS", "3600"))
EARLIEST_RUN_DAY_OFFSET = int(os.environ.get("EARLIEST_RUN_DAY_OFFSET", "1"))  # 1 = Saturday or later
BACKFILL_WEEKS = int(os.environ.get("BACKFILL_WEEKS", "12"))
MONITOR_WINDOW_WEEKS = int(os.environ.get("MONITOR_WINDOW_WEEKS", "4"))
MONITOR_ALARM_MULTIPLIER = float(os.environ.get("MONITOR_ALARM_MULTIPLIER", "1.5"))

DB_NAME = os.environ.get("MONGODB_DB", "FarmKonnect")
COLLECTION = os.environ.get("PREDICTION_COLLECTION", "pricepredictions")

PREDICT_SCRIPT = "/app/prediction_service/predict_and_upsert.py"
MONITOR_SCRIPT = "/app/prediction_service/monitor.py"


def log(stage: str, msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] [{stage}] {msg}", flush=True)


def most_recent_friday(today: date) -> date:
    # Mon=0 .. Fri=4 .. Sun=6
    days_back = (today.weekday() - 4) % 7
    return today - timedelta(days=days_back)


def _invoke(script: str, args: list[str]) -> int:
    cmd = [sys.executable, script, *args]
    log("invoke", " ".join(cmd))
    # Stream child stdout/stderr straight to our stdout so `docker logs` shows everything
    proc = subprocess.run(cmd, check=False)
    log("invoke", f"exit={proc.returncode}")
    return proc.returncode


def run_monitor() -> None:
    """Run the Phase 12 rolling-MAPE monitor. Cheap (no LGBM inference) so safe
    to call every tick — it just reads `pricepredictions` + the cached panel.
    Only does meaningful work once `/work/data/panel.parquet` exists (i.e.,
    after the first predict cycle of the container's lifetime).
    """
    rc = _invoke(MONITOR_SCRIPT, [
        "--window-weeks", str(MONITOR_WINDOW_WEEKS),
        "--alarm-multiplier", str(MONITOR_ALARM_MULTIPLIER),
    ])
    if rc != 0:
        log("monitor", f"exited rc={rc} (often just 'panel.parquet not built yet' — safe to ignore on cold start)")


def tick(mongo_uri: str) -> None:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10_000)
    coll = client[DB_NAME][COLLECTION]

    if coll.estimated_document_count() == 0:
        log("tick", f"{DB_NAME}.{COLLECTION} is empty — running backfill ({BACKFILL_WEEKS} weeks)")
        _invoke(PREDICT_SCRIPT, ["--mode", "backfill", "--backfill-weeks", str(BACKFILL_WEEKS)])
        # First predict cycle just built /work/data/panel.parquet — run the
        # monitor too so we don't wait an extra week for the first stats.
        run_monitor()
        return

    now = datetime.now(timezone.utc)
    today = now.date()
    last_fri = most_recent_friday(today)
    days_since_fri = (today - last_fri).days  # 0 on Fri, 1 on Sat, ... , 6 on Thu

    cutoff_utc = datetime.combine(last_fri, datetime.min.time(), tzinfo=timezone.utc)
    have_this_week = coll.count_documents({"anchor_date": {"$gte": cutoff_utc}}, limit=1) > 0

    if days_since_fri < EARLIEST_RUN_DAY_OFFSET:
        log("tick", f"today={today} is only {days_since_fri}d past Fri {last_fri}; "
                    f"waiting for offset>={EARLIEST_RUN_DAY_OFFSET}")
        # Still run monitor — it's independent of the predict cadence and
        # benefits from being checked more often than weekly.
        run_monitor()
        return

    if have_this_week:
        log("tick", f"predictions for week ending Fri {last_fri} already present; running monitor only")
        run_monitor()
        return

    log("tick", f"running live cycle for week ending Fri {last_fri}")
    _invoke(PREDICT_SCRIPT, ["--mode", "live"])
    run_monitor()


def main() -> int:
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        log("main", "MONGODB_URI not set; aborting")
        return 2

    log("main", f"starting scheduler interval={INTERVAL_SECONDS}s "
                f"offset={EARLIEST_RUN_DAY_OFFSET}d backfill_weeks={BACKFILL_WEEKS}")

    while True:
        try:
            tick(mongo_uri)
        except Exception as exc:  # noqa: BLE001 — top-level keep-alive
            log("main", f"tick raised {type(exc).__name__}: {exc}")
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
