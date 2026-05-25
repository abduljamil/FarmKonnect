"""
Robust outlier flagging (non-destructive). For each (commodity, variety, city)
series, compare every price to a centered rolling local median using a rolling
MAD z-score. This is trend-aware (a 17-year price rise is fine) and adapts to
each series' own volatility (cotton can swing without being flagged, while an
isolated spike in normally-stable wheat is caught).

Flags excluded:true, outlier:true (non-destructive, reversible). Read endpoints
already skip excluded docs. Does not touch already-excluded docs.

Idempotent. Dry-run by default; --force to apply.

Usage (MONGODB_URI from env):
    python cleanOutliers.py            # DRY RUN
    python cleanOutliers.py --force    # apply
"""

from __future__ import annotations
import argparse
import os
import sys
import time

try:
    import pandas as pd
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import (
        BulkWriteError, AutoReconnect, NetworkTimeout,
        ServerSelectionTimeoutError, ConnectionFailure,
    )
except ImportError:
    print("Install deps:  pip install pandas pymongo")
    sys.exit(1)

WINDOW = 9          # centered rolling window (points)
K = 5.0             # robust z-score threshold
MIN_PTS = 10        # series shorter than this are left alone
REL_MIN = 0.40      # also require >40% gap from the local median (avoids
                    # flagging modest real moves in low-volatility series)
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

    print("Loading active docs...")
    cur = coll.find(
        {"excluded": {"$ne": True}, "date": {"$type": "date"}},
        {"_id": 1, "commodity": 1, "variety": 1, "city": 1, "date": 1, "price": 1},
    )
    df = pd.DataFrame(list(cur))
    print(f"  {len(df):,} active docs")
    if df.empty:
        return

    df["variety"] = df["variety"].fillna("")
    df = df.sort_values(["commodity", "variety", "city", "date"]).reset_index(drop=True)
    keys = ["commodity", "variety", "city"]

    roll_med = df.groupby(keys, sort=False)["price"].transform(
        lambda s: s.rolling(WINDOW, center=True, min_periods=3).median())
    df["_dev"] = (df["price"] - roll_med).abs()
    roll_mad = df.groupby(keys, sort=False)["_dev"].transform(
        lambda s: s.rolling(WINDOW, center=True, min_periods=3).median())
    sigma = 1.4826 * roll_mad
    n = df.groupby(keys, sort=False)["price"].transform("size")

    z = df["_dev"] / sigma.replace(0, pd.NA)
    rel = df["_dev"] / roll_med.replace(0, pd.NA)
    # Require BOTH a statistically extreme deviation (z>K, or a flat local series)
    # AND a large relative gap (>REL_MIN of the local median), so modest real
    # moves in stable series are not mistaken for outliers.
    flag = (df["price"] <= 0) | (
        (n >= MIN_PTS) & (rel > REL_MIN) & ((z > K) | (sigma == 0))
    )
    flag = flag.fillna(False)

    hits = df[flag]
    print()
    print("=" * 60)
    print("PLAN " + ("(DRY RUN -- no writes)" if not args.force else "(APPLYING)"))
    print("=" * 60)
    print(f"  new outliers to flag: {len(hits):,} / {len(df):,} active")
    print("  by commodity:")
    for c, cnt in hits.groupby("commodity").size().sort_values(ascending=False).items():
        print(f"    {c:28s} {cnt}")
    print("  samples:")
    for _, r in hits.head(14).iterrows():
        print(f"    {r['commodity']}/{r['variety'] or '-'}/{r['city']}  {str(r['date'])[:10]}  price={r['price']}")

    if not args.force:
        print("\nDRY RUN complete. Re-run with --force to apply.")
        return

    ops = [UpdateOne({"_id": r["_id"]}, {"$set": {"excluded": True, "outlier": True}})
           for _, r in hits.iterrows()]
    print(f"\nApplying {len(ops):,} flags...")
    applied = 0
    for i in range(0, len(ops), BATCH_SIZE):
        chunk = ops[i:i + BATCH_SIZE]
        attempt = 0
        while True:
            try:
                coll.bulk_write(chunk, ordered=False)
                break
            except BulkWriteError as e:
                print("  writeErr:", str(e)[:200]); break
            except (AutoReconnect, NetworkTimeout, ServerSelectionTimeoutError, ConnectionFailure) as e:
                attempt += 1
                if attempt > 6:
                    print(f"  FATAL: {e}"); raise
                time.sleep(min(2 ** attempt, 30))
        applied += len(chunk)
        time.sleep(SLEEP_BETWEEN_BATCHES_S)
    print(f"DONE. flagged {len(ops):,}. total excluded now: {coll.count_documents({'excluded': True}):,}")


if __name__ == "__main__":
    main()
