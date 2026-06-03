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

DB_NAME = os.environ.get("MONGODB_DB", "FarmKonnect")
COLLECTION = os.environ.get("PREDICTION_COLLECTION", "pricepredictions")

PREDICT_SCRIPT = "/app/prediction_service/predict_and_upsert.py"


def log(stage: str, msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] [{stage}] {msg}", flush=True)


def most_recent_friday(today: date) -> date:
    # Mon=0 .. Fri=4 .. Sun=6
    days_back = (today.weekday() - 4) % 7
    return today - timedelta(days=days_back)


def _invoke(args: list[str]) -> int:
    cmd = [sys.executable, PREDICT_SCRIPT, *args]
    log("invoke", " ".join(cmd))
    # Stream child stdout/stderr straight to our stdout so `docker logs` shows everything
    proc = subprocess.run(cmd, check=False)
    log("invoke", f"exit={proc.returncode}")
    return proc.returncode


def tick(mongo_uri: str) -> None:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10_000)
    coll = client[DB_NAME][COLLECTION]

    if coll.estimated_document_count() == 0:
        log("tick", f"{DB_NAME}.{COLLECTION} is empty — running backfill ({BACKFILL_WEEKS} weeks)")
        _invoke(["--mode", "backfill", "--backfill-weeks", str(BACKFILL_WEEKS)])
        return

    now = datetime.now(timezone.utc)
    today = now.date()
    last_fri = most_recent_friday(today)
    days_since_fri = (today - last_fri).days  # 0 on Fri, 1 on Sat, ... , 6 on Thu

    if days_since_fri < EARLIEST_RUN_DAY_OFFSET:
        log("tick", f"today={today} is only {days_since_fri}d past Fri {last_fri}; "
                    f"waiting for offset>={EARLIEST_RUN_DAY_OFFSET}")
        return

    cutoff_utc = datetime.combine(last_fri, datetime.min.time(), tzinfo=timezone.utc)
    have_this_week = coll.count_documents({"anchor_date": {"$gte": cutoff_utc}}, limit=1) > 0
    if have_this_week:
        log("tick", f"predictions for week ending Fri {last_fri} already present; sleeping")
        return

    log("tick", f"running live cycle for week ending Fri {last_fri}")
    _invoke(["--mode", "live"])


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
