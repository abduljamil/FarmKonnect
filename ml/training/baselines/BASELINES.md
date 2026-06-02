# Phase 4 — naive baseline metrics

Three causal baselines on `features_lagged.parquet` (64,247 wk-rows × 146 series, 2009–2026).
Computed per `(commodity, variety, city)` series, per forecast horizon h ∈ {1, 2, 4, 12} weeks.

Baselines:
- **persistence** — `y_pred[t, h] = price[t]` ("price won't change")
- **seasonal_naive** — `y_pred[t, h] = price[t + h − 52]` ("looks like last year")
- **ma4** — `y_pred[t, h] = price_lag1_ma4[t]` (4-week MA of lag-1 price)

## Overall MAPE (%) — all commodities

### Recent year (last 52 weeks)

| baseline       | h=1   | h=2   | h=4   | h=12  |
|----------------|------:|------:|------:|------:|
| persistence    | 1.86  | 3.19  | 5.35  | 9.80  |
| ma4            | 4.89  | 5.80  | 7.31  | 10.61 |
| seasonal_naive | 22.40 | 22.24 | 21.94 | 20.68 |

### Full history

| baseline       | h=1   | h=2   | h=4   | h=12  |
|----------------|------:|------:|------:|------:|
| persistence    | 1.87  | 3.11  | 5.09  | 9.68  |
| ma4            | 4.32  | 5.18  | 6.62  | 10.38 |
| seasonal_naive | 19.21 | 19.21 | 19.21 | 19.21 |

## Per-commodity best baseline (recent year MAPE %)

| commodity            | h=1  | h=2  | h=4   | h=12  | best at h=12   |
|----------------------|-----:|-----:|------:|------:|----------------|
| Maize                | 2.18 | 3.69 |  5.91 | 10.57 | persistence    |
| Paddy                | 4.17 | 7.10 | 11.83 | 18.89 | **ma4**        |
| Rice                 | 1.34 | 2.29 |  3.88 |  7.16 | persistence    |
| Seed Cotton (Phutti) | 2.39 | 4.13 |  6.44 |  9.65 | persistence    |
| Sugar                | 1.17 | 2.06 |  3.64 |  7.62 | persistence    |
| Wheat                | 2.36 | 4.15 |  7.50 | 16.98 | persistence    |

Persistence wins 23 of 24 cells. Only Paddy at h=12 prefers `ma4`.

## Read

1. **Persistence is a strong floor.** AMIS weekly prices are very sticky — the official Faisalabad Quoted Price (FQP) often holds steady for several weeks. "Tomorrow looks like today" is hard to beat at short horizons.
2. **Seasonal naive is bad.** ~20% MAPE at every horizon. Pakistan commodity prices don't repeat year-over-year — MSP regime changes, inflation, and supply shocks make 1-yr-ago a poor reference.
3. **Sugar and Rice are the easiest** (sub-2% at h=1, sub-8% at h=12) — large dense series with smooth dynamics.
4. **Wheat at h=12 is the hardest commodity** (17% MAPE) — likely driven by MSP-regime breaks (2024 abolition → 2025 reinstatement → 2026 deregulation).
5. **Paddy is sparse and seasonal** — only commodity where MA4 wins at long horizon, and it's still 19% MAPE.

## Implication for Phase 6–7 modeling

The original HANDOFF.md targets of "~3–5% MAPE @ h=1, ~12–18% @ h=30" were daily; weekly equivalents:

| horizon | naive MAPE | target a real model should beat |
|--------:|-----------:|--------------------------------:|
|    1 wk |       1.86 |                          < 1.7  |
|    2 wk |       3.19 |                          < 2.8  |
|    4 wk |       5.35 |                          < 4.5  |
|   12 wk |       9.80 |                          < 8.0  |

Anything worse than persistence is not worth shipping.

## Reproducing

```
python ml/training/baselines/run_baselines.py \
       --in ml/training/data/features_lagged.parquet \
       --out-dir ml/training/baselines
```

Inputs: `features_lagged.parquet`. Outputs: `baseline_metrics.csv` (per
commodity/horizon/scope), `baseline_predictions.parquet` (every row's three
predictions for every horizon, for downstream inspection).
