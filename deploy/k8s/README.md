Kubernetes manifests for ML services

Files:
- `ml-predict-cronjob.yaml` - CronJob to run `predict_and_push.py` on schedule
- `retrain-worker-deployment.yaml` - Deployment for the retrain worker

Replace `IMAGE` with your published ML image (e.g. `ghcr.io/<owner>/FarmKonnect:ml-latest`).

Apply with:
```bash
# set context/namespace as needed
kubectl apply -f ml-predict-cronjob.yaml
kubectl apply -f retrain-worker-deployment.yaml
```
