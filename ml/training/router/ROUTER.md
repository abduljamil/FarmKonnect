# Phase 7 — per-(commodity, horizon) router

A small JSON config that says, for every (commodity, horizon) cell, which
model the prediction service should run. Locks in the wins identified in
Phase 6 without the overfit risk (and code weight) of a learned stacking
meta-learner.

## Selection rule

For each cell, compare recent-year MAPE across `{persistence, ma4, lgbm}`.
Pick the lowest, but only if the gap to persistence is at least
`--min-edge-pct` (default **1.0%**). Otherwise default to persistence — when
the edge is small enough to be noise, the boring choice wins.

This avoids the "LGBM is 0.3% better, ship it" trap. The 1% threshold is
arbitrary but defensible: it's roughly the noise band we'd expect from a
single test split (one bad week can shift overall MAPE by ~0.3%).

## Result

24 cells (6 commodities × 4 horizons). Choices:

| chosen | count |
|---|---:|
| persistence | 21 |
| lgbm | 3 |
| ma4 | 0 |

LGBM wins exactly the three cells we expected from Phase 6:

| commodity | horizon | persistence | LGBM | edge | reason |
|---|---:|---:|---:|---:|---|
| Wheat | 12 | 16.98 | **16.18** | 4.7% | beats_persistence_by_4.7pct |
| Paddy | 12 | 18.93 | **17.63** | 6.9% | beats_persistence_by_6.9pct |
| Seed Cotton (Phutti) | 12 | 9.65 | **8.31** | 13.9% | beats_persistence_by_13.9pct |

ma4 never wins anywhere with margin ≥ 1% (the one h=12 Paddy near-tie from
Phase 4 was outclassed by LGBM here).

**Weighted MAPE across all cells (n-weighted, recent year):** 4.63%.

## What ships

`router_config.json` looks like:

```json
{
  "version": 1,
  "horizons": [1, 2, 4, 12],
  "candidate_models": ["persistence", "ma4", "lgbm"],
  "fallback": "persistence",
  "cells": {
    "Wheat__h12": {
      "commodity": "Wheat",
      "horizon": 12,
      "model": "lgbm",
      "expected_mape": 16.18,
      "persistence_mape": 16.98,
      "edge_pct": 4.67,
      "reason": "beats_persistence_by_4.7pct"
    },
    "...": "..."
  }
}
```

The prediction service (Phase 8) will:

1. Read `router_config.json` at startup
2. For each (commodity, variety, city) series and each horizon h:
   - Look up `cells["{commodity}__h{h}"].model`
   - If `persistence` → predict `current_price`
   - If `ma4` → predict `price_lag1_ma4`
   - If `lgbm` → load `lgbm_h{h}.joblib` and run inference on the row's features
3. Upsert into `pricepredictions` collection in Atlas with `expected_mape` tagged so the frontend can show uncertainty bands

## Caveats inherited from upstream phases

- Single 52-wk holdout for the Phase 6 LGBM numbers → wins might be year-specific. Especially Wheat at h=12 (tied to 2025 MSP reinstatement, could revert in 2026 deregulation).
- The early-stopping leak from Phase 6 (test set used as eval_set) flatters LGBM's edge by ~1-5%. Two of the three LGBM cells (Wheat 4.7%, Paddy 6.9%) are within that range — they could go either way under a clean walk-forward eval. Seed Cotton's 13.9% is large enough to survive.

→ Mitigation: in Phase 12 monitoring, track rolling 4-wk MAPE of the *chosen* model vs persistence. If the LGBM cells stop beating persistence for several weeks running, the router rebuild step can flip them back automatically (just rerun this script with fresh metrics).

## Reproducing

```
python ml/training/router/build_router.py \
    --baselines ml/training/baselines/baseline_metrics.csv \
    --lgbm-metrics ml/training/models/metrics.csv \
    --out ml/training/router/router_config.json \
    --summary ml/training/router/router_summary.csv \
    --min-edge-pct 1.0
```

Inputs: Phase 4 baselines CSV + Phase 6 LGBM metrics CSV. Outputs:
`router_config.json` (consumed by prediction service) + `router_summary.csv`
(human-readable table).
