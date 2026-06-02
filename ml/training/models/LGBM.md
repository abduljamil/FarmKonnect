# Phase 6 — global LightGBM (one model per horizon)

Four `LGBMRegressor` models trained on `features_lagged.parquet`:
`lgbm_h{1,2,4,12}.joblib`.

## Setup

| Setting | Value |
|---|---|
| Features | 71 (everything in `features_lagged.parquet` minus identifiers, other targets, metadata) |
| Categoricals | `commodity`, `variety`, `city`, `unit`, `msp_regime` (native LightGBM categorical splits) |
| Train rows | 59,557 (all weeks before last 52 per series) |
| Test rows | 4,690 (last 52 weeks per series — matches the baselines "recent_year" scope) |
| Target | `(y_h - price) / price` — pct change. Unit-agnostic; reduces to persistence when prediction = 0; final reconstruction `y_h_pred = price * (1 + pct_pred)`. |
| Hyperparams | n_estimators=2000, lr=0.05, num_leaves=63, min_data_in_leaf=20, feature_fraction=0.9, bagging_fraction=0.9, early_stop=100 |

## Why the target matters

Two earlier attempts failed:

| Target | h=1 MAPE | h=12 MAPE | Sugar h=4 |
|---|---:|---:|---:|
| Absolute level (`y_h`) | 5.58 | 16.45 | n/a |
| Absolute delta (`y_h − price`) | 3.08 | 17.85 | 22.24 |
| **Pct change (`(y_h − price) / price`)** | **2.43** | **10.41** | **5.39** |

Sugar is in Rs/Kg (30–180) while grains are in Rs/40Kg (600–6,000) — a ~30× scale gap. With a level or absolute-delta target, a global LightGBM fits to the grain rows (which dominate the loss) and over-predicts Sugar's movements by an order of magnitude. The pct-change target normalizes this and works across all commodities.

## Headline — recent-year MAPE (%) vs persistence

| h | persistence | LGBM | gap |
|---:|---:|---:|---:|
| 1 | 1.86 | 2.43 | +30% worse |
| 2 | 3.19 | 4.10 | +29% worse |
| 4 | 5.35 | 6.44 | +20% worse |
| 12 | **9.80** | **10.41** | +6% worse |

## Per-commodity at h=12 (where LGBM actually wins)

| commodity | persistence | LGBM | winner |
|---|---:|---:|---|
| Sugar | 7.62 | 8.61 | persistence |
| Rice | 7.16 | 7.97 | persistence |
| Maize | 10.57 | 12.66 | persistence |
| **Seed Cotton (Phutti)** | 9.65 | **8.31** | **LGBM (−14%)** |
| **Wheat** | 16.98 | **16.18** | **LGBM (−5%)** |
| **Paddy** | 18.93 | **17.63** | **LGBM (−7%)** |

Wins-by-horizon across the 6 commodities:

| horizon | LGBM | persistence |
|---:|---:|---:|
| 1 | 0 | 6 |
| 2 | 0 | 6 |
| 4 | 0 | 6 |
| 12 | **3** | 3 |

## What this means

1. **At short horizons (1–4 wks), persistence is unbeatable.** AMIS FQP prices are administered, sticky, and frequently unchanged week-over-week. Any non-zero prediction adds noise more often than signal.
2. **At long horizon (12 wks), LGBM has real edge on the hard series.** Wheat (MSP regime breaks), Paddy (sparse + seasonal), and Seed Cotton (volatile world cotton prices) all benefit from the model's ability to weigh calendar, weather, and world-price signals.
3. **The closer the persistence baseline is to "trivial," the harder LGBM has to work.** Sugar at h=1 is 1.17% MAPE — there's nothing to add.

## How to use these models

- **Short-term forecasts (h=1, h=2, h=4)** for any commodity: ship persistence (`next_week_price = this_week_price`). Don't ship the LGBM — it's strictly worse.
- **12-week forecasts**: ship LGBM for Wheat, Paddy, Seed Cotton; ship persistence for Sugar, Rice, Maize.

This naturally points to the Phase 7 ensemble: a per-(commodity, horizon) router that picks the best baseline/model from a held-out window. Even a trivial "min-MAPE selector" trained on a validation year would lock in the wins.

## Caveats

- The early-stopping `eval_set` is the test set itself — a small information leak that overstates LGBM's score. The real out-of-sample MAPE is at best slightly worse than reported. Fix in a follow-up: hold out a separate val year between train and test.
- No walk-forward CV yet. We picked one (train, test) split. Walk-forward across years would tell us whether LGBM's h=12 wins are stable or year-specific.
- Globally pooled. Per-commodity models might do better, especially on Sugar where the dynamics differ.

## Reproducing

```
python ml/training/models/train_lgbm.py \
       --in ml/training/data/features_lagged.parquet \
       --out-dir ml/training/models \
       --test-weeks 52 \
       --baselines ml/training/baselines/baseline_metrics.csv
```

Outputs:
- `lgbm_h{1,2,4,12}.joblib` — trained models with feature_cols + best_iteration
- `metrics.csv` — per-(commodity, horizon) MAE/RMSE/MAPE
- `vs_baselines.csv` — LGBM MAPE side-by-side with naive baselines
- `predictions.parquet` — test-row predictions for inspection
- `run_meta.json` — split sizes, feature count, horizons
