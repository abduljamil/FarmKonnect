"""Worker that polls `ml_jobs` collection and runs retrain jobs.

Behavior:
- Polls MongoDB for jobs with `type: 'retrain'` and `status: 'pending'`.
- Atomically marks a job as `running` and executes `train_models.py` in a subprocess.
- Writes run logs into `ml_job_runs` and updates the job document with final status.

Usage: set `MONGODB_URI` env var and run:
  python retrain_worker.py
"""
from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

from pymongo import MongoClient, ReturnDocument
from logging_config import get_logger, start_metrics

logger = get_logger("retrain_worker")
start_metrics()

try:
    from prometheus_client import Counter
    METRICS_ENABLED = True
except Exception:
    METRICS_ENABLED = False

if METRICS_ENABLED:
    JOBS_CLAIMED = Counter("fk_retrain_jobs_claimed_total", "Retrain jobs claimed by worker")
    JOBS_SUCCEEDED = Counter("fk_retrain_jobs_succeeded_total", "Retrain jobs completed successfully")
    JOBS_FAILED = Counter("fk_retrain_jobs_failed_total", "Retrain jobs failed")


POLL_INTERVAL = int(os.environ.get("RETRAIN_POLL_INTERVAL", "30"))
WORK_DIR = Path(__file__).resolve().parent


def get_mongo():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise EnvironmentError("Set MONGODB_URI environment variable")
    client = MongoClient(uri)
    from urllib.parse import urlparse
    parsed = urlparse(uri)
    if parsed.path and parsed.path != "/":
        dbname = parsed.path.lstrip("/")
        return client.get_database(dbname)
    try:
        return client.get_default_database()
    except Exception:
        return client.get_database("farmkonnect_ml")


def claim_job(coll):
    now = datetime.utcnow()
    worker_id = f"{socket.gethostname()}:{os.getpid()}"
    job = coll.find_one_and_update(
        {"type": "retrain", "status": "pending"},
        {
            "$set": {
                "status": "running",
                "worker": worker_id,
                "started_at": now,
            }
        },
        return_document=ReturnDocument.BEFORE,
    )
    return job


def run_training(job):
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    out_dir = WORK_DIR / "models" / f"retrain_{timestamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    cmd = [sys.executable, str(WORK_DIR / "train_models.py"), "--features", str(WORK_DIR / "data" / "features.parquet"), "--output-dir", str(out_dir)]

    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode, proc.stdout, proc.stderr, str(out_dir)


def main():
    db = get_mongo()
    jobs_coll = db.get_collection("ml_jobs")
    runs_coll = db.get_collection("ml_job_runs")

    logger.info("Retrain worker started. Polling for jobs...")
    while True:
        try:
            job = claim_job(jobs_coll)
            if not job:
                time.sleep(POLL_INTERVAL)
                continue

            logger.info("Claimed job id=%s", job.get("_id"))
            if METRICS_ENABLED:
                try:
                    JOBS_CLAIMED.inc()
                except Exception:
                    pass
            job_id = job.get("_id")
            rc, out, err, model_dir = run_training(job)

            run_doc = {
                "job_id": job_id,
                "started_at": job.get("started_at"),
                "finished_at": datetime.utcnow(),
                "exit_code": int(rc),
                "stdout": out[:100000],
                "stderr": err[:100000],
                "model_dir": model_dir,
            }
            runs_coll.insert_one(run_doc)

            if rc == 0:
                jobs_coll.update_one({"_id": job_id}, {"$set": {"status": "completed", "finished_at": datetime.utcnow(), "model_dir": model_dir}})
                logger.info("Job %s completed successfully.", job_id)
                if METRICS_ENABLED:
                    try:
                        JOBS_SUCCEEDED.inc()
                    except Exception:
                        pass
            else:
                jobs_coll.update_one({"_id": job_id}, {"$set": {"status": "failed", "finished_at": datetime.utcnow(), "error": err[:2000]}})
                logger.error("Job %s failed (exit %s).", job_id, rc)
                if METRICS_ENABLED:
                    try:
                        JOBS_FAILED.inc()
                    except Exception:
                        pass

        except Exception as e:
            logger.exception("Worker error: %s", e)
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
