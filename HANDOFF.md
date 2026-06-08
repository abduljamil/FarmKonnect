# FarmKonnect — Session Handoff / Full Context

> **Read this first when starting a new chat.** Self-contained context for the
> FarmKonnect commodity-price platform + the price-forecasting ML system being
> built on top of it. Companion docs: `PLAN.md` (detailed master plan + live
> status board), `ml/external/factors_catalog.md`, `ml/external/policy_events.csv`.
> Last updated: 2026-06-03 (Phases 2-8 DONE + Phase 6.5 accuracy upgrade live:
> panel → external factors → lagged features → naive baselines → global
> LightGBM → router → prediction service. Phase 6.5 fixed the LGBM eval-set
> leak, added per-commodity specialists + quantile median + 12 new features;
> router now picks lgbm_per_commodity for Wheat h=12 (13.8% edge over
> persistence, up from leaky 4.7%) and lgbm_quantile_median for Sugar h=12
> (3.2% edge). Honest weighted MAPE 4.61%. Phase 9 next: Node read route
> `/api/prices/forecast` that reads `pricepredictions`. **Teammate Javeria's
> earlier Phase 4-12 scaffolding was rejected and removed** — see Section 4
> and the Decisions log in PLAN.md for the rationale.)

---

## 1. What this project is

Two tracks that feed each other:
1. **Live app** — FarmKonnect (https://www.farmkonnect.app): an AMIS-Pakistan
   commodity-price marketplace. Backend (Node) + frontend (React/Vite) + a
   Python scraper, all on one EC2 box via docker-compose. Data in MongoDB Atlas.
2. **ML system (~half built)** — forecast commodity prices and serve them in
   the app. Phases 2-7 DONE: panel → external factors → lagged features →
   baselines → global LightGBM → router. Modeling-ready table is
   `features_lagged.parquet` (64,247 × 77). Headline finding: **on AMIS weekly
   prices, persistence is shockingly hard to beat** (1.86% MAPE @ h=1).
   LightGBM only wins at h=12 for the hard series (Wheat, Paddy, Seed Cotton).
   The Phase 7 router locks this in: 21 of 24 cells route to persistence, 3 to
   LightGBM (Wheat / Paddy / Seed Cotton at h=12), weighted MAPE 4.63%.
   **Next: Phase 8** — prediction service container.

Commodities tracked: **Wheat, Rice, Paddy, Maize, Sugar, Seed Cotton (Phutti)**
across 14 Punjab cities, 2009→present.

---

## 2. Access & infrastructure (verified facts)

- **EC2:** `ubuntu@13.205.25.250`, key `C:\Users\ahtsh\OneDrive\Desktop\eth-bot\farmkonnect-key.pem`, app dir `~/FarmKonnect`. Passwordless `sudo`.
- **Local repo:** `C:\Users\ahtsh\OneDrive\Desktop\FarmKonnect-EC2-Backup` — git, branch `main`, remote `github.com/abduljamil/FarmKonnect`.
- **⚠️ Working-dir quirk:** the chat's *primary* cwd is `C:\Users\ahtsh\OneDrive\Desktop\eth-bot` (NOT the repo). Use absolute paths or the `path` param for repo files; `cd` into the repo for git.
- **MongoDB Atlas:** M0 free tier, DB `FarmKonnect`, collection `commodityprices`. `MONGODB_URI` lives in `~/FarmKonnect/backend/.env` on EC2 (and in the backend container env). **Never echo it to chat.** Fetch into a shell var:
  `URI=$(grep -E "^MONGODB_URI=" backend/.env | head -1 | sed -E "s/^MONGODB_URI=//; s/^\"//; s/\"$//")`
- **Deploy:** push to `main` → GitHub Actions **"Deploy to EC2"** (`lint-frontend` then `deploy`, ~70s). `.github/workflows/deploy.yml` **skips deploy if only `mobile/**` or `**/*.md` changed.** Watch with `gh run list`/`gh run watch <id>`.
- **Containers:** `farmkonnect_frontend_1` (80/443), `farmkonnect_backend_1` (:3000), `farmkonnect_scraper_service_1` (:8000), `farmkonnect_certbot_1` (run-and-exit; "Exited" is normal). Backend serves `/api/...`; frontend nginx serves the SPA + proxies `/api`.
- **Site:** https://www.farmkonnect.app — the **/dashboard** page has the price chart (`PriceChart.jsx`), price ticker, and market-trend stat. Guest-viewable.

---

## 3. Current data state (`commodityprices`, ~270k docs)

**Doc shape:**
```js
{ commodity, variety, city, price, priceType:"FQP", unit, date:ISODate, timestamp, lastUpdated, excluded? }
```
- **Canonical units (post-migration):** grains (Wheat/Rice/Paddy/Maize/Cotton) = **`Rs/40Kg (Maund)`**; **Sugar = `Rs/Kg`**. The live scraper already writes these.
- **Commodity + variety model (post-migration):** rice/paddy are unified to the scraper's convention — `commodity:"Rice"` or `"Paddy"` + `variety` ∈ {IRRI, Basmati 385, Basmati Super New, Basmati Super Old, Kainat New} (rice) / {IRRI, Basmati, Kainat} (paddy). Other commodities have `variety:null`. **No more `Rice (IRRI)` style variant-commodities** (they were renamed).
- **`excluded:true`** = hidden from all price queries. **2,493 docs flagged** (non-destructive): 1,920 historical↔live rice overlap dupes (`supersededBy:"live"`) + 33 unit-migration outliers + 540 robust-clean outliers (`outlier:true`). Read endpoints filter `excluded:{$ne:true}`.
- **`date` is mixed type:** mostly `Date`, ~144 legacy string dates. Range queries (`$gte`/`$lte` Date) only match Date-typed docs → string ones are effectively invisible. Coverage/aggregations filter `date:{$type:"date"}`.
- **Indexes:** `_id_`; unique `{commodity,variety,city,date,priceType}`; `{priceType,date,timestamp}` (backs `getLatestPrices` sort). **TTL index was dropped** (we keep full history).
- **Backups (mongodump, on EC2 `~/` + laptop repo dir):** `mongodump-2026-05-20` (pre-everything, 3,470 docs), `mongodump-2026-05-22-preunits` (post-ingest, pre-units, 270,398), `mongodump-2026-05-23-prerice` (pre rice restructure).

---

## 4. DONE

**Phase 0–1 (data + deploy):**
- Scraped 17yr AMIS data → `C:\Users\ahtsh\OneDrive\Desktop\data collection\complete data\*.xlsx`.
- Dropped 90-day TTL; ingested 268k historical rows (→270k docs); deployed; full history serves live.
- Git reconciled with teammate's mobile work (local == origin/main + our commits).

**Production hardening (live):**
- Fixed commodity selector + variety drill-down; time filters 1W/1M/3M/6M/1Y/5Y/All, **data-aware** (only ranges with data show; driven by new `GET /api/prices/coverage`); date-picker bounded to series range.
- Fixed `/api/prices/latest` **500** ("Sort exceeded 32MB") via index `{priceType,date,timestamp}` + `allowDiskUse`. Restored ticker / market-trend / alerts.
- Default city → active market (Faisalabad); guarded empty-data stats (no Rs ±∞).

**Data cleanup (all DONE + deployed):**
- **Unit normalization** → canonical units (`normalizeUnits.py`). Cliff gone.
- **Rice/paddy unification** → commodity+variety, continuous series 2009→today (`restructureRice.py`).
- **Robust outlier clean** → 540 gross errors flagged (`cleanOutliers.py`). Ranges sane.

**Phase 2 — data foundation (DONE 2026-05-25):**
- `ml/training/build_panel.py` → `ml/training/data/panel.parquet`: weekly (W-FRI) FQP price panel for the 6 target commodities, `excluded:{$ne:true}` only, ffill ≤4 wks, winsorized 1/99 pct (keeps `price_raw` + `filled`/`winsorized` flags + `n_obs`). **64,247 rows · 146 series · 2009→2026** (filled 10.1%, winsorized 1.6%). EDA in `ml/training/eda/` (series_summary, coverage_by_year, gaps, commodity_overview, EDA.md, coverage_heatmap.png).
- Coverage uneven: Wheat/Sugar/Maize dense; Rice dense-core + sparse tails; Paddy/Cotton sparse-seasonal; 885 gaps >4 wks → pool sparse series in modeling.

**Phase 3 — external factors (collectors + feature table, DONE 2026-05-26):**
- Collectors (EC2 docker, idempotent, cache to `ml/training/data/external/`): `collectors/fetch_worldbank.py` (WB Pink Sheet monthly: world wheat/rice/maize/cotton/sugar + DAP/urea + Brent; auto-discovers the rotating xlsx URL), `collectors/fetch_yfinance.py` (daily ZW/KE/ZC/CT/SB/BZ futures + PKR=X FX, FX sanitized to [30,500]), `collectors/fetch_nasa_power.py` (14-city daily precip/temp/RH).
- `features/build_deterministic.py`: calendar (Ramadan/Eid via **hijridate**, harvest windows, woy sin/cos) + policy/MSP flags from `policy_events.csv` (msp_regime + msp_value_wheat step series + per-event flags; **aliases** Cotton→Seed Cotton (Phutti), Rice→Rice+Paddy).
- `build_features.py` → **`ml/training/data/features.parquet`** (64,247×66): weather weekly per (city,week), markets weekly-mean, WB monthly as-of-backward (leakage-safe), joined onto the panel; coverage 97-100%; row count asserted unchanged.
- **Leakage:** world/FX/oil known at predict time; weather/markets joined contemporaneously → **must be LAGGED in modeling**. Optional remaining: CPI/M2, sugarcane MSP, trade volumes.

**Phase 5 — lagged feature engineering (DONE 2026-06-02):**
- `ml/training/features/build_lagged.py` → **`ml/training/data/features_lagged.parquet`** (64,247 × 77). Per `(commodity, variety, city)`: own-price lags 1/2/4/8/13 wk; rolling 4/13-wk stats on lag-1 price; **1-wk lag of every `wx_*`/`yf_*`/`wb_*` column** (closes the leakage trap flagged in Phase 3); shifted targets `y_1`, `y_2`, `y_4`, `y_12 = price.shift(-h)`. Drops `price_raw` (the un-winsorized current-week price = target leakage). Verified by 5 sanity checks (lag direction, target direction, cross-series isolation).

**Phase 4 — naive baselines (DONE 2026-06-02):**
- `ml/training/baselines/run_baselines.py` → `baseline_metrics.csv` + `baseline_predictions.parquet` + `BASELINES.md`.
- Three causal baselines per (series, horizon): **persistence** (`y_pred = price[t]`), **seasonal_naive** (`y_pred = price[t+h-52]`), **ma4** (`y_pred = price_lag1_ma4`).
- **Headline (recent-year MAPE %, all commodities): persistence 1.86 / 3.19 / 5.35 / 9.80 at h=1/2/4/12.** Persistence wins 23 of 24 (commodity, horizon) cells; the only exception is Paddy h=12 (ma4 wins by a hair). **Seasonal naive is uniformly bad (~20%)** — Pakistan prices don't repeat year-over-year (MSP regime breaks, PKR inflation, supply shocks).

**Phase 6 — global LightGBM (DONE 2026-06-02):**
- `ml/training/models/train_lgbm.py` → 4 models `lgbm_h{1,2,4,12}.joblib` + `metrics.csv` + `vs_baselines.csv` + `predictions.parquet` + `LGBM.md`.
- **Target is `(y_h − price) / price` (pct change)**, not absolute level. Required because Sugar (Rs/Kg, 30-180) and grains (Rs/40Kg, 600-6,000) live on different scales — a level- or absolute-delta-target global model blows up Sugar (~50% MAPE). Pct-change normalizes everything; persistence reduces to `pct_pred = 0`.
- Categoricals: `commodity`, `variety`, `city`, `unit`, `msp_regime` (native LightGBM categorical splits). 71 features. Train = all weeks before last 52 per series (59,557 rows); test = last 52 weeks (4,690 rows) — matches the baselines "recent_year" scope.
- **Results (recent-year MAPE %): LGBM 2.43 / 4.10 / 6.44 / 10.41 at h=1/2/4/12.** Persistence still wins overall, but LGBM wins **3/6 commodities at h=12**: Wheat (16.18 vs 16.98), Paddy (17.63 vs 18.93), Seed Cotton (8.31 vs 9.65) — the three hardest series.
- **Caveats:** the early-stopping `eval_set` is the test set (mild leak that flatters LGBM); single (train, test) split, no walk-forward yet.

**Phase 6.5 — accuracy upgrade (DONE 2026-06-03, commit `eb7fc83`):**
- **Eval-set leak fixed in train_lgbm.py.** Was: `eval_set=test_set` for early stopping → flattered LGBM MAPE by 1-5%. Now: hold out last 26 wks of train per series as validation, test stays unseen. Honest LGBM MAPE: 2.86/4.80/7.24/11.61 @ h=1/2/4/12 (was 2.43/4.10/6.44/10.41 under leak). **This exposed the Paddy h=12 and Seed Cotton h=12 LGBM "wins" as leak artifacts — they don't actually beat persistence.**
- **Per-commodity LGBM specialists** for the hard 3 (Wheat / Paddy / Seed Cotton) — `ml/training/models/train_lgbm_per_commodity.py` → `lgbm_<slug>_h{1,2,4,12}.joblib`. Wheat h=12: 14.64% vs persistence 16.98% → **13.8% edge** (was 5.0% with the leak; bigger AND honest). Paddy/Seed Cotton h=12 still lose to persistence even with specialist.
- **Quantile LGBM at h=12** — `ml/training/models/train_lgbm_quantile.py` → `lgbm_h12_q{10,50,90}.joblib`. q=0.5 (median) is a candidate; q=0.1/q=0.9 reserved for Phase 10 uncertainty bands (empirical 80% interval coverage 69%, slightly tight). Quantile-median wins Sugar h=12 (7.37 vs persistence 7.62, **3.2% edge**) — neither mean LGBM nor persistence had won this cell before.
- **12 new features**: 3 MSP-derived (`msp_weeks_since_change`, `msp_value_yoy_ratio`, `pol_announcement_window`), 6 cross-commodity (`xc_<commodity>_pct4w`), 3 longer-range price lags (26/39/52 wk). features_lagged.parquet: 77 → 89 cols.
- **Router schema update** — new candidate types `lgbm_per_commodity` and `lgbm_quantile_median`. Final routing: 22 persistence + 1 lgbm_per_commodity (Wheat h=12) + 1 lgbm_quantile_median (Sugar h=12). Weighted MAPE **4.61%** (was 4.63% under leak; estimated true MAPE under the leak was ~4.9%).
- **Prediction service refactor** — `predict_and_upsert.py` now lazy-loads only the joblib bundles the router actually needs. Single `_dispatch_for_horizon()` routes to all 5 model types with batched LGBM calls per (model × commodity) slice. Dockerfile copies 19 joblib bundles (4 global + 12 per-commodity + 3 quantile). Backfill produces identical 6,684 doc count with the new dispatch.

**Phase 8 — prediction service (DONE 2026-06-03, commits `ff78d44` + `7344dd1` + `bab60ee`):**
- New `prediction_service/` Docker container (python:3.11-slim + libgomp1 for LightGBM). Long-running, ticks hourly via `run_loop.py`, runs one prediction cycle per week.
- Cycle: re-runs Phase 2+3+5 pipeline (build_panel → external collectors → build_features → build_lagged) so the feature frame is fresh — mirror-exactly rule applies. For each (commodity, variety, city) takes the last valid row; for each h ∈ {1,2,4,12} dispatches per `router_config.json`'s `cells["{commodity}__h{h}"].model` (persistence / ma4 / lgbm). Reconstructs absolute price via `price * (1 + pct_pred)` for LGBM cells.
- Atlas collection `pricepredictions` (DB `FarmKonnect`). Keys: `(commodity, variety, city, forecast_date, horizon_weeks)` with unique index `series_forecast_unique`. Each doc carries `expected_mape`, `model`, `anchor_date`, `anchor_price`, `router_version`, `generated_at` — `expected_mape` is what Phase 10 will use to render uncertainty bands.
- **Scheduler idempotence:** runs only Saturday-UTC-or-later for the prior W-FRI panel (gives the scraper 24h to ingest Friday's prices). Marker: any doc with `anchor_date >= most_recent_friday(today)`. Restart-safe; missed Fridays self-heal on the next tick.
- **First-run backfill:** 12 weeks. Currently 6,684 docs in `pricepredictions` from 1,671 anchors × 4 horizons across 146 series. By model: 6,119 persistence, 565 lgbm. By commodity (rows): Rice 3,128, Paddy 1,204, Sugar 672, Wheat 672, Maize 624, Seed Cotton 384.
- **`variety: null` for varietyless commodities** (Wheat/Sugar/Maize/Seed Cotton) — matches live `commodityprices`. The Phase 2 panel writes `""` instead, so `predict_and_upsert.py` normalizes to null at write time.
- **Deps quirk:** the pipeline scripts use `df.to_markdown()` for EDA, requires `tabulate`. Added to `prediction_service/requirements.txt`; missing it = `build_panel` exits 1.

**Phase 7 — per-(commodity, horizon) router (DONE 2026-06-03, commit `a258b51`):**
- `ml/training/router/build_router.py` reads `baselines/baseline_metrics.csv` + `models/metrics.csv` (recent_year scope) and emits `router_config.json` keyed by `{commodity}__h{horizon}` (24 cells: 6 commodities × 4 horizons). Same routing decision applies to every (variety, city) under a commodity.
- Selection: lowest MAPE wins, but a non-persistence model must beat persistence by ≥ `--min-edge-pct` (default **1.0%**) — otherwise persistence wins. Defends against shipping a flatter-by-noise winner.
- Result: **3 cells → LightGBM** (Wheat h=12 by 4.7%, Paddy h=12 by 6.9%, Seed Cotton h=12 by 13.9%), **21 cells → persistence**, **0 cells → ma4**. Weighted MAPE (n-weighted across all 24 cells, recent year): **4.63%**.
- The two ~5-7% LGBM edges (Wheat, Paddy) sit inside the early-stopping leak band from Phase 6 (test set used as eval_set, flatters LGBM by ~1-5%); only Seed Cotton's 13.9% is comfortably above. Mitigation lives in Phase 12 monitoring: if a routed LGBM cell stops beating persistence on rolling 4-wk MAPE, rerunning the router with fresh metrics flips it back automatically.
- Artifacts: `router_config.json` (consumed by prediction service), `router_summary.csv` (human-readable per-cell table), `ROUTER.md`.

**Teammate cleanup (DONE 2026-06-02, commit `7a3091d`):**
- Removed 37 files / -1,790 lines of Javeria's earlier Phase 4-12 scaffolding (broken ML pipeline scripts, broken backend admin endpoints, broken k8s manifests, broken GHCR workflow that never built, broken `docker-compose.override.yml` that spawned a useless local mongo). See PLAN.md Decisions log for why. Kept everything from Phases 2-3 intact.
- Also unjammed the deploy (commit `899c64c`): her AdminPanel.jsx ML monitoring block was inserted mid-ternary, which broke ESLint and silently froze all deploys since 2026-06-01.

**ML planning:**
- External-factor set **locked**; sources in `ml/external/factors_catalog.md`.
- Pakistan policy/intervention calendar collected: `ml/external/policy_events.csv` (validated).

---

## 5. LEFT (Phases 10–12)

| Phase | What |
|---|---|
| ~~9. Backend wiring~~ ✅ DONE (`cbe92a3`) | `backend/models/PricePrediction.js` + `getForecast` controller + `GET /api/prices/forecast`. Public route. Params: `commodity` (required), `city`/`variety`/`horizon_weeks` (1/2/4/12)/`since`=YYYY-MM-DD (all optional). variety omitted → null (matches live commodityprices). Returns ordered by forecast_date ASC. |
| ~~10. Frontend + mobile chart~~ ✅ DONE (`fd674f7` + `835fdd9`) | Dashed-orange forecast curve on web (recharts) + mobile (SVG). Picks up from latest historical price. |
| ~~10.5. Real q10/q90 confidence band~~ ✅ DONE (`9274de6`) | Phase 6.5 quantile bundles now load at inference for `lgbm_quantile_median` cells (currently Sugar h=12). Doc gains optional `predicted_price_low/_high`. Chart renders a shaded band via the stacked-Area trick. Other cells fall back to `expected_mape%` band. |
| ~~11. Deploy hardening~~ ✅ DONE (`8041f2b` + `0398183`) | `set -euo pipefail` in deploy.yml's SSH script + repo-root `.dockerignore` (excludes `certbot/`, `mongodump-*/`, EDA artifacts, large prediction parquets). First deploy after this fix immediately caught a real `can't stat certbot/conf/accounts` build error that was previously silent — fixed it. End of manual `docker-compose up -d --build` after every push. |
| ~~12. Rolling-MAPE drift monitoring~~ ✅ DONE (`81d7a1c`) | New `prediction_service/monitor.py` joins `pricepredictions` (past forecast_date) with `panel.parquet`'s actuals to compute rolling 4-wk MAPE per cell. Writes to a new `prediction_monitoring` collection. Logs `[ALARM]` if any cell exceeds `1.5× expected_mape`. Run from `run_loop.py` on every hourly tick after the predict cycle. First production check: 16 cells, **no alarms — all within threshold** (highest: Wheat h=4 at 7.25% vs threshold 11.25%). |
| **12.B. Monthly retrain (manual)** ← NEXT (cadence) | Documented in `ml/RETRAIN.md`. ~30 min/month: scp `features_lagged.parquet` from EC2, retrain LGBMs locally (global + per-commodity + quantile), rerun `build_router.py`, commit + push. Deploy picks up new joblibs on next container build. Wipe `pricepredictions` if router cells changed. |
| **10. Frontend/mobile** | Forecast chart with **uncertainty bands** (need a per-cell σ estimate, e.g. holdout residual std × time scaling) layered on the existing `PriceChart.jsx`. Same for mobile `PriceTrendsScreen.js`. |
| **11. Deploy** | Add prediction container to `docker-compose.yml`, no GHCR — build on EC2 like the other services. Tweak `.github/workflows/deploy.yml` if needed. |
| **12. Monitor + retrain** | Rolling 4-week MAPE per (commodity, horizon); alert if it exceeds 1.5× the baseline floor. Monthly Colab retrain workflow (free T4). |

**Originally planned but deprioritized:** SARIMA (we have persistence as a strong floor; SARIMA rarely beats persistence on weekly admin'd prices), TFT. Add if Phase 7 router shows persistent gaps at h=12 we can't close with LGBM.

**Originally planned but tried and rejected:** Chronos (Amazon foundation model) was evaluated zero-shot 2026-06-03 — `ml/training/models/run_chronos.py`. Overall MAPE worse than persistence at every horizon. On a fair comparison (same anchor set), persistence wins every (commodity, horizon) cell by 1–18%. See `ml/training/router/ROUTER.md` § Negative result, and `chronos_metrics.csv` + `chronos_predictions.parquet` (kept in-tree so the experiment isn't accidentally repeated). Worth revisiting only with chronos-t5-base/large or after fine-tuning on AMIS data.

---

## 6. Key files & artifacts

**Backend (`backend/`):**
- `controllers/priceController.js` — endpoints: `getLatestPrices` (allowDiskUse), `getPriceHistory`, `getAvailableCommodities`, `getAvailableCities`, `getCitiesByFilters`, `getVarietiesByCommodity`, **`getPriceCoverage`** (min/max date). Price-serving + option-list queries filter `excluded:{$ne:true}`. `parseDays` capped at 7300.
- `models/CommodityPrice.js` — schema; declares the 2 active indexes; TTL removed. `autoIndex` is **off** in prod (create indexes manually in Atlas).
- `routes/prices.js` — routes incl. `/coverage`, `/varieties/:commodity`.
- `scripts/` (one-shot data tools, idempotent, **dry-run by default, `--force` to apply**): `dropTtlIndex.js`, `ingestHistoricalPrices.py`, `normalizeUnits.py`, `restructureRice.py`, `cleanOutliers.py`. **`cleanupPrices.js` — DO NOT run** (legacy deletion tool; would wipe historical data; needs `--force`).

**Frontend:** `src/components/PriceChart.jsx` (commodity buttons + variety dropdown + coverage-driven periods), `src/utils/commodities.js` (`getCommodityConfig`, `pickDefaultCity`, `DISPLAY_COMMODITIES`, `PREFERRED_CITIES`). `src/config.js` → `API_URL = VITE_API_URL || "/api"`.

**Scraper:** `scrapper/amis_scraper.py` — `parse_commodity_and_variety()` (splits "Rice (IRRI)"→Rice/IRRI) + `normalize_to_pakistani_units()` (writes canonical units). **It's the live source — don't change without care** ("mirror exactly" rule below).

**ML — Phase 2 (panel):** `ml/training/build_panel.py` → `data/panel.parquet` + `ml/training/eda/*`.
**ML — Phase 3 (external factors):** `ml/training/collectors/{fetch_worldbank,fetch_yfinance,fetch_nasa_power}.py` → `data/external/*.parquet`; `ml/training/features/build_deterministic.py` → `data/features_deterministic.parquet`; `ml/training/build_features.py` → `data/features.parquet` (64,247×66).
**ML — Phase 5 (lagged features):** `ml/training/features/build_lagged.py` → **`data/features_lagged.parquet`** (64,247×77) — modeling input for everything downstream.
**ML — Phase 4 (baselines):** `ml/training/baselines/run_baselines.py` → `baseline_metrics.csv`, `baseline_predictions.parquet`, `BASELINES.md`.
**ML — Phase 6 (LightGBM):** `ml/training/models/train_lgbm.py` → `lgbm_h{1,2,4,12}.joblib`, `metrics.csv`, `vs_baselines.csv`, `predictions.parquet`, `run_meta.json`, `LGBM.md`.
**ML — Phase 7 (router):** `ml/training/router/build_router.py` → **`router_config.json`** (consumed by prediction service), `router_summary.csv`, `ROUTER.md`.
**ML — Phase 8 (prediction service):** `prediction_service/{Dockerfile, requirements.txt, run_loop.py, predict_and_upsert.py, README.md}` + `docker-compose.yml` entry. Container `farmkonnect_prediction_service_1` (no exposed port). Reads `MONGODB_URI` from `backend/.env`. Writes to `FarmKonnect.pricepredictions` in Atlas.
**Specs:** `ml/external/factors_catalog.md`, `ml/external/policy_events.csv`.
**Docs:** `PLAN.md` (master plan + status board; **gitignored**), this `HANDOFF.md` (untracked), `PROJECT_GUIDE.md` (layman explainer; untracked). All three are **local-only / not pushed**.
**Pushed ML commits on `origin/main`:** `12f991d` (Phase 2), `e1bf2f0` (Phase 3), `7a3091d` (Javeria cleanup), `899c64c` (deploy unjam), `9f5fddf` (Phase 5), `b9e7ea4` (Phase 4), `042ccb6` (Phase 6), `a258b51` (Phase 7), `ff78d44` + `7344dd1` + `bab60ee` (Phase 8 + tabulate fix + variety null fix), `64b4fea` (Chronos negative result), `eb7fc83` (Phase 6.5 accuracy upgrade), `cbe92a3` (Phase 9 `/api/prices/forecast` route), `fd674f7` (Phase 10 web chart) + `835fdd9` (Phase 10 mobile chart), `8041f2b` (Phase 11 `set -e` deploy) + `0398183` (`.dockerignore`), `9274de6` (Phase 10.5 quantile bands), `81d7a1c` (Phase 12 monitoring), `28fdeb8` (Phase 12.B retrain playbook).

---

## 7. How to do common operations (exact patterns)

**SSH / read-only Mongo query (URI never echoed):**
```bash
ssh -i "C:/Users/ahtsh/OneDrive/Desktop/eth-bot/farmkonnect-key.pem" -o StrictHostKeyChecking=no ubuntu@13.205.25.250 \
 'cd ~/FarmKonnect && URI=$(grep -E "^MONGODB_URI=" backend/.env | head -1 | sed -E "s/^MONGODB_URI=//; s/^\"//; s/\"$//") && \
  sudo docker run --rm mongo:7 mongosh "$URI" --quiet --eval "db.commodityprices.countDocuments({})"'
```
**Run a migration script on EC2** (faster/stabler than laptop→Atlas): `scp` the script to `~/`, then:
```bash
ssh ... 'cd ~/FarmKonnect && URI=$(grep ...) && \
  sudo docker run --rm --network host -e MONGODB_URI="$URI" -v /home/ubuntu/SCRIPT.py:/s.py:ro \
  python:3.11-slim sh -c "pip install -q pymongo [pandas] && python /s.py [--force]"'
```
**Backup before any mutation:** `mkdir -p ~/dump && chmod 777 ~/dump && sudo docker run --rm --network host -v ~/dump:/dump mongo:7 mongodump --uri "$URI" --collection commodityprices --out /dump --quiet` (then `scp -r` to laptop).
**Deploy:** `git push origin main` → watch `gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`.
**Verify an endpoint:** `curl -s "http://localhost:3000/api/prices/history?commodity=Rice&variety=IRRI&city=Faisalabad&days=7000"` (on EC2).
**Run an ML collector / feature build on EC2** (only `build_panel.py` needs the DB). All artifacts cache under **`~/panelout/`** on EC2: `data/{panel,features,features_deterministic,features_lagged}.parquet`, `data/external/*`, `baselines/*`, `models/lgbm_h*.joblib`. `policy_events.csv` is at `~/policy_events.csv`.
```bash
scp ml/training/.../SCRIPT.py ubuntu@13.205.25.250:~/SCRIPT.py
ssh ... 'sudo docker run --rm -v /home/ubuntu/SCRIPT.py:/s.py:ro -v /home/ubuntu/panelout:/work -w /work \
  python:3.11-slim sh -c "<APT> pip install -q pandas pyarrow numpy <EXTRA> && python /s.py <ARGS>"'
# EXTRA per script:
#   build_panel.py            → pymongo (+ -e MONGODB_URI="$URI")
#   build_deterministic.py    → hijridate (+ mount policy_events.csv, pass --panel/--policy)
#   fetch_worldbank.py        → requests openpyxl
#   fetch_yfinance.py         → yfinance
#   fetch_nasa_power.py       → requests
#   build_lagged.py           → (nothing extra)
#   run_baselines.py          → (nothing extra)
#   train_lgbm.py             → lightgbm joblib scikit-learn — ALSO needs APT: apt-get install -y -qq libgomp1
```
Then pull results back: `scp -r ubuntu@13.205.25.250:panelout/data/... ml/training/data/`.

---

## 8. Conventions & gotchas (important)

- **Mirror exactly / don't sneak changes:** during migrations, replicate the source's conventions (units, commodity+variety) rather than changing the scraper/infra. Ask before infra/DB-structure changes (e.g. adding an index was confirmed with the user first).
- **No permanent deletions:** Claude cannot delete docs. We **flag `excluded:true`** instead (reversible). Dupes/outliers are hidden, not removed.
- **Always dry-run migrations** (`--force` to apply), back up first, verify after via Atlas (don't trust exit codes alone — a `| tail` once masked a crash as "exit 0"). Scripts retry transient Atlas drops.
- **Atlas M0** is shared/slow: throttle bulk writes (500/batch, 200ms), index-back sorts (32MB in-memory sort limit), `allowDiskUse` works on this M0.
- **MSP regime break** (modeling): wheat/sugar support price abolished 2024 → reinstated 2025 (Rs3,500/40kg) → deregulating 2026. Use a `msp_regime` flag; expect a structural break.
- **Coverage gaps:** many city×commodity series have stale/short history (e.g. BahawalNagar wheat ends 2025-11). Plan: model well-covered series + **pool** sparse ones (global model), forward-fill only short gaps.
- **ML collectors run in EC2 docker `python:3.11-slim`** (pip-installed each run). The EC2 pandas is **very new (3.x/4.x)**: string columns use the new `str` dtype, so `df[c].dtype == object` is **False** for them — use `pd.api.types.is_numeric_dtype` instead. `Timestamp.utcnow()` is deprecated (use `Timestamp.now("UTC")`).
- **`hijri-converter` is deprecated → use `hijridate`** (same `Gregorian(y,m,d).to_hijri()` API).
- **yfinance `PKR=X` (USD/PKR) emits bad ticks** (e.g. 2.0, 84020) — sanitized to a plausible band [30,500]; other tickers were clean.
- **World Bank Pink Sheet xlsx URL rotates** (doc-id per release) — `fetch_worldbank.py` auto-discovers it from the commodity-markets page (with hardcoded fallbacks).
- **Feature leakage:** in `features.parquet`, world/FX/oil are known at predict time, but **weather + market columns are joined contemporaneously → LAG them before modeling**. `features_lagged.parquet` already does this (`wx_*_lag1`, `yf_*_lag1`, `wb_*_lag1`); also drops `price_raw` (which would leak the un-winsorized current price into the model).
- **LightGBM + `python:3.11-slim`** needs `libgomp1` (OpenMP runtime); add `apt-get install -y -qq libgomp1` to the docker bootstrap line, otherwise `import lightgbm` fails with `libgomp.so.1: cannot open shared object file`.
- **Modeling target on weekly admin'd prices: use pct-change, not absolute level.** AMIS quoted prices span Rs 30 (Sugar/Kg) to Rs 6,000+ (Wheat/40Kg) — a global model on absolute target weights the high-price rows in loss and over-predicts Sugar's movements 5-10×. Predict `(y_h − price) / price`, reconstruct `y_h_pred = price * (1 + pct_pred)`.
- **Persistence is the right baseline for short horizons.** At h ≤ 4 wk, "next week's price = this week's price" beats every learned model we've tried (LGBM, MA4). AMIS prices are sticky; the optimal action is often "no change". Only at h=12 does LGBM start winning, and only on the hard series (Wheat, Paddy, Seed Cotton). Don't over-engineer at short horizons.
- **Glob tool quirk on this repo:** `dir/*` and `dir/**/*` patterns (with the `path` param) returned nothing even when files existed; `**/<filename>` worked. Use a direct listing (PowerShell `Get-ChildItem`) to map directories.
- **Don't run `cleanupPrices.js`.**
- ~~`.github/workflows/deploy.yml` swallows `docker-compose up` failures~~ — **Fixed in Phase 11 (`8041f2b`).** The SSH script now has `set -euo pipefail`. A failing `docker-compose up -d --build` (or anything else) makes the deploy step go red. Repo-root `.dockerignore` (`0398183`) also excludes `certbot/`, `mongodump-*`, etc. from the prediction_service build context — that combination was the source of the earlier "build context can't stat" failures.
- **`build_panel.py` requires `tabulate`** (`df.to_markdown()` for EDA). It's in `prediction_service/requirements.txt`; add it to any other env that runs the pipeline.
- **`variety` is `""` in `panel.parquet`/`features_lagged.parquet` for varietyless commodities** (Wheat/Sugar/Maize/Seed Cotton), but `null` in the live `commodityprices` collection. Normalize `"" → None` at any read/write boundary that interacts with live data — `predict_and_upsert.py` does this.
- **Phase 8 prediction container is on EC2 as `farmkonnect_prediction_service_1`.** Logs: `sudo docker logs farmkonnect_prediction_service_1`. Manual one-shot: `sudo docker exec farmkonnect_prediction_service_1 python /app/prediction_service/predict_and_upsert.py --mode live`. To force a backfill rerun: drop `pricepredictions` in Atlas then `sudo docker restart farmkonnect_prediction_service_1`.
- **Phase 12 monitor runs on every tick** (cheap; no LGBM inference). To inspect drift: `db.prediction_monitoring.find({drift_alarm:true}).sort({computed_at_week:-1})`. Manual: `sudo docker exec farmkonnect_prediction_service_1 python /app/prediction_service/monitor.py --window-weeks 4`.
- **Monthly retrain procedure**: see `ml/RETRAIN.md`. Only LGBM weights need retraining; features regenerate weekly inside the prediction service automatically.

---

## 9. Open decisions / recommended next step

- **Outliers:** handled (DB flagging + per-series 1/99 winsorize in panel; 1.6% of weekly rows clipped).
- **Coverage threshold + pooling:** answered de-facto by Phase 6 → we pool globally with `(commodity, variety, city)` as native LightGBM categoricals. Works fine on dense series; sparse series get NaN targets at horizon-end which the model handles.
- **Walk-forward CV vs single split:** Phase 6 used a single 52-wk holdout (matches Phase 4 scope so numbers compare directly). Walk-forward across multiple years is a follow-up if Phase 7 shows the LGBM h=12 wins aren't stable year-to-year.
- **Forecast horizons (this replaces the original "1/7/30 day" plan):** weekly panel → realistic horizons are **1, 2, 4, 12 weeks**. Already baked into baselines + LGBM + targets.
- **MSP regime break (open):** wheat support abolished 2024 → reinstated 2025 → deregulating 2026. We feed the `msp_regime` flag as a feature; LGBM beats persistence on Wheat at h=12, suggesting the flag is doing useful work. Watch this when Phase 12 monitoring rolls in.

**Recommended next: Phase 11 deploy hardening + Phase 12 monitoring.** Phase 10 chart is live. Phase 11 is one tiny fix (add `set -e` to deploy.yml's SSH script) plus optionally promoting the prediction container to its own service with proper restart-policy testing. Phase 12 (monitoring + monthly retrain) is the bigger unblock: track rolling 4-wk MAPE per cell live; alert if any cell exceeds 1.5× its router-recorded `expected_mape`; monthly Colab T4 retrain pulls fresh `features_lagged.parquet`, reruns the train pipeline, rebuilds the router config, commits new joblib bundles. Without Phase 12 we won't know whether Wheat h=12's specialist edge stays at 13.8% under the 2026 MSP-deregulation regime.
