# Monthly Retrain Playbook

> Phase 12.B — manual for now. Automation later if the team wants it.

## When to retrain

Two triggers:

1. **Calendar:** monthly, regardless of metrics. Catches slow drift.
2. **Alarm:** any cell in `prediction_monitoring` (Phase 12) has stayed
   `drift_alarm: true` for ≥2 consecutive weeks. Check with:
   ```bash
   ssh ubuntu@13.205.25.250 \
     'cd ~/FarmKonnect && URI=$(grep -E "^MONGODB_URI=" backend/.env | head -1 | sed -E "s/^MONGODB_URI=//; s/^\"//; s/\"$//") && \
      sudo docker run --rm --network host mongo:7 mongosh "$URI" --quiet --eval "
        db.prediction_monitoring.find({drift_alarm:true}).sort({computed_at_week:-1}).limit(20).toArray()
      "'
   ```

The Phase 12 monitor logs `[ALARM]` lines on every tick when a cell breaches
its threshold — also visible in `docker logs farmkonnect_prediction_service_1`.

## What "retrain" means here

Only the LightGBM weights are stale-able: the **router config + the joblib
bundles**. Persistence and ma4 are formulas, not learned. Features and the
pipeline scripts are independent of retraining — they regenerate weekly
automatically inside `prediction_service`.

A retrain produces fresh versions of:
- `ml/training/models/lgbm_h{1,2,4,12}.joblib` (global mean LGBM)
- `ml/training/models/lgbm_{wheat,paddy,seed_cotton_phutti}_h{1,2,4,12}.joblib` (specialists)
- `ml/training/models/lgbm_h12_q{10,50,90}.joblib` (quantile bundles)
- `ml/training/models/metrics.csv`, `lgbm_per_commodity_metrics.csv`,
  `lgbm_quantile_metrics.csv` (used by the router)
- `ml/training/router/router_config.json` (rebuilt from the new metrics)

## Procedure

### 1. Pull a fresh `features_lagged.parquet` from EC2

The prediction service rebuilds `features_lagged.parquet` on every weekly
predict cycle, so the latest copy is sitting inside the container:

```bash
ssh -i farmkonnect-key.pem ubuntu@13.205.25.250 \
  'sudo docker cp farmkonnect_prediction_service_1:/work/data/features_lagged.parquet /tmp/features_lagged.parquet'
scp ubuntu@13.205.25.250:/tmp/features_lagged.parquet ml/training/data/features_lagged.parquet
```

Also pull the supporting parquets so the router has matching anchors:

```bash
ssh ... 'sudo docker cp farmkonnect_prediction_service_1:/work/data/panel.parquet /tmp/'
ssh ... 'sudo docker cp farmkonnect_prediction_service_1:/work/data/features.parquet /tmp/'
scp ubuntu@13.205.25.250:/tmp/{panel,features}.parquet ml/training/data/
```

### 2. Retrain locally (laptop, ~10 min on CPU)

Requires: `pip install lightgbm scikit-learn pandas pyarrow joblib hijridate`
(plus `botocore>=1.34` on Python 3.13; see HANDOFF.md gotchas).

```bash
# Baselines (cheap, deterministic — re-run for fresh metrics CSV)
python ml/training/baselines/run_baselines.py \
    --in ml/training/data/features_lagged.parquet \
    --out-dir ml/training/baselines

# Global LGBM (one model per horizon, honest val split — Phase 6.5)
python ml/training/models/train_lgbm.py \
    --in ml/training/data/features_lagged.parquet \
    --out-dir ml/training/models \
    --baselines ml/training/baselines/baseline_metrics.csv

# Per-commodity specialists for Wheat / Paddy / Seed Cotton
python ml/training/models/train_lgbm_per_commodity.py

# Quantile LGBM at h=12 (q=0.1, 0.5, 0.9)
python ml/training/models/train_lgbm_quantile.py
```

### 3. Rebuild the router

```bash
python ml/training/router/build_router.py
```

Inspect `ml/training/router/router_summary.csv` — confirm any cell changes
make sense (e.g., if Wheat h=12 flips from `lgbm_per_commodity` back to
`persistence` because the specialist edge collapsed, that's the model
telling you the regime changed).

### 4. Commit + push

```bash
git add ml/training/baselines/baseline_metrics.csv \
        ml/training/models/lgbm_*.joblib \
        ml/training/models/metrics.csv \
        ml/training/models/lgbm_per_commodity_metrics.csv \
        ml/training/models/lgbm_quantile_metrics.csv \
        ml/training/models/predictions.parquet \
        ml/training/models/run_meta.json \
        ml/training/models/vs_baselines.csv \
        ml/training/router/router_config.json \
        ml/training/router/router_summary.csv

git commit -m "ml: monthly retrain — refresh LGBM weights + router

Old router winners: <paste from previous router_summary>
New router winners: <paste from new router_summary>
Headline weighted MAPE: <old> → <new>"

git push origin main
```

The deploy auto-rebuilds the `prediction_service` container with the new
joblib bundles (since the Dockerfile COPYs them in at build time). On the
next predict cycle (or container restart) the new router is loaded and
applied.

### 5. Wipe `pricepredictions` if cells changed

If the router decisions changed (e.g., a cell moved from `lgbm` to
`persistence`), the existing prediction docs are stale. Force a fresh
backfill:

```bash
ssh ubuntu@13.205.25.250 \
  'cd ~/FarmKonnect && URI=$(grep -E "^MONGODB_URI=" backend/.env | head -1 | sed -E "s/^MONGODB_URI=//; s/^\"//; s/\"$//") && \
   sudo docker run --rm --network host mongo:7 mongosh "$URI" --quiet --eval "db.pricepredictions.drop()" && \
   sudo docker restart farmkonnect_prediction_service_1'
```

Watch `docker logs farmkonnect_prediction_service_1` — the scheduler will
detect the empty collection and run a 12-week backfill within a minute.

### 6. Verify

```bash
# new router decisions visible to the API
curl -s "https://www.farmkonnect.app/api/prices/forecast?commodity=Wheat&city=Faisalabad&horizon_weeks=12" \
  | jq '.data[-1] | {model, predicted_price, expected_mape}'

# monitoring picks up new docs naturally on the next tick
sleep 90
ssh ubuntu@13.205.25.250 'sudo docker logs --tail 30 farmkonnect_prediction_service_1'
```

## When NOT to retrain

- Single bad week of MAPE on one cell — wait 2 more weeks to confirm it's
  not noise.
- During an active MSP / export-ban policy change — the model will see the
  shock as drift; retrain *after* the new regime stabilizes (4-8 weeks),
  not during the transition.
- If `chronos_metrics.csv` ever beats persistence on a fair-anchor-set
  comparison (it doesn't right now), DON'T add Chronos to the router
  blindly — re-read `ROUTER.md § Negative result` and apply the fair-
  comparison rule.

## Future automation

Two clean options if the manual flow becomes annoying:

1. **GitHub Action on cron** that SSHs to EC2, runs the retrain steps inside
   the prediction_service container, commits the new joblibs back. ~1 day
   of work, needs a deploy-key with write access.
2. **Colab T4 notebook** — same steps, but Colab pulls features from
   EC2/Atlas, retrains (faster on GPU for LGBM with many estimators),
   commits via PyGithub. Free, but requires a session to be live monthly.

Neither is built. The manual flow above takes ~30 min once a month, which
is cheap compared to the risk of an automated retrain shipping a regression.
