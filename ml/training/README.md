# ML training quickstart

Run the baseline training script with:

```bash
python ml/training/train_models.py --features ml/training/data/features.parquet
```

Outputs are written to `ml/training/models/` by default and include:
- `cv_metrics.csv` — per-fold and overall CV metrics
- `oof_predictions.parquet` — out-of-fold predictions
- `lgbm_full.joblib` — final model artifact
- `run_report.csv` — short run metadata
