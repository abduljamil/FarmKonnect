"""Phase 6.5 — per-commodity LightGBM specialists for the hard 3 series.

The global model (train_lgbm.py) has to balance 6 commodities with wildly
different dynamics. For Wheat / Paddy / Seed Cotton (Phutti) — the 3 that
underperform persistence at h=12 — we try specialised per-commodity models
that can spend their entire capacity on one commodity's quirks.

Same eval discipline as train_lgbm.py:
- Train: all weeks before last 52 per series
- Val:   last 26 weeks of train per series (early-stopping eval, no test leak)
- Test:  last 52 weeks per series

Same target (pct change), same categoricals minus `commodity` (constant per
model), same hyperparameters as the global.

Outputs:
- lgbm_<slug>_h{h}.joblib       — one bundle per (commodity, horizon)
- lgbm_per_commodity_metrics.csv — per (commodity, horizon) MAPE in router-
                                    compatible format
"""
from __future__ import annotations

import argparse
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor, early_stopping, log_evaluation

GROUP_COLS = ["commodity", "variety", "city"]
HORIZONS = [1, 2, 4, 12]
CATEGORICALS = ["commodity", "variety", "city", "unit", "msp_regime"]
DROP_ALWAYS = ["date", "n_obs", "filled", "winsorized"]
HARD_3 = ["Wheat", "Paddy", "Seed Cotton (Phutti)"]


def _slug(c: str) -> str:
    return (c.lower()
              .replace(" ", "_")
              .replace("(", "")
              .replace(")", ""))


def _features_target_split(df: pd.DataFrame, horizon: int):
    other_targets = [f"y_{h}" for h in HORIZONS if h != horizon]
    drop_cols = DROP_ALWAYS + other_targets + [f"y_{horizon}"]
    # NB: keep `commodity` even though it's constant per-model — the categorical
    # column stays in the feature_cols list so the inference path can pass a
    # consistent schema. LightGBM ignores constants.
    X = df.drop(columns=[c for c in drop_cols if c in df.columns])
    pct = (df[f"y_{horizon}"] - df["price"]) / df["price"]
    pct = pct.where(df["price"] > 0)
    for c in CATEGORICALS:
        if c in X.columns:
            X[c] = X[c].astype("category")
    return X, pct


def _metrics(y_true, y_pred) -> dict:
    mask = ~(pd.isna(y_true) | pd.isna(y_pred))
    if not mask.any():
        return {"mae": np.nan, "rmse": np.nan, "mape": np.nan, "n": 0}
    yt = y_true[mask].astype(float)
    yp = y_pred[mask].astype(float)
    err = yt - yp
    nz = yt != 0
    return {
        "mae":  float(np.abs(err).mean()),
        "rmse": float(np.sqrt((err ** 2).mean())),
        "mape": float(np.abs(err[nz] / yt[nz]).mean() * 100) if nz.any() else np.nan,
        "n":    int(mask.sum()),
    }


def _train_one(df_train_full: pd.DataFrame, df_test: pd.DataFrame, horizon: int):
    max_date_train = df_train_full.groupby(GROUP_COLS, dropna=False, sort=False)["date"].transform("max")
    weeks_from_end = (max_date_train - df_train_full["date"]).dt.days // 7
    is_val = weeks_from_end < 26

    df_tr = df_train_full[~is_val]
    df_va = df_train_full[is_val]

    X_tr, pct_tr = _features_target_split(df_tr, horizon)
    X_va, pct_va = _features_target_split(df_va, horizon)
    X_te, _      = _features_target_split(df_test, horizon)

    keep_tr = ~pct_tr.isna()
    X_tr, pct_tr = X_tr[keep_tr], pct_tr[keep_tr]
    keep_va = ~pct_va.isna()
    X_va, pct_va = X_va[keep_va], pct_va[keep_va]

    model = LGBMRegressor(
        n_estimators=2000, learning_rate=0.05, num_leaves=63,
        min_data_in_leaf=20, feature_fraction=0.9, bagging_fraction=0.9,
        bagging_freq=5, random_state=42, n_jobs=-1, verbose=-1,
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model.fit(
            X_tr, pct_tr,
            eval_set=[(X_va, pct_va)],
            callbacks=[early_stopping(100, verbose=False), log_evaluation(0)],
            categorical_feature=[c for c in CATEGORICALS if c in X_tr.columns],
        )

    pct_pred = model.predict(X_te)
    abs_pred = df_test["price"].values * (1.0 + pct_pred)
    pred = pd.Series(abs_pred, index=df_test.index, name=f"pred_h{horizon}")
    return model, pred, X_tr.columns.tolist()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="ml/training/data/features_lagged.parquet")
    ap.add_argument("--out-dir", default="ml/training/models")
    ap.add_argument("--test-weeks", type=int, default=52)
    ap.add_argument("--commodities", nargs="+", default=HARD_3,
                    help="commodities to train per-commodity models for")
    args = ap.parse_args(argv)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_parquet(args.in_path)
    df = df.sort_values(GROUP_COLS + ["date"]).reset_index(drop=True)
    n_series = df.groupby(GROUP_COLS, dropna=False).ngroups
    print(f"Read {len(df):,} rows · {n_series} series from {args.in_path}")

    metric_rows: list[dict] = []
    for commodity in args.commodities:
        sub = df[df["commodity"] == commodity].copy()
        n_sub_series = sub.groupby(GROUP_COLS, dropna=False).ngroups
        print(f"\n=== {commodity} ({n_sub_series} series, {len(sub):,} rows) ===")

        max_date = sub.groupby(GROUP_COLS, dropna=False, sort=False)["date"].transform("max")
        weeks_from_end = (max_date - sub["date"]).dt.days // 7
        test_mask = weeks_from_end < args.test_weeks
        df_train = sub[~test_mask].copy()
        df_test  = sub[test_mask].copy()

        for h in HORIZONS:
            model, preds, feat_cols = _train_one(df_train, df_test, h)
            y_true = df_test[f"y_{h}"].values
            m = _metrics(y_true, preds.values)
            m.update({"commodity": commodity, "horizon": h})
            metric_rows.append(m)
            print(f"  h={h:2d}: mae={m['mae']:.1f}  rmse={m['rmse']:.1f}  "
                  f"mape={m['mape']:.3f}%  n={m['n']}  best_iter={getattr(model,'best_iteration_',None)}")
            joblib.dump(
                {
                    "model": model,
                    "feature_cols": feat_cols,
                    "categoricals": [c for c in CATEGORICALS if c in feat_cols],
                    "horizon": h,
                    "commodity": commodity,
                    "best_iteration": getattr(model, "best_iteration_", None),
                },
                out_dir / f"lgbm_{_slug(commodity)}_h{h}.joblib",
            )

    mdf = pd.DataFrame(metric_rows)[["mae","rmse","mape","n","commodity","horizon"]]
    mdf.to_csv(out_dir / "lgbm_per_commodity_metrics.csv", index=False)
    print(f"\nMetrics -> {out_dir / 'lgbm_per_commodity_metrics.csv'}")

    pivot = mdf.pivot(index="commodity", columns="horizon", values="mape").round(2)
    print("\n=== Per-commodity LGBM specialists — MAPE % @ recent_year holdout ===")
    print(pivot.to_string())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
