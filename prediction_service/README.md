# prediction_service — Phase 8

Weekly cron container that produces price forecasts and upserts them into the
Atlas `pricepredictions` collection. Consumed by the backend `/api/prices/forecast`
route (Phase 9) and the frontend chart (Phase 10).

## How it works

A long-running container ticks hourly:

1. Read `router_config.json` + the four `lgbm_h{1,2,4,12}.joblib` bundles into memory at startup.
2. On each tick, check Atlas: has a prediction with `forecast_date == this_week_friday` already been written? If yes, sleep an hour and re-check.
3. If no, run one prediction cycle:
   - Re-run the Phase 2+3+5 pipeline (`build_panel` → external collectors → `build_features` → `build_lagged`) so the feature frame reflects today's data. **We deliberately reuse the same scripts the training pipeline uses** — see PLAN.md (decision 2026-06-03, "mirror exactly").
   - For each `(commodity, variety, city)` series, take the last valid row.
   - For each horizon `h ∈ {1, 2, 4, 12}`, look up `cells["{commodity}__h{h}"].model` from the router and dispatch:
     - `persistence` → `y_pred = price`
     - `ma4` → `y_pred = price_lag1_ma4`
     - `lgbm` → `y_pred = price * (1 + model_h.predict(feature_vector))`
   - Upsert each `(commodity, variety, city, forecast_date, horizon_weeks)` row into `pricepredictions` with `expected_mape` attached from the router for uncertainty-band rendering.
4. On the first run only, also backfill the last 12 weeks of historical predictions so the chart has context.

## Directory layout inside the image

```
/app/
  ml/training/                  ← shared pipeline code copied from repo at build
    build_panel.py, build_features.py, collectors/, features/
    router/router_config.json
    models/lgbm_h{1,2,4,12}.joblib
  ml/external/policy_events.csv
  prediction_service/
    predict_and_upsert.py       ← core prediction logic (--mode live | backfill)
    run_loop.py                 ← scheduler (container entrypoint)
    monitor.py                  ← Phase 12 rolling-MAPE monitoring (per tick)
/work/
  data/                         ← ephemeral; pipeline writes panel/features here
    external/                   ← WB/yfinance/NASA caches (warm across runs in same container lifetime)
```

## Env vars

- `MONGODB_URI` — from `backend/.env` via docker-compose `env_file`
- `WORK_DIR` — pipeline workspace (default `/work`)
- `PREDICTION_COLLECTION` — Atlas collection to upsert into (default `pricepredictions`)
- `MONITORING_COLLECTION` — Atlas collection for rolling-MAPE summaries (default `prediction_monitoring`)
- `RUN_INTERVAL_SECONDS` — scheduler tick (default `3600`)
- `MONITOR_WINDOW_WEEKS` — rolling MAPE window (default `4`)
- `MONITOR_ALARM_MULTIPLIER` — alarm if rolling MAPE > expected_mape × this (default `1.5`)

## Manual one-shot runs

The scheduler runs `predict_and_upsert.py` automatically. To invoke it
yourself (e.g. after a router rebuild, to re-seed deeper history, or to
debug):

```bash
# inside the running container
docker exec -it farmkonnect_prediction_service_1 \
    python /app/prediction_service/predict_and_upsert.py --mode live

# backfill a custom depth
docker exec -it farmkonnect_prediction_service_1 \
    python /app/prediction_service/predict_and_upsert.py --mode backfill --backfill-weeks 26

# skip the pipeline (reuse cached /work/data/features_lagged.parquet)
docker exec -it farmkonnect_prediction_service_1 \
    python /app/prediction_service/predict_and_upsert.py --mode live --skip-pipeline
```

Or build + run from the repo root standalone (no compose):

```bash
docker build -f prediction_service/Dockerfile -t fk-pred .
docker run --rm -e MONGODB_URI="$MONGODB_URI" \
    fk-pred python /app/prediction_service/predict_and_upsert.py --mode live
```

## Cadence

Weekly, Friday after W-FRI panel close. The hourly tick + Atlas marker pattern
ensures we don't double-write on container restarts and don't miss a week if
the container was down on Friday — the next tick after recovery catches up.
