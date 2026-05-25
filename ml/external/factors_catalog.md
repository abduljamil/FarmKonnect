# External Factors Catalog — Phase 3 (locked spec)

Every factor below becomes one or more **columns joined onto the price panel** by date
(and, where relevant, by city). Selection (LASSO / feature-importance) prunes weak ones later.

Legend — **Avail@predict**: is the value known at prediction time?
✅ known · ⚠️ needs a forecast or only lagged value · 🗓️ known in advance.

---

## Tier 1 — core signals (free, mostly daily)

| Factor | What / why | Commodities | Source (free) | Access | Freq | Avail@predict |
|---|---|---|---|---|---|---|
| **Own-price lags + seasonality** | #1 predictor; harvest cycle | all | our Mongo panel | derived (lag_1/4/52w, rolling mean/std, week-of-year, month) | daily/weekly | ✅ |
| **USD/PKR FX** | rupee weakness → higher prices; import/export pricing | all (esp. rice, cotton) | SBP EasyData (`easydata.sbp.org.pk`) + `her-usdollar.xls`; or yfinance `PKR=X` | xls / API | daily (SBP also monthly) | ✅ |
| **World benchmark prices** | strong transmission to domestic | wheat→ZW=F/KE=F; maize→ZC=F; cotton→CT=F + Cotlook A; sugar→SB=F; rice→Thai 5%/25%, Viet 5% | **World Bank Pink Sheet** (`CMO-Historical-Data-Monthly.xlsx`) for long history; **yfinance** futures for recent daily | xlsx + API | monthly (WB) / daily (yf) | ✅ |
| **Weather: rainfall + temp** (per city) | drives yield → price (lagged) | all (winter rain→wheat; monsoon→rice/cotton/cane) | **NASA POWER API** (`power.larc.nasa.gov`) params `PRECTOTCORR`, `T2M`, `T2M_MAX/MIN`, `RH2M` | REST, per lat/lon (~50 km) | daily | ⚠️ (use lagged/seasonal; future needs forecast) |
| **Ramadan/Eid + harvest calendar** | demand spikes (sugar↑ Ramadan); supply at harvest | all | `hijri-converter`/`convertdate` lib + static harvest months | computed | daily flags | 🗓️ |

## Tier 2 — Pakistan-specific (periodic / manual)

| Factor | What / why | Commodities | Source | Freq | Avail@predict |
|---|---|---|---|---|---|
| **Support price (MSP)** — regime-aware | *dominant* for wheat (historically) | wheat, sugarcane | **AMIS Pakistan** (`amis.pk/Agristatistics/SupportPrice/...`) — full numeric series | annual | 🗓️ when set |
| **Crude oil (Brent)** | transport cost; significant + for sugar | all (esp. sugar) | yfinance `BZ=F` (daily) / WB Pink Sheet (monthly) | daily | ✅ |
| **CPI / money supply (M2)** | demand-side macro / inflation | all | PBS (`pbs.gov.pk`) CPI; SBP EasyData M2 | monthly | ⚠️ (~2–4 wk publication lag) |

## Fertilizers

| Factor | What / why | Source | Freq | Avail@predict |
|---|---|---|---|---|
| **Urea + DAP prices** | input cost → price (planting-season lag) | **WB Pink Sheet** (DAP, urea — global) + NFDC/NFML (domestic) | monthly | ✅ |

## Policy & government interventions

| Factor | What / why | Source | Form |
|---|---|---|---|
| **Policy event calendar** | export bans, procurement, price caps, MSP-regime, IMF, bulk import | **`ml/external/policy_events.csv`** (hand-curated this session) + FAO FPMA + USDA FAS + Global Trade Alert | events → time-aligned flags (`wheat_export_ban`, `msp_regime`, `msp_value`, `intervention_price`, …) |
| **Trade volumes** (import/export) | quantifies bulk import/export | PBS trade stats / UN Comtrade / FAO | monthly numeric |
| **Scenario analysis** | surprise bans can't be predicted → simulate "what if" | derived from above | on-demand |

## Tier 3 — deferred (higher effort / later)

| Factor | Why deferred | Source |
|---|---|---|
| **NDVI / satellite vegetation** | strong yield signal but needs Earth Engine pipeline | Google Earth Engine (MODIS/Sentinel) |
| **FAO Food Price Index** | nice macro add-on | FAO (monthly CSV) |
| **News sentiment (NLP)** | big build; captures shocks/policy text | news scrape + NLP |

---

## Key modeling notes
- **MSP regime break:** MSP valid 2009–2024, abolished (IMF), reinstated 2025 (Rs3,500/40kg), deregulating 2026 → carry a `msp_regime` flag so the model handles the structural break.
- **Availability at prediction time:** FX, world prices, oil = known daily ✅. Weather ⚠️ (lagged/seasonal, or feed a forecast). MSP/policy = scheduled ones known 🗓️; surprise bans → scenario analysis.
- **One source covers a lot:** WB Pink Sheet = world wheat/rice/maize/cotton/sugar + DAP/urea + crude oil, monthly, free. yfinance adds daily recency.
- **Lags matter:** weather and fertilizer act on price months later (planting→harvest) — engineer lagged/seasonal versions, not same-day.

## Status
- ✅ Factor set locked; sources identified; policy calendar collected (`policy_events.csv`).
- ⬜ Build collectors (NASA POWER, WB Pink Sheet, yfinance, SBP, AMIS MSP) → join onto panel in Phase 3.
