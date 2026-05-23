"""
One-time migration: normalize `commodityprices` to a single canonical unit per
commodity, and flag implausible-price outliers (non-destructive).

Canonical unit:
  - Sugar           -> "Rs/Kg"
  - everything else -> "Rs/40Kg (Maund)"   (wheat, rice/paddy variants, maize, cotton)

The live scraper already writes these canonical units; this pass fixes the
historical backfill, which was stored as "Rs/100Kg".

Conversions (source unit -> canonical), via a per-kg pivot:
  Rs/Kg = price/1 ;  Rs/100Kg = price/100 ;  Rs/40Kg (Maund) = price/40
  then x1 (Rs/Kg) or x40 (Rs/40Kg) to reach the target.

Outliers: after conversion, a doc is flagged { excluded: true } when its price
is <= 0 or outside [LOW x median, HIGH x median] for its commodity. We FLAG (not
delete) -- it is reversible, and the read endpoints skip excluded docs.

Idempotent: already-canonical docs convert to themselves (no-op) and flags are
recomputed, so re-running changes nothing.

Usage (reads MONGODB_URI from env -- never hard-code it):
    python backend/scripts/normalizeUnits.py            # DRY RUN (no writes)
    python backend/scripts/normalizeUnits.py --force    # apply
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from collections import defaultdict
from statistics import median

try:
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import (
        BulkWriteError, AutoReconnect, NetworkTimeout,
        ServerSelectionTimeoutError, ConnectionFailure,
    )
except ImportError:
    print("Install deps:  pip install pymongo")
    sys.exit(1)

SUGAR_UNIT = "Rs/Kg"
GRAIN_UNIT = "Rs/40Kg (Maund)"
PER_KG_COMMODITIES = {"Sugar"}

# Source unit -> price per single kg.
TO_PER_KG = {
    "Rs/Kg": 1.0 / 1.0,
    "Rs/100Kg": 1.0 / 100.0,
    "Rs/40Kg (Maund)": 1.0 / 40.0,
}
# Per-kg price -> canonical target unit.
FROM_PER_KG = {SUGAR_UNIT: 1.0, GRAIN_UNIT: 40.0}

OUTLIER_LOW = 0.1     # flag below 0.1x the commodity median
OUTLIER_HIGH = 10.0   # flag above 10x the commodity median
BATCH_SIZE = 500
SLEEP_BETWEEN_BATCHES_S = 0.20


def canonical_unit(commodity: str) -> str:
    return SUGAR_UNIT if commodity in PER_KG_COMMODITIES else GRAIN_UNIT


def convert(price, src_unit, target_unit):
    if src_unit not in TO_PER_KG:
        return None  # unknown unit -> caller skips
    per_kg = price * TO_PER_KG[src_unit]
    return round(per_kg * FROM_PER_KG[target_unit], 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="Apply changes (default: dry run).")
    ap.add_argument("--db", default="FarmKonnect")
    ap.add_argument("--collection", default="commodityprices")
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")
    if not uri:
        print("ERROR: MONGODB_URI not set in environment")
        sys.exit(2)

    client = MongoClient(uri, serverSelectionTimeoutMS=30000, retryWrites=True)
    coll = client[args.db][args.collection]

    print("Loading docs...")
    docs = list(coll.find({}, {"_id": 1, "commodity": 1, "price": 1, "unit": 1, "excluded": 1}))
    print(f"  {len(docs):,} docs loaded")

    # Pass 1: canonical price per doc + per-commodity price lists for medians.
    converted = {}
    by_commodity = defaultdict(list)
    unknown_units = defaultdict(int)
    for d in docs:
        price = d.get("price")
        if price is None:
            continue
        tgt = canonical_unit(d["commodity"])
        new_price = convert(price, d.get("unit"), tgt)
        if new_price is None:
            unknown_units[d.get("unit")] += 1
            continue
        converted[d["_id"]] = (new_price, tgt)
        if new_price > 0:
            by_commodity[d["commodity"]].append(new_price)

    medians = {c: median(v) for c, v in by_commodity.items() if v}

    # Pass 2: build update ops (price + unit + excluded flag).
    ops = []
    n_convert = 0
    n_flag = 0
    per_com_flag = defaultdict(int)
    per_com_total = defaultdict(int)
    samples = []
    for d in docs:
        _id = d["_id"]
        if _id not in converted:
            continue
        com = d["commodity"]
        src = d.get("unit")
        price = d.get("price")
        new_price, tgt = converted[_id]
        per_com_total[com] += 1

        med = medians.get(com)
        excluded = (new_price <= 0) or (
            med is not None and (new_price < OUTLIER_LOW * med or new_price > OUTLIER_HIGH * med)
        )

        unit_change = (src != tgt) or (abs((price or 0) - new_price) > 0.001)
        flag_change = bool(d.get("excluded", False)) != bool(excluded)
        if not unit_change and not flag_change:
            continue

        if unit_change:
            n_convert += 1
        if excluded:
            n_flag += 1
            per_com_flag[com] += 1
        if len(samples) < 14 and (unit_change or excluded):
            samples.append((com, src, price, tgt, new_price, excluded))

        ops.append(UpdateOne(
            {"_id": _id},
            {"$set": {"price": new_price, "unit": tgt, "excluded": bool(excluded)}},
        ))

    print()
    print("=" * 64)
    print("PLAN " + ("(DRY RUN -- no writes)" if not args.force else "(APPLYING)"))
    print("=" * 64)
    print(f"  docs needing price/unit conversion : {n_convert:,}")
    print(f"  docs flagged as outliers           : {n_flag:,}")
    if unknown_units:
        print(f"  WARNING unknown units skipped      : {dict(unknown_units)}")
    print("  outliers per commodity (flagged / total, median):")
    for c in sorted(per_com_total):
        print(f"    {c:30s} {per_com_flag[c]:5d} / {per_com_total[c]:6d}   median={round(medians.get(c, 0), 2)}")
    print("  samples  [commodity | src price -> unit price | excluded]:")
    for com, src, price, tgt, np, ex in samples:
        print(f"    {com:24s} {src} {price}  ->  {tgt} {np}   excluded={ex}")
    print(f"  total bulk ops: {len(ops):,}")

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
                    print(f"  FATAL: transient error after retries: {e}")
                    raise
                time.sleep(min(2 ** attempt, 30))
        applied += len(chunk)
        if applied % (BATCH_SIZE * 20) == 0:
            print(f"    {applied:,}/{len(ops):,}")
        time.sleep(SLEEP_BETWEEN_BATCHES_S)

    after = coll.count_documents({})
    excluded_now = coll.count_documents({"excluded": True})
    print(f"DONE. applied {len(ops):,} updates. collection={after:,}, flagged excluded={excluded_now:,}")


if __name__ == "__main__":
    main()
