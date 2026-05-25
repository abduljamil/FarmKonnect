"""
One-time migration: unify rice/paddy to the live-scraper convention
(commodity + variety) so historical + live data form continuous series.

The historical ingest stored each variant as its own commodity (variety=null);
the live scraper writes commodity="Rice" + a short variety. This aligns history
to the scraper (no scraper change needed).

  "Rice (IRRI)"             -> Rice  / IRRI
  "Rice Basmati (385)"      -> Rice  / Basmati 385
  "Rice Basmati Super (New)"-> Rice  / Basmati Super New
  "Rice Basmati Super (Old)"-> Rice  / Basmati Super Old
  "Rice Kainat (New)"       -> Rice  / Kainat New
  "Paddy (IRRI)"            -> Paddy / IRRI
  "Paddy Basmati"           -> Paddy / Basmati
  "Paddy Kainat"            -> Paddy / Kainat

Collision: renaming changes the unique key {commodity,variety,city,date,priceType}.
Where a renamed Rice doc would collide with an existing live "Rice" doc, keep the
live doc and flag the historical one excluded:true (superseded) -- non-destructive.

Idempotent. Dry-run by default; --force to apply.

Usage (MONGODB_URI from env):
    python restructureRice.py            # DRY RUN
    python restructureRice.py --force    # apply
"""

from __future__ import annotations
import argparse
import os
import sys
import time
from collections import defaultdict

try:
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import (
        BulkWriteError, AutoReconnect, NetworkTimeout,
        ServerSelectionTimeoutError, ConnectionFailure,
    )
except ImportError:
    print("Install deps:  pip install pymongo")
    sys.exit(1)

RICE_MAP = {
    "Rice (IRRI)":              ("Rice", "IRRI"),
    "Rice Basmati (385)":       ("Rice", "Basmati 385"),
    "Rice Basmati Super (New)": ("Rice", "Basmati Super New"),
    "Rice Basmati Super (Old)": ("Rice", "Basmati Super Old"),
    "Rice Kainat (New)":        ("Rice", "Kainat New"),
    "Paddy (IRRI)":             ("Paddy", "IRRI"),
    "Paddy Basmati":            ("Paddy", "Basmati"),
    "Paddy Kainat":             ("Paddy", "Kainat"),
}
BATCH_SIZE = 500
SLEEP_BETWEEN_BATCHES_S = 0.20


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--db", default="FarmKonnect")
    ap.add_argument("--collection", default="commodityprices")
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")
    if not uri:
        print("ERROR: MONGODB_URI not set")
        sys.exit(2)

    client = MongoClient(uri, serverSelectionTimeoutMS=30000, retryWrites=True)
    coll = client[args.db][args.collection]

    # Existing live "Rice" keys (the scraper's canonical form) for collision check.
    print("Loading live Rice keys...")
    live_keys = set()
    for d in coll.find({"commodity": "Rice"}, {"variety": 1, "city": 1, "date": 1, "priceType": 1}):
        live_keys.add((d.get("variety"), d.get("city"), d.get("date"), d.get("priceType")))
    print(f"  {len(live_keys):,} live Rice keys")

    docs = list(coll.find(
        {"commodity": {"$in": list(RICE_MAP.keys())}},
        {"commodity": 1, "variety": 1, "city": 1, "date": 1, "priceType": 1},
    ))
    print(f"  {len(docs):,} historical rice/paddy docs to migrate")

    ops = []
    n_rename = 0
    n_collide = 0
    per = defaultdict(lambda: [0, 0])  # src -> [rename, collide]
    for d in docs:
        src = d["commodity"]
        tgt_c, tgt_v = RICE_MAP[src]
        if tgt_c == "Rice":
            key = (tgt_v, d.get("city"), d.get("date"), d.get("priceType"))
            if key in live_keys:
                ops.append(UpdateOne({"_id": d["_id"]},
                                     {"$set": {"excluded": True, "supersededBy": "live"}}))
                n_collide += 1
                per[src][1] += 1
                continue
        ops.append(UpdateOne({"_id": d["_id"]},
                             {"$set": {"commodity": tgt_c, "variety": tgt_v}}))
        n_rename += 1
        per[src][0] += 1

    print()
    print("=" * 64)
    print("PLAN " + ("(DRY RUN -- no writes)" if not args.force else "(APPLYING)"))
    print("=" * 64)
    for src in sorted(per):
        tgt = RICE_MAP[src]
        print(f"  {src:28s} rename={per[src][0]:6d}  collide-flag={per[src][1]:5d}   -> {tgt[0]}/{tgt[1]}")
    print(f"  TOTAL rename={n_rename:,}  collide-flag={n_collide:,}  ops={len(ops):,}")

    if not args.force:
        print("\nDRY RUN complete. Re-run with --force to apply.")
        return

    print("\nApplying...")
    applied = 0
    for i in range(0, len(ops), BATCH_SIZE):
        chunk = ops[i:i + BATCH_SIZE]
        attempt = 0
        while True:
            try:
                coll.bulk_write(chunk, ordered=False)
                break
            except BulkWriteError as e:
                print("  writeErr:", str(e)[:200])
                break
            except (AutoReconnect, NetworkTimeout, ServerSelectionTimeoutError, ConnectionFailure) as e:
                attempt += 1
                if attempt > 6:
                    print(f"  FATAL: {e}")
                    raise
                time.sleep(min(2 ** attempt, 30))
        applied += len(chunk)
        if applied % (BATCH_SIZE * 20) == 0:
            print(f"    {applied:,}/{len(ops):,}")
        time.sleep(SLEEP_BETWEEN_BATCHES_S)

    print(f"DONE. {len(ops):,} ops applied.")
    print("  commodity=Rice docs now:", coll.count_documents({"commodity": "Rice", "excluded": {"$ne": True}}))
    print("  Rice varieties:", coll.distinct("variety", {"commodity": "Rice"}))
    print("  Paddy varieties:", coll.distinct("variety", {"commodity": "Paddy"}))


if __name__ == "__main__":
    main()
