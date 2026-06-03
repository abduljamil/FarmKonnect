"""Phase 6.5 — zero-shot forecasting with Amazon Chronos.

Evaluates the chronos-t5-small foundation model on the same recent-year
walk-forward holdout that LightGBM was scored on, so the numbers compare
apples-to-apples in the Phase 7 router.

For each (commodity, variety, city) series:
- Drop NaN prices, sort by date.
- Walk forward through the last `--test-weeks` valid observations (default 52),
  using each as an anchor T. At each T:
    * Take the last `--context` valid prices (default 104 = 2 years) as context.
    * Ask Chronos for a `max(HORIZONS)`-step probabilistic forecast.
    * Use the median across `--num-samples` samples (default 20) as the point
      forecast for each horizon h ∈ {1, 2, 4, 12}.
- Predictions and the matched targets are accumulated.

Output:
- `chronos_predictions.parquet` — long table: commodity, variety, city,
  anchor_date, horizon, y_true, y_pred. Same shape conventions as the LGBM
  `predictions.parquet` so router code can grow to compare.
- `chronos_metrics.csv` — per-horizon overall + per-commodity MAE / RMSE / MAPE,
  in the same schema as `models/metrics.csv` so build_router.py can ingest it
  directly.

Usage:
    python run_chronos.py --in ml/training/data/features_lagged.parquet \
                          --out-dir ml/training/models \
                          --test-weeks 52 --context 104 --num-samples 20
"""
from __future__ import annotations

import argparse
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import torch

warnings.filterwarnings("ignore")
from chronos import ChronosPipeline  # noqa: E402

GROUP_COLS = ["commodity", "variety", "city"]
HORIZONS = [1, 2, 4, 12]
MAX_HORIZON = max(HORIZONS)
MIN_CONTEXT = 26  # 6 months — minimum history before we'll attempt prediction
BATCH = 32        # benchmarked sweet spot on chronos-t5-small CPU


def _log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mask = ~(pd.isna(y_true) | pd.isna(y_pred))
    if not mask.any():
        return {"mae": np.nan, "rmse": np.nan, "mape": np.nan, "n": 0}
    yt = y_true[mask].astype(float)
    yp = y_pred[mask].astype(float)
    err = yt - yp
    mae = float(np.abs(err).mean())
    rmse = float(np.sqrt((err ** 2).mean()))
    nz = yt != 0
    mape = float(np.abs(err[nz] / yt[nz]).mean() * 100) if nz.any() else np.nan
    return {"mae": mae, "rmse": rmse, "mape": mape, "n": int(mask.sum())}


def _predict_series(
    pipe: ChronosPipeline,
    prices: np.ndarray,
    test_weeks: int,
    context_len: int,
    num_samples: int,
) -> tuple[list[int], np.ndarray]:
    """Walk-forward Chronos over the last `test_weeks` of one series.

    Returns
    -------
    anchors : list[int]
        Indices into `prices` of the anchor weeks T.
    forecasts : ndarray of shape (len(anchors), MAX_HORIZON)
        Median forecast for each anchor.
    """
    n = len(prices)
    # We need anchor T such that T..T-MAX_HORIZON+1 are valid actuals to score
    # AND T-MIN_CONTEXT..T-1 are valid history to forecast from.
    test_start = max(MIN_CONTEXT, n - test_weeks - MAX_HORIZON)
    test_end = n - MAX_HORIZON  # exclusive
    anchors = list(range(test_start, test_end))
    if not anchors:
        return [], np.empty((0, MAX_HORIZON))

    contexts = [
        torch.tensor(prices[max(0, t - context_len):t].astype("float32"))
        for t in anchors
    ]

    out = []
    for i in range(0, len(contexts), BATCH):
        chunk = contexts[i:i + BATCH]
        fc = pipe.predict(chunk, prediction_length=MAX_HORIZON, num_samples=num_samples)
        # fc shape: (batch, num_samples, MAX_HORIZON) → median over samples → (batch, MAX_HORIZON)
        median = fc.median(dim=1).values.numpy()
        out.append(median)
    forecasts = np.concatenate(out, axis=0)
    return anchors, forecasts


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="ml/training/data/features_lagged.parquet")
    ap.add_argument("--out-dir", default="ml/training/models")
    ap.add_argument("--model", default="amazon/chronos-t5-small")
    ap.add_argument("--test-weeks", type=int, default=52)
    ap.add_argument("--context", type=int, default=104)
    ap.add_argument("--num-samples", type=int, default=20)
    ap.add_argument("--limit-series", type=int, default=0,
                    help="for smoke tests; 0 = all series")
    args = ap.parse_args(argv)

    in_path = Path(args.in_path)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    _log(f"Loading {args.model} (CPU)")
    pipe = ChronosPipeline.from_pretrained(
        args.model,
        device_map="cpu",
        torch_dtype=torch.float32,
    )
    _log("Model loaded")

    df = pd.read_parquet(in_path)
    df = df.sort_values(GROUP_COLS + ["date"]).reset_index(drop=True)
    n_series = df.groupby(GROUP_COLS, dropna=False).ngroups
    _log(f"Read {len(df):,} rows · {n_series} series from {in_path}")

    series_groups = list(df.groupby(GROUP_COLS, dropna=False, sort=False))
    if args.limit_series > 0:
        series_groups = series_groups[:args.limit_series]
        _log(f"Limiting to first {len(series_groups)} series for smoke test")

    pred_rows: list[dict] = []
    t_global = time.time()
    skipped = 0
    for i, (key, sub) in enumerate(series_groups, 1):
        commodity, variety, city = key
        sub = sub[sub.price.notna()].sort_values("date").reset_index(drop=True)
        prices = sub.price.values
        dates = sub.date.values

        if len(prices) < MIN_CONTEXT + MAX_HORIZON:
            skipped += 1
            continue

        anchors, forecasts = _predict_series(
            pipe, prices, args.test_weeks, args.context, args.num_samples
        )

        for j, t in enumerate(anchors):
            for h in HORIZONS:
                pred_rows.append({
                    "commodity":   commodity,
                    "variety":     variety,
                    "city":        city,
                    "anchor_date": pd.Timestamp(dates[t - 1]),
                    "horizon":     h,
                    "y_true":      float(prices[t + h - 1]),
                    "y_pred":      float(forecasts[j, h - 1]),
                })

        if i % 10 == 0 or i == len(series_groups):
            elapsed = time.time() - t_global
            rate = i / elapsed
            eta = (len(series_groups) - i) / rate if rate > 0 else 0
            _log(f"  {i}/{len(series_groups)} series done · "
                 f"{elapsed:.0f}s elapsed · ~{eta:.0f}s remaining · "
                 f"{len(pred_rows):,} predictions so far")

    _log(f"Inference complete. Skipped {skipped} sparse series. Total: {len(pred_rows):,} predictions.")

    pred_df = pd.DataFrame(pred_rows)
    pred_path = out_dir / "chronos_predictions.parquet"
    pred_df.to_parquet(pred_path, index=False)
    _log(f"Predictions -> {pred_path}")

    # Metrics: per (horizon) overall + per (horizon, commodity)
    metric_rows: list[dict] = []
    for h in HORIZONS:
        sub = pred_df[pred_df.horizon == h]
        m = _metrics(sub.y_true.values, sub.y_pred.values)
        m.update({"horizon": h, "commodity": "ALL"})
        metric_rows.append(m)
        for commodity, csub in sub.groupby("commodity", sort=True):
            cm = _metrics(csub.y_true.values, csub.y_pred.values)
            cm.update({"horizon": h, "commodity": commodity})
            metric_rows.append(cm)

    metrics_df = pd.DataFrame(metric_rows)
    metrics_path = out_dir / "chronos_metrics.csv"
    metrics_df.to_csv(metrics_path, index=False)
    _log(f"Metrics -> {metrics_path}")

    print()
    print("=== Chronos — recent-year walk-forward (ALL commodities) ===")
    summary = metrics_df[metrics_df.commodity == "ALL"].set_index("horizon")[["mae", "rmse", "mape", "n"]]
    print(summary.round(3).to_string())

    print()
    print("=== Per-commodity MAPE % at each horizon ===")
    rec = metrics_df[metrics_df.commodity != "ALL"]
    pivot = rec.pivot(index="commodity", columns="horizon", values="mape").round(2)
    print(pivot.to_string())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
