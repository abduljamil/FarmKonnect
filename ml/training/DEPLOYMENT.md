# ML Deployment

This file describes how to run the ML prediction and worker services locally using Docker Compose, and how images are built in CI.

Running locally with Docker Compose

1. Build or pull the image. If you want to use the locally-built image:

```bash
docker-compose -f docker-compose.ml.yml up --build
```

2. Or run with an image from your registry (set `ML_IMAGE`):

```bash
export MONGODB_URI="your-mongo-uri"
export ML_IMAGE="your-registry/your-repo:ml-latest"
docker-compose -f docker-compose.ml.yml up -d
```

CI image build

The repository contains a GitHub Actions workflow at `.github/workflows/build-and-push-ml.yml` which builds and pushes the image to your registry. Provide these secrets in the repository settings:
- `DOCKER_REGISTRY` (e.g. `ghcr.io`)
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `DOCKER_REPO` (e.g. `org/farmkonnect-ml`)

Notes
- The Compose file mounts `ml/training/data` and `ml/training/ensemble_models` — ensure these are available in the deployment environment or place them in a shared volume.
- Use container restart policies and logs aggregation in production (e.g., use `docker service` or k8s for resilience).
