"""
Phase 3 collector - NASA POWER daily weather, per city.

For each of the 14 Punjab market cities, pull daily rainfall, mean/max/min
temperature and relative humidity from the NASA POWER API (keyless, ~50 km grid,
agroclimatology community). Weather drives yield -> price with a months-long lag,
so engineer lagged/seasonal versions downstream (raw daily cached here).

Params: PRECTOTCORR (mm/day), T2M, T2M_MAX, T2M_MIN (degC), RH2M (%).
Missing fill (-999) -> NaN.

Output: <out>/data/external/weather_daily.parquet
        columns: date, city, wx_precip, wx_t2m, wx_tmax, wx_tmin, wx_rh

Usage:  python fetch_nasa_power.py --out /out --start 20090101
"""

from __future__ import annotations
import argparse
import os
import sys
import time

try:
    import numpy as np
    import pandas as pd
    import requests
except ImportError:
    print("Install deps:  pip install pandas pyarrow numpy requests")
    sys.exit(1)

# Panel city name -> (lat, lon)
CITY_COORDS = {
    "Lahore":       (31.5497, 74.3436),
    "Faisalabad":   (31.4504, 73.1350),
    "Gujranwala":   (32.1877, 74.1945),
    "Okara":        (30.8138, 73.4534),
    "Sargodha":     (32.0836, 72.6711),
    "Rawalpindi":   (33.5651, 73.0169),
    "Multan":       (30.1575, 71.5249),
    "RahimYarKhan": (28.4202, 70.2952),
    "Layyah":       (30.9693, 70.9428),
    "BahawalPur":   (29.3956, 71.6836),
    "BahawalNagar": (29.9994, 73.2536),
    "Chichawatni":  (30.5320, 72.6907),
    "Sialkot":      (32.4945, 74.5229),
    "Jhang":        (31.2781, 72.3317),
}
PARAM_MAP = {
    "PRECTOTCORR": "wx_precip",
    "T2M":         "wx_t2m",
    "T2M_MAX":     "wx_tmax",
    "T2M_MIN":     "wx_tmin",
    "RH2M":        "wx_rh",
}
ENDPOINT = "https://power.larc.nasa.gov/api/temporal/daily/point"
UA = {"User-Agent": "Mozilla/5.0 (FarmKonnect ML collector)"}


def fetch_city(lat, lon, start, end, retries=5):
    params = {
        "parameters": ",".join(PARAM_MAP),
        "community": "AG",
        "longitude": lon, "latitude": lat,
        "start": start, "end": end, "format": "JSON",
    }
    last = None
    for attempt in range(retries):
        try:
            r = requests.get(ENDPOINT, params=params, headers=UA, timeout=90)
            r.raise_for_status()
            return r.json()["properties"]["parameter"]
        except Exception as e:
            last = e
            time.sleep(min(2 ** attempt, 20))
    raise last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./panelout")
    ap.add_argument("--start", default="20090101")
    ap.add_argument("--end", default=pd.Timestamp.today().strftime("%Y%m%d"))
    args = ap.parse_args()

    ext_dir = os.path.join(args.out, "data", "external")
    os.makedirs(ext_dir, exist_ok=True)

    frames, failed = [], []
    for city, (lat, lon) in CITY_COORDS.items():
        try:
            pdict = fetch_city(lat, lon, args.start, args.end)
            dfc = pd.DataFrame({PARAM_MAP[k]: pd.Series(v) for k, v in pdict.items()})
            dfc.index = pd.to_datetime(dfc.index, format="%Y%m%d")
            dfc = dfc.replace(-999.0, np.nan)
            dfc.insert(0, "city", city)
            dfc = dfc.reset_index(names="date")
            frames.append(dfc)
            print(f"  {city:14s} {len(dfc):>5} days  "
                  f"{dfc['date'].min().date()}..{dfc['date'].max().date()}")
            time.sleep(0.5)
        except Exception as e:
            failed.append(city)
            print(f"  {city:14s} FAILED: {e}")

    if not frames:
        print("ERROR: no weather data fetched.")
        sys.exit(3)

    out = pd.concat(frames, ignore_index=True).sort_values(["city", "date"]).reset_index(drop=True)
    path = os.path.join(ext_dir, "weather_daily.parquet")
    out.to_parquet(path, index=False, engine="pyarrow")

    print("\n" + "=" * 64)
    print("NASA POWER WEATHER")
    print("=" * 64)
    print(f"  rows: {len(out):,}   cities: {out['city'].nunique()}/{len(CITY_COORDS)}   "
          f"{out['date'].min().date()} -> {out['date'].max().date()}")
    print(f"  parquet: {path}")
    for c in ["wx_precip", "wx_t2m", "wx_tmax", "wx_tmin", "wx_rh"]:
        s = out[c]
        print(f"    {c:10s} n={s.notna().sum():>7,}  [{s.min():.1f} .. {s.max():.1f}]  mean={s.mean():.1f}")
    if failed:
        print(f"  FAILED cities: {failed}")
    print("=" * 64)


if __name__ == "__main__":
    main()
