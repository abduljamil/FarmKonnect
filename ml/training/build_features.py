"""
Phase 3 - assemble the modeling feature table.

Joins all factor sources onto the weekly panel (one row per
commodity.variety.city.week), preserving row count:

  features_deterministic.parquet   panel + calendar/policy/MSP   (key: c,v,city,date)
  external/weather_daily.parquet    -> weekly per city            (key: city,date)
  external/markets_daily.parquet    -> weekly mean, global        (key: date)
  external/worldbank_monthly.parquet-> as-of latest month, global (key: date)

Join rules:
  * weather: daily -> W-FRI weekly  (precip summed; temps max/min/mean; RH mean),
    merged by (city, week).
  * markets: daily -> W-FRI weekly mean, reindexed to panel weeks + ffilled, then
    broadcast across all rows of each week.
  * world bank: monthly -> merge_asof backward (latest published month <= week),
    so only values known by that week are used (leakage-safe), then broadcast.

NOTE on leakage: weather/markets/WB are joined CONTEMPORANEOUSLY here. World/FX/oil
are known at predict time; weather for a future week is not, so the modeling step
must use LAGGED weather features (see catalog). The raw weekly values live here.

Output: <out>/data/features.parquet

Usage:  python build_features.py --out /out
"""

from __future__ import annotations
import argparse
import os
import sys

try:
    import pandas as pd
except ImportError:
    print("Install deps:  pip install pandas pyarrow")
    sys.exit(1)

FREQ = "W-FRI"
WX_AGG = {
    "wx_precip": ("wx_precip_sum", "sum"),
    "wx_t2m":    ("wx_t2m_mean", "mean"),
    "wx_tmax":   ("wx_tmax_max", "max"),
    "wx_tmin":   ("wx_tmin_min", "min"),
    "wx_rh":     ("wx_rh_mean", "mean"),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./panelout")
    args = ap.parse_args()

    d = os.path.join(args.out, "data")
    ext = os.path.join(d, "external")

    det = pd.read_parquet(os.path.join(d, "features_deterministic.parquet"))
    det["date"] = pd.to_datetime(det["date"])
    n0 = len(det)
    weeks = pd.DataFrame({"date": sorted(det["date"].unique())}).sort_values("date")

    # ---- weather: daily -> weekly per city ----
    wx = pd.read_parquet(os.path.join(ext, "weather_daily.parquet"))
    wx["date"] = pd.to_datetime(wx["date"])
    agg_map = {src: how for src, (_, how) in WX_AGG.items()}
    wxw = (wx.set_index("date").groupby("city").resample(FREQ).agg(agg_map))
    wxw = wxw.rename(columns={src: new for src, (new, _) in WX_AGG.items()}).reset_index()

    # ---- markets: daily -> weekly mean, aligned to panel weeks + ffilled ----
    mk = pd.read_parquet(os.path.join(ext, "markets_daily.parquet"))
    mk["date"] = pd.to_datetime(mk["date"])
    mkw = mk.set_index("date").resample(FREQ).mean(numeric_only=True)
    mkw = mkw.reindex(weeks["date"]).ffill().reset_index()
    mkw.columns = ["date"] + list(mkw.columns[1:])

    # ---- world bank: monthly -> as-of latest known month per week ----
    wb = pd.read_parquet(os.path.join(ext, "worldbank_monthly.parquet"))
    wb["date"] = pd.to_datetime(wb["date"])
    wbw = pd.merge_asof(weeks, wb.sort_values("date"), on="date", direction="backward")

    # ---- join (all many-to-one => no row blowup) ----
    feat = (det.merge(wxw, on=["city", "date"], how="left")
               .merge(mkw, on="date", how="left")
               .merge(wbw, on="date", how="left"))

    assert len(feat) == n0, f"row blowup! {n0} -> {len(feat)}"
    feat = feat.sort_values(["commodity", "variety", "city", "date"]).reset_index(drop=True)
    path = os.path.join(d, "features.parquet")
    feat.to_parquet(path, index=False, engine="pyarrow")

    # ---- validation ----
    base = set(det.columns)
    wx_cols = [n for _, (n, _) in WX_AGG.items()]
    mk_cols = [c for c in mkw.columns if c != "date"]
    wb_cols = [c for c in wbw.columns if c != "date"]
    print("\n" + "=" * 64)
    print("FEATURE TABLE BUILT")
    print("=" * 64)
    print(f"  rows: {len(feat):,} (panel preserved: {len(feat) == n0})")
    print(f"  columns: {feat.shape[1]}  (base {len(base)} + "
          f"wx {len(wx_cols)} + markets {len(mk_cols)} + wb {len(wb_cols)})")
    print(f"  span: {feat['date'].min().date()} -> {feat['date'].max().date()}")
    print(f"  parquet: {path}")

    def cov(cols, label):
        print(f"  {label} coverage (non-null %):")
        for c in cols:
            pct = 100.0 * feat[c].notna().mean()
            print(f"    {c:18s} {pct:5.1f}%")

    cov(wx_cols, "weather")
    cov(mk_cols, "markets")
    cov(wb_cols, "worldbank")

    # sample: latest Wheat/Faisalabad week
    samp = feat[(feat["commodity"] == "Wheat") & (feat["city"] == "Faisalabad")].tail(1)
    if len(samp):
        s = samp.iloc[0]
        print("  sample (Wheat/Faisalabad latest week):")
        print(f"    date={s['date'].date()} price={s['price']:.0f} "
              f"msp_regime={s['msp_regime']} msp_value_wheat={s.get('msp_value_wheat')}")
        print(f"    wx_precip_sum={s['wx_precip_sum']:.1f} wx_tmax_max={s['wx_tmax_max']:.1f} "
              f"yf_usdpkr={s['yf_usdpkr']:.1f} wb_wheat_hrw={s['wb_wheat_hrw']:.1f}")
    print("=" * 64)


if __name__ == "__main__":
    main()
