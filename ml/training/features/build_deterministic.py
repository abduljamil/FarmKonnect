"""
Phase 3 - deterministic (no-network) features: calendar + policy/MSP.

Reads the Phase-2 weekly panel and ml/external/policy_events.csv, and emits the
panel plus deterministic feature columns. These are all known at prediction time
(scheduled / computable), so they are leakage-safe.

Calendar (date-keyed):
    cal_year, cal_month, cal_quarter, cal_woy, cal_woy_sin, cal_woy_cos,
    cal_is_ramadan, cal_is_eid_fitr, cal_is_eid_adha   (hijri via hijri-converter)
Harvest (commodity x month):
    cal_is_harvest        (Punjab harvest window per commodity)
Policy (commodity x date, from policy_events.csv):
    pol_<event_type> booleans (active in [start,end]); msp_set/abolished/reinstated
    are handled via the richer pair below instead of sticky flags:
    msp_regime (active/abolished/reinstated/deregulated) + msp_regime_code,
    msp_value_wheat (stepwise Rs/40Kg), pol_up / pol_down (any active up/down event).

Read-only.  Inputs via args; output parquet under --out.

Usage:
    python build_deterministic.py --panel /out/data/panel.parquet \
        --policy /policy_events.csv --out /out
"""

from __future__ import annotations
import argparse
import os
import sys

try:
    import numpy as np
    import pandas as pd
    try:
        from hijridate import Gregorian
    except ImportError:
        from hijri_converter import Gregorian
except ImportError:
    print("Install deps:  pip install pandas pyarrow numpy hijridate")
    sys.exit(1)

# --- Punjab harvest windows (months) per commodity ----------------------------
HARVEST_MONTHS = {
    "Wheat": {4, 5},
    "Rice": {10, 11},
    "Paddy": {10, 11},
    "Maize": {5, 6, 10, 11},          # spring + autumn crops
    "Sugar": {11, 12, 1, 2, 3},       # cane crushing season
    "Seed Cotton (Phutti)": {9, 10, 11, 12},
}

# policy_events.csv commodity name -> panel commodity name(s)
COMMODITY_ALIASES = {
    "Cotton": {"Seed Cotton (Phutti)"},
    "Rice": {"Rice", "Paddy"},        # rice export/MEP policy also drives paddy
}

# --- MSP market regime (wheat-led; treated as a market-wide structural flag) ---
# From policy_events.csv + catalog: valid 2009-2024 -> abolished (IMF) 2024-10 ->
# reinstated 2025-03 (Rs3500/40kg) -> deregulation legislated 2026-05.
MSP_REGIME_BREAKS = [
    ("1900-01-01", "active"),
    ("2024-10-01", "abolished"),
    ("2025-03-01", "reinstated"),
    ("2026-05-15", "deregulated"),
]
MSP_REGIME_CODE = {"active": 1, "abolished": 0, "reinstated": 2, "deregulated": 3}

# Stepwise wheat MSP (Rs/40Kg), effective-date -> value (from CSV descriptions).
# NaN before first reliably-documented step and during the abolished window.
MSP_WHEAT_STEPS = [
    ("2011-10-01", 1050),
    ("2012-10-01", 1200),
    ("2014-10-01", 1250),
    ("2015-10-01", 1300),
    ("2019-10-01", 1400),
    ("2020-10-26", 1600),
    ("2021-10-01", 2200),
    ("2023-01-01", 3900),
    ("2024-10-01", np.nan),   # abolished
    ("2025-03-01", 3500),     # reinstated
]

# Point-in-time MSP events are represented by regime/value above, not sticky flags
GENERIC_SKIP = {"msp_set", "msp_abolished", "msp_reinstated"}
OPEN_END_CAP = "2027-12-31"


def hijri_flags(d):
    """(is_ramadan, is_eid_fitr, is_eid_adha) for a Gregorian date d."""
    try:
        h = Gregorian(d.year, d.month, d.day).to_hijri()
    except Exception:
        return (0, 0, 0)
    m, day = h.month, h.day
    is_ramadan = int(m == 9)
    is_eid_fitr = int(m == 10 and day <= 3)        # 1 Shawwal +/- a few days
    is_eid_adha = int(m == 12 and 8 <= day <= 13)  # 10 Dhu al-Hijjah window
    return (is_ramadan, is_eid_fitr, is_eid_adha)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--panel", required=True)
    ap.add_argument("--policy", required=True)
    ap.add_argument("--out", default="./panelout")
    args = ap.parse_args()

    out_data = os.path.join(args.out, "data")
    os.makedirs(out_data, exist_ok=True)

    df = pd.read_parquet(args.panel)
    df["date"] = pd.to_datetime(df["date"])
    print(f"panel: {len(df):,} rows, {df['date'].min().date()} -> {df['date'].max().date()}")

    # ---------- calendar (per unique date) ----------
    dates = pd.DataFrame({"date": sorted(df["date"].unique())})
    dt = dates["date"].dt
    dates["cal_year"] = dt.year
    dates["cal_month"] = dt.month
    dates["cal_quarter"] = dt.quarter
    woy = dt.isocalendar().week.astype(int)
    dates["cal_woy"] = woy
    dates["cal_woy_sin"] = np.sin(2 * np.pi * woy / 52.0)
    dates["cal_woy_cos"] = np.cos(2 * np.pi * woy / 52.0)
    flags = dates["date"].apply(hijri_flags)
    dates["cal_is_ramadan"] = [f[0] for f in flags]
    dates["cal_is_eid_fitr"] = [f[1] for f in flags]
    dates["cal_is_eid_adha"] = [f[2] for f in flags]
    df = df.merge(dates, on="date", how="left")

    # harvest (commodity x month)
    df["cal_is_harvest"] = [
        int(m in HARVEST_MONTHS.get(c, set()))
        for c, m in zip(df["commodity"], df["cal_month"])
    ]

    # ---------- MSP regime + value ----------
    reg = pd.Series("active", index=df.index)
    for start, name in MSP_REGIME_BREAKS:
        reg[df["date"] >= pd.Timestamp(start)] = name
    df["msp_regime"] = reg.values
    df["msp_regime_code"] = df["msp_regime"].map(MSP_REGIME_CODE).astype(int)

    msp_val = pd.Series(np.nan, index=df.index)
    for start, val in MSP_WHEAT_STEPS:
        msp_val[df["date"] >= pd.Timestamp(start)] = val
    # only meaningful for wheat
    df["msp_value_wheat"] = np.where(df["commodity"] == "Wheat", msp_val, np.nan)

    # ---------- policy event flags ----------
    pol = pd.read_csv(args.policy)
    pol["start_date"] = pd.to_datetime(pol["start_date"])
    pol["end_date"] = pd.to_datetime(pol["end_date"].fillna(OPEN_END_CAP))

    event_types = sorted(set(pol["event_type"]) - GENERIC_SKIP)
    for et in event_types:
        df[f"pol_{et}"] = 0
    df["pol_up"] = 0
    df["pol_down"] = 0

    for _, ev in pol.iterrows():
        et = ev["event_type"]
        in_window = (df["date"] >= ev["start_date"]) & (df["date"] <= ev["end_date"])
        comm = ev["commodity"]
        if comm == "ALL":
            match_comm = pd.Series(True, index=df.index)
        else:
            match_comm = df["commodity"].isin(COMMODITY_ALIASES.get(comm, {comm}))
        mask = in_window & match_comm
        if et not in GENERIC_SKIP:
            df.loc[mask, f"pol_{et}"] = 1
        eff = str(ev.get("expected_price_effect", "")).lower()
        if eff == "up":
            df.loc[mask, "pol_up"] = 1
        elif eff == "down":
            df.loc[mask, "pol_down"] = 1

    # ---------- write ----------
    out_path = os.path.join(out_data, "features_deterministic.parquet")
    df.to_parquet(out_path, index=False, engine="pyarrow")

    # ---------- validation summary ----------
    new_cols = [c for c in df.columns if c.startswith(("cal_", "pol_", "msp_"))]
    print("\n" + "=" * 64)
    print("DETERMINISTIC FEATURES BUILT")
    print("=" * 64)
    print(f"  rows: {len(df):,}   new feature cols: {len(new_cols)}")
    print(f"  parquet: {out_path}")
    print("  non-zero / non-null counts per new column:")
    for c in new_cols:
        if not pd.api.types.is_numeric_dtype(df[c]):
            nz = int(df[c].notna().sum())
            vals = sorted(map(str, pd.Series(df[c].dropna().unique())))[:6]
            print(f"    {c:24s} {nz:>7,}  values={vals}")
        else:
            col = pd.to_numeric(df[c], errors="coerce")
            nz = int((col.fillna(0) != 0).sum())
            if col.notna().any():
                print(f"    {c:24s} {nz:>7,}  (min={np.nanmin(col):.2f} max={np.nanmax(col):.2f})")
            else:
                print(f"    {c:24s} {nz:>7,}  (all NaN)")
    # spot checks
    print("\n  spot checks:")
    r2023 = df[(df["cal_is_ramadan"] == 1) & (df["cal_year"] == 2023)]["date"].dt.date.unique()
    print(f"    Ramadan-2023 weeks: {list(r2023)[:6]} ... ({len(r2023)} wks)")
    reg_tx = df[["date", "msp_regime"]].drop_duplicates().sort_values("date")
    tx = reg_tx[reg_tx["msp_regime"] != reg_tx["msp_regime"].shift()]
    print("    MSP regime transitions:")
    for _, r in tx.iterrows():
        print(f"      {str(r['date'].date())}  -> {r['msp_regime']}")
    wmsp = (df[df["commodity"] == "Wheat"][["date", "msp_value_wheat"]]
            .dropna().drop_duplicates("msp_value_wheat").sort_values("date"))
    print(f"    wheat MSP steps: {list(zip(wmsp['date'].dt.year, wmsp['msp_value_wheat'].astype(int)))}")
    print("=" * 64)


if __name__ == "__main__":
    main()
