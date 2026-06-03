"""Phase 7 — per-(commodity, horizon) router.

Reads the recent-year MAPE numbers from Phase 4 (naive baselines) and Phase 6
(LightGBM), and emits a small JSON config that the prediction service will
consume to decide *which* model to use for each (commodity, horizon) cell.

Selection rule:
- Compare ``mape`` on scope=recent_year for every (commodity, horizon) cell
  across {persistence, ma4, lgbm}.
- Choose the model with the lowest MAPE — but only if the gap to persistence
  is at least ``--min-edge-pct`` percent (default 1.0). Otherwise default to
  persistence (boring is good when the edge is noise).
- If a cell has no MAPE for some model, that model is ignored for that cell.
- Cells we have no metric for at all fall back to ``--fallback`` (default
  ``persistence``).

Output: ``router_config.json`` — version, horizons, per-cell route, fallback,
and a per-cell expected MAPE summary so monitoring (Phase 12) has a baseline.

Usage:
    python build_router.py \\
        --baselines ml/training/baselines/baseline_metrics.csv \\
        --lgbm-metrics ml/training/models/metrics.csv \\
        --out ml/training/router/router_config.json
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

HORIZONS = [1, 2, 4, 12]
CANDIDATE_MODELS = ["persistence", "ma4", "lgbm"]


def _load_recent_mapes(baselines_csv: Path, lgbm_csv: Path) -> pd.DataFrame:
    bl = pd.read_csv(baselines_csv)
    bl = bl[(bl["scope"] == "recent_year") & (bl["commodity"] != "ALL")].copy()
    bl = bl[bl["baseline"].isin(["persistence", "ma4"])]
    bl_long = bl.rename(columns={"baseline": "model"})[
        ["commodity", "horizon", "model", "mape", "n"]
    ]

    lg = pd.read_csv(lgbm_csv)
    lg = lg[lg["commodity"] != "ALL"].copy()
    lg["model"] = "lgbm"
    lg_long = lg[["commodity", "horizon", "model", "mape", "n"]]

    return pd.concat([bl_long, lg_long], ignore_index=True)


def _pick_winner_per_cell(
    df: pd.DataFrame, min_edge_pct: float, fallback: str
) -> pd.DataFrame:
    rows = []
    for (commodity, horizon), sub in df.groupby(["commodity", "horizon"]):
        sub = sub.dropna(subset=["mape"])
        if sub.empty:
            rows.append(
                {
                    "commodity": commodity,
                    "horizon": int(horizon),
                    "chosen": fallback,
                    "chosen_mape": None,
                    "persistence_mape": None,
                    "edge_pct": None,
                    "reason": "no_metric_available",
                    "n": 0,
                }
            )
            continue

        wide = sub.set_index("model")["mape"]
        persistence_mape = float(wide.get("persistence", float("inf")))
        best_model = wide.idxmin()
        best_mape = float(wide.min())

        if best_model == "persistence":
            chosen, reason = "persistence", "persistence_is_best"
            edge = 0.0
        else:
            edge = (persistence_mape - best_mape) / persistence_mape * 100
            if edge >= min_edge_pct:
                chosen, reason = best_model, f"beats_persistence_by_{edge:.1f}pct"
            else:
                chosen = "persistence"
                reason = f"edge_{edge:.1f}pct_below_threshold_{min_edge_pct}"

        n_val = sub.loc[sub["model"] == chosen, "n"]
        n_int = int(n_val.iloc[0]) if not n_val.empty else 0

        rows.append(
            {
                "commodity": commodity,
                "horizon": int(horizon),
                "chosen": chosen,
                "chosen_mape": float(wide.get(chosen, float("nan"))),
                "persistence_mape": persistence_mape,
                "edge_pct": float(edge) if edge is not None else None,
                "reason": reason,
                "n": n_int,
            }
        )
    return pd.DataFrame(rows).sort_values(["commodity", "horizon"]).reset_index(drop=True)


def _emit_config(routes: pd.DataFrame, fallback: str, sources: dict) -> dict:
    cells = {}
    for _, r in routes.iterrows():
        key = f"{r.commodity}__h{r.horizon}"
        cells[key] = {
            "commodity": r.commodity,
            "horizon": int(r.horizon),
            "model": r.chosen,
            "expected_mape": r.chosen_mape,
            "persistence_mape": r.persistence_mape,
            "edge_pct": r.edge_pct,
            "reason": r.reason,
        }
    return {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "horizons": HORIZONS,
        "candidate_models": CANDIDATE_MODELS,
        "fallback": fallback,
        "sources": sources,
        "cells": cells,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--baselines",
        default="ml/training/baselines/baseline_metrics.csv",
        type=Path,
    )
    ap.add_argument(
        "--lgbm-metrics",
        default="ml/training/models/metrics.csv",
        type=Path,
    )
    ap.add_argument(
        "--out",
        default="ml/training/router/router_config.json",
        type=Path,
    )
    ap.add_argument("--summary", default="ml/training/router/router_summary.csv", type=Path)
    ap.add_argument("--fallback", default="persistence", choices=CANDIDATE_MODELS)
    ap.add_argument(
        "--min-edge-pct",
        type=float,
        default=1.0,
        help="non-persistence model must beat persistence by at least this %% to be chosen",
    )
    args = ap.parse_args(argv)

    df = _load_recent_mapes(args.baselines, args.lgbm_metrics)
    print(f"Loaded {len(df)} (commodity, horizon, model) rows from metrics")

    routes = _pick_winner_per_cell(df, args.min_edge_pct, args.fallback)

    counts = routes["chosen"].value_counts().to_dict()
    print("\n=== Router choices by model ===")
    for m, c in counts.items():
        print(f"  {m}: {c}")
    print(f"  total cells: {len(routes)}")

    print("\n=== Per-cell choice ===")
    print(
        routes[
            ["commodity", "horizon", "chosen", "chosen_mape", "persistence_mape", "edge_pct", "reason"]
        ].to_string(index=False)
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    config = _emit_config(
        routes,
        args.fallback,
        sources={
            "baselines": str(args.baselines),
            "lgbm_metrics": str(args.lgbm_metrics),
            "min_edge_pct": args.min_edge_pct,
        },
    )
    args.out.write_text(json.dumps(config, indent=2))
    print(f"\nConfig -> {args.out}")

    args.summary.parent.mkdir(parents=True, exist_ok=True)
    routes.to_csv(args.summary, index=False)
    print(f"Summary -> {args.summary}")

    weighted_mape = (routes["chosen_mape"] * routes["n"]).sum() / routes["n"].sum()
    print(f"\nWeighted MAPE % across all cells (n-weighted): {weighted_mape:.3f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
