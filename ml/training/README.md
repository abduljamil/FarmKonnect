# ML Training Service

Run and test the ML prediction and retrain worker locally using Docker Compose.

Quick start (build and run):

```bash
# build and push via GH Actions (or use local build)
docker compose -f ../../docker-compose.ml.yml up --build
```

Environment variables (see `.env.example`):
- `MONGODB_URI` - MongoDB connection string (e.g. `mongodb://mongo:27017/farmkonnect_ml`)
- `ML_IMAGE` - Optional image name to pull instead of building locally (e.g. `ghcr.io/owner/repo:ml-latest`)

Local test (start Mongo + services):

```bash
# in project root
docker compose -f docker-compose.ml.yml up --build mongo
# then in another shell
docker compose -f docker-compose.ml.yml up --build ml_predict retrain_worker
```

Notes:
- The GitHub Actions workflow `.github/workflows/build-and-push-ml.yml` publishes to GHCR.
- Ensure Actions & Packages permissions are enabled in repository settings to allow package publish.
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
