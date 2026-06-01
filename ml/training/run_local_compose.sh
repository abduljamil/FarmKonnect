#!/usr/bin/env bash
# Helper to run local test stack for ML services
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd -P)
cd "$ROOT_DIR" || exit 1

export $(cat .env.example | xargs)

echo "Starting local MongoDB container..."
docker run -d --name ml_test_mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=farmkonnect_ml mongo:6

echo "Bringing up ML services via docker-compose..."
docker compose -f ../../docker-compose.ml.yml up --build ml_predict retrain_worker
