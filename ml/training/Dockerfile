FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . /app
CMD ["python", "predict_and_push.py", "--features", "ml/training/data/features.parquet", "--ensemble", "ml/training/ensemble_models", "--horizon", "4"]
