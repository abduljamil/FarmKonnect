"""
Phase 2 - Data foundation.  Build a clean WEEKLY price panel (Parquet) plus an
EDA report from the live `commodityprices` collection.

Scope: the 6 forecasting-target commodities only -
    Wheat, Rice, Paddy, Maize, Sugar, Seed Cotton (Phutti)
(Barley / Millet / Wheat Straw are present in the DB but out of modeling scope.)

Pipeline (per commodity.variety.city series):
  1. Pull canonical daily FQP prices  (excluded:{$ne:true}, date is a real Date).
  2. Collapse any same-day dupes (median), resample to weekly (Fri-anchored mean).
  3. Forward-fill gaps of <= --ffill-weeks weeks; longer gaps stay missing.
  4. Winsorize each series to its [q, 1-q] range (default 1st/99th pct) on top of
     the already-flagged gross outliers, recording what was clipped.
Outputs (under --out):
    data/panel.parquet          long: commodity,variety,city,unit,date,price,
                                 price_raw,n_obs,filled,winsorized
    eda/series_summary.csv       per-series coverage + price stats
    eda/coverage_by_year.csv     series x year present-week counts
    eda/gaps.csv                 gaps longer than --ffill-weeks
    eda/commodity_overview.csv   per-commodity rollup
    eda/EDA.md                   human-readable summary
    eda/coverage_heatmap.png     best-effort (skipped if matplotlib absent)

Read-only (never writes to Mongo).  MONGODB_URI from env.

Usage:
    python build_panel.py --out ./panelout
    python build_panel.py --out /out --freq W-FRI --ffill-weeks 4 --winsor 0.01
"""

from __future__ import annotations
import argparse
import os
import sys
import time

try:
    import numpy as np
    import pandas as pd
    from pymongo import MongoClient
    from pymongo.errors import (
        AutoReconnect, NetworkTimeout,
        ServerSelectionTimeoutError, ConnectionFailure,
    )
except ImportError:
    print("Install deps:  pip install pandas pyarrow numpy pymongo")
    sys.exit(1)

TARGETS = ["Wheat", "Rice", "Paddy", "Maize", "Sugar", "Seed Cotton (Phutti)"]
KEYS = ["commodity", "variety", "city"]
WINSOR_MIN_PTS = 20      # don't winsorize series shorter than this


def load_docs(coll, retries=6):
    flt = {
        "commodity": {"$in": TARGETS},
        "priceType": "FQP",
        "excluded": {"$ne": True},
        "date": {"$type": "date"},
    }
    proj = {"_id": 0, "commodity": 1, "variety": 1, "city": 1,
            "date": 1, "price": 1, "unit": 1}
    attempt = 0
    while True:
        try:
            return list(coll.find(flt, proj))
        except (AutoReconnect, NetworkTimeout,
                ServerSelectionTimeoutError, ConnectionFailure) as e:
            attempt += 1
            if attempt > retries:
                print(f"  FATAL load: {e}")
                raise
            time.sleep(min(2 ** attempt, 30))


def nan_runs(mask_bool_array):
    """Yield (start_idx, end_idx_inclusive, length) for runs of True."""
    runs = []
    n = len(mask_bool_array)
    i = 0
    while i < n:
        if mask_bool_array[i]:
            j = i
            while j + 1 < n and mask_bool_array[j + 1]:
                j += 1
            runs.append((i, j, j - i + 1))
            i = j + 1
        else:
            i += 1
    return runs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./panelout")
    ap.add_argument("--db", default="FarmKonnect")
    ap.add_argument("--collection", default="commodityprices")
    ap.add_argument("--freq", default="W-FRI", help="pandas resample rule")
    ap.add_argument("--ffill-weeks", type=int, default=4)
    ap.add_argument("--winsor", type=float, default=0.01,
                    help="tail fraction per side (0.01 => 1st/99th pct)")
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")
    if not uri:
        print("ERROR: MONGODB_URI not set")
        sys.exit(2)

    data_dir = os.path.join(args.out, "data")
    eda_dir = os.path.join(args.out, "eda")
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(eda_dir, exist_ok=True)

    client = MongoClient(uri, serverSelectionTimeoutMS=30000)
    coll = client[args.db][args.collection]

    print(f"Loading FQP docs for {len(TARGETS)} target commodities ...")
    docs = load_docs(coll)
    df = pd.DataFrame(docs)
    print(f"  pulled {len(df):,} daily docs")
    if df.empty:
        print("Nothing to do."); return

    df["variety"] = df["variety"].fillna("").astype(str)
    df["date"] = pd.to_datetime(df["date"])
    df = df.dropna(subset=["price"])
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df = df.dropna(subset=["price"])

    FFILL = args.ffill_weeks
    WQ = args.winsor

    panel_parts = []
    summary_rows = []
    gap_rows = []

    grouped = df.groupby(KEYS, sort=True)
    print(f"  {grouped.ngroups} series -> resampling weekly ({args.freq}), "
          f"ffill<= {FFILL}w, winsor {WQ:.0%}/{1-WQ:.0%}")

    for (commodity, variety, city), g in grouped:
        unit = g["unit"].mode().iat[0] if not g["unit"].mode().empty else ""
        s = g.set_index("date")["price"].sort_index()
        s = s.groupby(level=0).median()                       # same-day dupes

        wk_mean = s.resample(args.freq).mean()                # NaN on empty weeks
        wk_cnt = s.resample(args.freq).count()
        if wk_mean.dropna().empty:
            continue

        raw = wk_mean.copy()                                  # pre-fill / pre-winsor
        filled_mask = wk_mean.isna()
        wk_filled = wk_mean.ffill(limit=FFILL)

        vals = wk_filled.dropna()
        if len(vals) >= WINSOR_MIN_PTS:
            lo, hi = vals.quantile(WQ), vals.quantile(1 - WQ)
            wins = wk_filled.clip(lo, hi)
        else:
            lo = hi = np.nan
            wins = wk_filled
        winsor_mask = wk_filled.notna() & (wins != wk_filled)

        idx = wins.index
        out = pd.DataFrame({
            "commodity": commodity, "variety": variety, "city": city, "unit": unit,
            "date": idx,
            "price": wins.values,
            "price_raw": raw.reindex(idx).values,
            "n_obs": wk_cnt.reindex(idx).fillna(0).astype(int).values,
            "filled": (filled_mask.reindex(idx).fillna(False).values
                       & wins.notna().values),
            "winsorized": winsor_mask.reindex(idx).fillna(False).values,
        })
        out = out[out["price"].notna()].reset_index(drop=True)
        if out.empty:
            continue
        panel_parts.append(out)

        # gaps longer than the ffill horizon (within the observed span)
        for (a, b, length) in nan_runs(filled_mask.values):
            if length > FFILL:
                gap_rows.append({
                    "commodity": commodity, "variety": variety, "city": city,
                    "gap_start": raw.index[a].date(),
                    "gap_end": raw.index[b].date(),
                    "gap_weeks": int(length),
                })

        span_weeks = int(len(raw))
        present = int(raw.notna().sum())
        summary_rows.append({
            "commodity": commodity, "variety": variety, "city": city, "unit": unit,
            "start": idx.min().date(), "end": idx.max().date(),
            "span_weeks": span_weeks, "present_weeks": present,
            "filled_weeks": int(out["filled"].sum()),
            "winsorized_weeks": int(out["winsorized"].sum()),
            "coverage_pct": round(100.0 * present / span_weeks, 1) if span_weeks else 0.0,
            "price_min": round(float(out["price"].min()), 2),
            "price_max": round(float(out["price"].max()), 2),
            "price_mean": round(float(out["price"].mean()), 2),
            "price_median": round(float(out["price"].median()), 2),
        })

    panel = pd.concat(panel_parts, ignore_index=True)
    panel = panel.sort_values(KEYS + ["date"]).reset_index(drop=True)
    summary = pd.DataFrame(summary_rows).sort_values(KEYS).reset_index(drop=True)
    gaps = pd.DataFrame(gap_rows).sort_values(["commodity", "variety", "city",
                                               "gap_start"]) if gap_rows else \
        pd.DataFrame(columns=["commodity", "variety", "city",
                              "gap_start", "gap_end", "gap_weeks"])

    # ---- write panel ----
    panel_path = os.path.join(data_dir, "panel.parquet")
    panel.to_parquet(panel_path, index=False, engine="pyarrow")

    # ---- coverage by year ----
    panel["year"] = panel["date"].dt.year
    panel["series"] = (panel["commodity"] + " | " + panel["variety"].replace("", "-")
                       + " | " + panel["city"])
    cov_year = (panel.pivot_table(index="series", columns="year",
                                  values="price", aggfunc="size", fill_value=0)
                .astype(int))
    cov_year.to_csv(os.path.join(eda_dir, "coverage_by_year.csv"))

    # ---- commodity overview ----
    ov = (summary.groupby("commodity")
          .agg(series=("city", "size"),
               cities=("city", "nunique"),
               varieties=("variety", "nunique"),
               start=("start", "min"), end=("end", "max"),
               present_weeks=("present_weeks", "sum"),
               filled_weeks=("filled_weeks", "sum"),
               winsorized_weeks=("winsorized_weeks", "sum"),
               price_min=("price_min", "min"), price_max=("price_max", "max"))
          .reset_index())
    ov.to_csv(os.path.join(eda_dir, "commodity_overview.csv"), index=False)
    summary.to_csv(os.path.join(eda_dir, "series_summary.csv"), index=False)
    gaps.to_csv(os.path.join(eda_dir, "gaps.csv"), index=False)

    # ---- EDA.md ----
    total_rows = len(panel)
    total_series = len(summary)
    filled_rows = int(panel["filled"].sum())
    wins_rows = int(panel["winsorized"].sum())
    lines = []
    lines.append("# FarmKonnect - Phase 2 Panel EDA\n")
    lines.append(f"- Built: {pd.Timestamp.utcnow():%Y-%m-%d %H:%M UTC}")
    lines.append(f"- Source: `commodityprices` FQP, excluded:{{$ne:true}}, real Date only")
    lines.append(f"- Scope: {', '.join(TARGETS)}")
    lines.append(f"- Resample: {args.freq} mean - ffill <= {FFILL}w - "
                 f"winsor {WQ:.0%}/{1-WQ:.0%}\n")
    lines.append(f"**Panel:** {total_rows:,} weekly rows - {total_series} series - "
                 f"{panel['date'].min().date()} -> {panel['date'].max().date()}")
    lines.append(f"**Filled rows:** {filled_rows:,} ({100*filled_rows/total_rows:.1f}%) - "
                 f"**Winsorized rows:** {wins_rows:,} ({100*wins_rows/total_rows:.1f}%)\n")
    lines.append("## Per-commodity overview\n")
    lines.append(ov.to_markdown(index=False))
    lines.append("\n## Coverage (worst 15 series by coverage %)\n")
    lines.append(summary.sort_values("coverage_pct")
                 [["commodity", "variety", "city", "start", "end",
                   "present_weeks", "coverage_pct"]].head(15).to_markdown(index=False))
    lines.append(f"\n## Gaps > {FFILL}w (top 15 by length)\n")
    if len(gaps):
        lines.append(gaps.sort_values("gap_weeks", ascending=False)
                     .head(15).to_markdown(index=False))
        lines.append(f"\nTotal long gaps: {len(gaps)}")
    else:
        lines.append("None.")
    with open(os.path.join(eda_dir, "EDA.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    # ---- heatmap (best effort) ----
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        years = sorted(cov_year.columns)
        weeks_per_year = cov_year.div(52.0).clip(upper=1.0)  # rough coverage frac
        fig_h = max(4, 0.18 * len(cov_year))
        fig, ax = plt.subplots(figsize=(max(8, 0.5 * len(years)), fig_h))
        im = ax.imshow(weeks_per_year.values, aspect="auto", cmap="viridis",
                       vmin=0, vmax=1)
        ax.set_xticks(range(len(years))); ax.set_xticklabels(years, rotation=90, fontsize=7)
        ax.set_yticks(range(len(cov_year))); ax.set_yticklabels(cov_year.index, fontsize=5)
        ax.set_title("Weekly coverage fraction by series x year")
        fig.colorbar(im, ax=ax, shrink=0.5, label="weeks present / 52")
        fig.tight_layout()
        fig.savefig(os.path.join(eda_dir, "coverage_heatmap.png"), dpi=130)
        plt.close(fig)
        heatmap_note = "coverage_heatmap.png written"
    except Exception as e:
        heatmap_note = f"heatmap skipped ({type(e).__name__}: {e})"

    # ---- console summary ----
    print("\n" + "=" * 64)
    print("PANEL BUILT")
    print("=" * 64)
    print(f"  rows:            {total_rows:,}")
    print(f"  series:          {total_series}")
    print(f"  date span:       {panel['date'].min().date()} -> {panel['date'].max().date()}")
    print(f"  filled rows:     {filled_rows:,} ({100*filled_rows/total_rows:.1f}%)")
    print(f"  winsorized rows: {wins_rows:,} ({100*wins_rows/total_rows:.1f}%)")
    print(f"  long gaps (> {FFILL}w): {len(gaps)}")
    print("  per commodity (series | weeks | price range):")
    for _, r in ov.iterrows():
        wk = int(panel[panel['commodity'] == r['commodity']].shape[0])
        print(f"    {r['commodity']:22s} {int(r['series']):>3d} series  "
              f"{wk:>6d} wk  {r['price_min']:>10.2f} - {r['price_max']:<10.2f}")
    print(f"  {heatmap_note}")
    print(f"  parquet: {panel_path}")
    print("=" * 64)


if __name__ == "__main__":
    main()
