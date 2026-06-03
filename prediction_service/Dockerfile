FROM python:3.11-slim

# libgomp1: required at runtime by LightGBM (OpenMP)
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Python deps (cached layer; only rebuilds when requirements.txt changes) ---
COPY prediction_service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# --- Shared ML pipeline code (Phase 2/3/5 — re-run weekly so features stay fresh) ---
COPY ml/training/build_panel.py ml/training/build_features.py /app/ml/training/
COPY ml/training/collectors/ /app/ml/training/collectors/
COPY ml/training/features/   /app/ml/training/features/

# --- ML artifacts: router config + trained model bundles ---
COPY ml/training/router/router_config.json /app/ml/training/router/
COPY ml/training/models/lgbm_h1.joblib  /app/ml/training/models/
COPY ml/training/models/lgbm_h2.joblib  /app/ml/training/models/
COPY ml/training/models/lgbm_h4.joblib  /app/ml/training/models/
COPY ml/training/models/lgbm_h12.joblib /app/ml/training/models/

# --- Reference data used by build_deterministic.py ---
COPY ml/external/policy_events.csv /app/ml/external/

# --- Prediction service source ---
COPY prediction_service/ /app/prediction_service/

# Writable workspace for the weekly pipeline run (panel/features/external caches)
RUN mkdir -p /work/data/external
ENV WORK_DIR=/work
ENV PYTHONUNBUFFERED=1

CMD ["python", "/app/prediction_service/run_loop.py"]
