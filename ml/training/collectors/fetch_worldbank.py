"""
Phase 3 collector - World Bank "Pink Sheet" monthly commodity prices.

One download covers world wheat / rice / maize / cotton / sugar + DAP & urea
fertilizer + Brent crude, monthly, back to 1960. We keep 2008+ (a little before
the panel, for lags). All values known at prediction time (published monthly).

Robust to the Pink Sheet's shifting layout: locates the header row by anchoring
on the "Crude oil" column and the first "YYYYMmm" data row, rather than hard
skiprows. Auto-discovers the current xlsx URL from the commodity-markets page
if --url is not given (the doc-id in the URL rotates each release).

Output: <out>/data/external/worldbank_monthly.parquet  (date + wb_* columns)

Usage:
    python fetch_worldbank.py --out /out
    python fetch_worldbank.py --out /out --url https://.../CMO-Historical-Data-Monthly.xlsx
"""

from __future__ import annotations
import argparse
import io
import os
import re
import sys
import time

try:
    import pandas as pd
    import requests
except ImportError:
    print("Install deps:  pip install pandas pyarrow requests openpyxl")
    sys.exit(1)

PAGE = "https://www.worldbank.org/en/research/commodity-markets"
FALLBACK_URLS = [
    "https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/CMO-Historical-Data-Monthly.xlsx",
    "https://thedocs.worldbank.org/en/doc/5d903e848db1d1b83e0ec8f744e55570-0350012021/related/CMO-Historical-Data-Monthly.xlsx",
]
UA = {"User-Agent": "Mozilla/5.0 (FarmKonnect ML collector)"}

# clean_key -> case-insensitive substrings that identify the Pink Sheet column
TARGETS = {
    "wb_crude_brent": ["crude oil, brent"],
    "wb_wheat_hrw":   ["wheat, us hrw"],
    "wb_wheat_srw":   ["wheat, us srw"],
    "wb_maize":       ["maize"],
    "wb_rice_thai5":  ["rice, thai 5"],
    "wb_rice_thai25": ["rice, thai 25"],
    "wb_rice_viet5":  ["rice, viet"],
    "wb_sugar_world": ["sugar, world"],
    "wb_cotton_a":    ["cotton, a index", "cotton a index"],
    "wb_dap":         ["dap"],
    "wb_urea":        ["urea"],
}
DATE_RE = re.compile(r"^\s*(\d{4})M(\d{1,2})\s*$")


def http_get(url, retries=4):
    last = None
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=UA, timeout=60)
            r.raise_for_status()
            return r.content
        except Exception as e:
            last = e
            time.sleep(2 ** attempt)
    raise last


def discover_url():
    try:
        html = http_get(PAGE).decode("utf-8", "ignore")
    except Exception as e:
        print(f"  page discovery failed: {e}")
        return None
    m = re.findall(r'href=["\']([^"\']*CMO-Historical-Data-Monthly\.xlsx[^"\']*)["\']',
                   html, flags=re.I)
    if not m:
        return None
    url = m[0]
    if url.startswith("/"):
        url = "https://www.worldbank.org" + url
    return url


def get_workbook_bytes(arg_url):
    urls = ([arg_url] if arg_url else []) + [discover_url()] + FALLBACK_URLS
    for url in [u for u in urls if u]:
        try:
            print(f"  downloading: {url[:90]}...")
            b = http_get(url)
            if len(b) > 100_000:
                print(f"  got {len(b):,} bytes")
                return b
        except Exception as e:
            print(f"    failed: {e}")
    raise RuntimeError("Could not download Pink Sheet from any URL")


def parse_pink_sheet(xls_bytes):
    raw = pd.read_excel(io.BytesIO(xls_bytes), sheet_name="Monthly Prices", header=None)
    # first data row: col0 looks like YYYYMmm
    data_row = None
    for i in range(len(raw)):
        if DATE_RE.match(str(raw.iat[i, 0])):
            data_row = i
            break
    if data_row is None:
        raise RuntimeError("could not find a YYYYMmm data row")
    # header (names) row: the one above data_row containing 'crude oil'
    names_row = None
    for i in range(data_row - 1, -1, -1):
        rowvals = " ".join(str(x).lower() for x in raw.iloc[i].tolist())
        if "crude oil" in rowvals:
            names_row = i
            break
    if names_row is None:
        names_row = max(0, data_row - 2)
    cols = [str(x).strip() for x in raw.iloc[names_row].tolist()]
    cols[0] = "date"
    data = raw.iloc[data_row:].copy()
    data.columns = cols
    data = data[data["date"].astype(str).str.match(DATE_RE)]

    def to_month(s):
        m = DATE_RE.match(str(s))
        return pd.Timestamp(int(m.group(1)), int(m.group(2)), 1)
    data["date"] = data["date"].apply(to_month)
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./panelout")
    ap.add_argument("--url", default=None)
    ap.add_argument("--since", default="2008-01-01")
    args = ap.parse_args()

    ext_dir = os.path.join(args.out, "data", "external")
    os.makedirs(ext_dir, exist_ok=True)

    data = parse_pink_sheet(get_workbook_bytes(args.url))
    lower = {c.lower(): c for c in data.columns}

    out = pd.DataFrame({"date": data["date"]})
    matched, missing = {}, []
    for key, subs in TARGETS.items():
        col = None
        for lc, orig in lower.items():
            if any(s in lc for s in subs):
                col = orig
                break
        if col is None:
            missing.append(key)
            continue
        out[key] = pd.to_numeric(data[col], errors="coerce")
        matched[key] = col

    out = out[out["date"] >= pd.Timestamp(args.since)].reset_index(drop=True)
    path = os.path.join(ext_dir, "worldbank_monthly.parquet")
    out.to_parquet(path, index=False, engine="pyarrow")

    print("\n" + "=" * 64)
    print("WORLD BANK PINK SHEET")
    print("=" * 64)
    print(f"  rows: {len(out):,}   {out['date'].min().date()} -> {out['date'].max().date()}")
    print(f"  parquet: {path}")
    print("  matched columns:")
    for k, c in matched.items():
        s = out[k]
        print(f"    {k:18s} <- {c[:40]:40s} n={s.notna().sum():>4} "
              f"[{s.min():.1f} .. {s.max():.1f}]")
    if missing:
        print(f"  MISSING (no column matched): {missing}")
    print("=" * 64)


if __name__ == "__main__":
    main()
