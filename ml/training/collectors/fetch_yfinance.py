"""
Phase 3 collector - daily market data via yfinance.

Adds daily recency on top of the (monthly) World Bank series, plus USD/PKR FX
(the one Tier-1 signal not in the Pink Sheet). Closes only.

Tickers:
    ZW=F CBOT wheat · KE=F KC HRW wheat · ZC=F corn/maize · CT=F cotton #2 ·
    SB=F sugar #11 · BZ=F Brent crude · PKR=X USD/PKR

All known at prediction time (markets close daily). Yahoo can rate-limit
datacenter IPs; on partial failure we still write whatever came back and report
which tickers are empty (WB monthly remains the fallback for world prices).

Output: <out>/data/external/markets_daily.parquet  (date + yf_* close columns)

Usage:  python fetch_yfinance.py --out /out --start 2009-01-01
"""

from __future__ import annotations
import argparse
import os
import sys
import time

try:
    import pandas as pd
    import yfinance as yf
except ImportError:
    print("Install deps:  pip install pandas pyarrow yfinance")
    sys.exit(1)

TICKERS = {
    "yf_wheat_cbot": "ZW=F",
    "yf_wheat_kc":   "KE=F",
    "yf_maize":      "ZC=F",
    "yf_cotton":     "CT=F",
    "yf_sugar":      "SB=F",
    "yf_brent":      "BZ=F",
    "yf_usdpkr":     "PKR=X",
}


def extract_close(data):
    """Return a date-indexed DataFrame of Close prices, ticker-named columns."""
    if isinstance(data.columns, pd.MultiIndex):
        lvl0 = data.columns.get_level_values(0)
        if "Close" in set(lvl0):
            return data["Close"]
        return data.xs("Close", axis=1, level=1)
    # single ticker -> flat columns
    return data[["Close"]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./panelout")
    ap.add_argument("--start", default="2009-01-01")
    args = ap.parse_args()

    ext_dir = os.path.join(args.out, "data", "external")
    os.makedirs(ext_dir, exist_ok=True)
    end = (pd.Timestamp.today().normalize() + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    syms = list(TICKERS.values())

    data = None
    for attempt in range(4):
        try:
            data = yf.download(syms, start=args.start, end=end, interval="1d",
                               auto_adjust=True, progress=False, threads=True)
            if data is not None and not data.empty:
                break
        except Exception as e:
            print(f"  attempt {attempt+1} failed: {e}")
        time.sleep(2 ** attempt)

    if data is None or data.empty:
        print("ERROR: yfinance returned no data (likely rate-limited from this IP).")
        sys.exit(3)

    close = extract_close(data)
    inv = {v: k for k, v in TICKERS.items()}
    close = close.rename(columns=inv)
    # keep only known cols, order them
    cols = [k for k in TICKERS if k in close.columns]
    out = close[cols].reset_index().rename(columns={"Date": "date", "index": "date"})
    out["date"] = pd.to_datetime(out["date"])
    out = out.dropna(how="all", subset=cols).sort_values("date").reset_index(drop=True)

    # Yahoo's PKR=X carries sporadic bad ticks (e.g. 2.0, 84020); USD/PKR has
    # stayed within ~58-290 over 2009-2026, so blank anything outside [30, 500].
    if "yf_usdpkr" in out.columns:
        out.loc[~out["yf_usdpkr"].between(30, 500), "yf_usdpkr"] = float("nan")

    path = os.path.join(ext_dir, "markets_daily.parquet")
    out.to_parquet(path, index=False, engine="pyarrow")

    print("\n" + "=" * 64)
    print("YFINANCE DAILY MARKETS")
    print("=" * 64)
    print(f"  rows: {len(out):,}   {out['date'].min().date()} -> {out['date'].max().date()}")
    print(f"  parquet: {path}")
    empties = []
    for k in TICKERS:
        if k in out.columns and out[k].notna().sum() > 0:
            s = out[k]
            print(f"    {k:16s} ({TICKERS[k]:6s}) n={s.notna().sum():>5} "
                  f"[{s.min():.2f} .. {s.max():.2f}]  last={s.dropna().iloc[-1]:.2f}")
        else:
            empties.append(k)
    if empties:
        print(f"  EMPTY tickers (no data returned): {empties}")
    print("=" * 64)


if __name__ == "__main__":
    main()
