# ML Handoff — FarmKonnect

This file summarizes the ML artifacts, how to run training, backtests, prediction, and monitoring.

Artifacts
- `ml/training/data/features.parquet` — cleaned, weekly panel with deterministic and external features.
- `ml/training/train_models.py` — baseline LightGBM trainer with time-series CV. Writes models to `ml/training/models/`.
- `ml/training/backtest.py` — rolling-origin backtesting, writes `backtest_reports`.
- `ml/training/ensemble.py` — builds mean and stacking ensembles and saves artifacts to `ml/training/ensemble_models/`.
- `ml/training/predict_and_push.py` — generates short-horizon forecasts and upserts into MongoDB `priceforecasts` collection.
- `ml/training/monitor.py` — computes accuracy and drift, writes reports to `ml_monitoring`, and enqueues retrain jobs in `ml_jobs`.
- `ml/training/retrain_worker.py` — polls `ml_jobs` for retrain jobs and runs `train_models.py`.

Quick run
1. Install deps:
```
pip install -r ml/training/requirements.txt
```
2. Train (local):
```
python ml/training/train_models.py --features ml/training/data/features.parquet
```
3. Backtest:
```
python ml/training/backtest.py --features ml/training/data/features.parquet
```
4. Ensemble:
```
python ml/training/ensemble.py --features ml/training/data/features.parquet
```
5. Predict & push (set `MONGODB_URI`):
```
export MONGODB_URI="your-uri"
python ml/training/predict_and_push.py --features ml/training/data/features.parquet
```
6. Monitor & retrain:
```
python ml/training/monitor.py --features ml/training/data/features.parquet
python ml/training/retrain_worker.py
```

Notes
- The prediction push expects `ensemble_models` artifacts; if not present, `predict_and_push.py` falls back to mean ensemble.
- The retrain worker runs `train_models.py` as a subprocess and records run output in MongoDB collection `ml_job_runs`.
