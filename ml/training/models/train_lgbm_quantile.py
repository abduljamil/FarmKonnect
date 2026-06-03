"""Phase 6.5 — quantile LightGBM at h=12 for uncertainty bands + robust median.

Trains three LGBMs at h=12 with `objective="quantile"` at α ∈ {0.1, 0.5, 0.9}:
- q=0.5 (median): a point-forecast candidate competing with mean LGBM in the
  router. Median pct-change is more robust to outliers than mean — sometimes
  beats mean on heavy-tailed weekly returns.
- q=0.1 / q=0.9: lower / upper bounds of an 80% confidence interval. Phase 10
  chart consumes these for the uncertainty band instead of the
  `expected_mape × √h` approximation we'd otherwise need.

Only h=12 because that's where the uncertainty is largest and where users want
the bands most. Shorter horizons can derive bands from `expected_mape` for now.

Same eval discipline as train_lgbm.py: train_full → val (last 26 wks of train) +
test (last 52 wks per series). No test-set leak.
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
CATEGORICALS = ["commodity", "variety", "city", "unit", "msp_regime"]
DROP_ALWAYS = ["date", "n_obs", "filled", "winsorized"]
ALL_HORIZONS = [1, 2, 4, 12]
H_TARGET = 12
QUANTILES = [0.1, 0.5, 0.9]


def _features_target_split(df: pd.DataFrame, horizon: int):
    other_targets = [f"y_{h}" for h in ALL_HORIZONS if h != horizon]
    drop_cols = DROP_ALWAYS + other_targets + [f"y_{horizon}"]
    X = df.drop(columns=[c for c in drop_cols if c in df.columns])
    pct = (df[f"y_{horizon}"] - df["price"]) / df["price"]
    pct = pct.where(df["price"] > 0)
    for c in CATEGORICALS:
        if c in X.columns:
            X[c] = X[c].astype("category")
    return X, pct


def _train_one_quantile(df_train_full, df_test, alpha: float):
    max_date_train = df_train_full.groupby(GROUP_COLS, dropna=False, sort=False)["date"].transform("max")
    is_val = (max_date_train - df_train_full["date"]).dt.days // 7 < 26
    X_tr, pct_tr = _features_target_split(df_train_full[~is_val], H_TARGET)
    X_va, pct_va = _features_target_split(df_train_full[is_val], H_TARGET)
    X_te, _      = _features_target_split(df_test, H_TARGET)
    X_tr, pct_tr = X_tr[~pct_tr.isna()], pct_tr[~pct_tr.isna()]
    X_va, pct_va = X_va[~pct_va.isna()], pct_va[~pct_va.isna()]

    model = LGBMRegressor(
        objective="quantile", alpha=alpha,
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
    return model, pd.Series(abs_pred, index=df_test.index), X_tr.columns.tolist()


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


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="ml/training/data/features_lagged.parquet")
    ap.add_argument("--out-dir", default="ml/training/models")
    ap.add_argument("--test-weeks", type=int, default=52)
    args = ap.parse_args(argv)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_parquet(args.in_path)
    df = df.sort_values(GROUP_COLS + ["date"]).reset_index(drop=True)
    print(f"Read {len(df):,} rows · {df.groupby(GROUP_COLS,dropna=False).ngroups} series")

    max_date = df.groupby(GROUP_COLS, dropna=False, sort=False)["date"].transform("max")
    test_mask = (max_date - df["date"]).dt.days // 7 < args.test_weeks
    df_train = df[~test_mask].copy()
    df_test  = df[test_mask].copy()
    print(f"Split: train={len(df_train):,} test={len(df_test):,}")

    metric_rows: list[dict] = []
    preds_by_q: dict[float, pd.Series] = {}
    feat_cols_global = None

    for q in QUANTILES:
        print(f"\n--- alpha={q} ---")
        model, preds, feat_cols = _train_one_quantile(df_train, df_test, q)
        feat_cols_global = feat_cols
        preds_by_q[q] = preds

        # Per-quantile MAPE (only meaningful for q=0.5 as a point forecast)
        y_true = df_test[f"y_{H_TARGET}"].values
        m = _metrics(y_true, preds.values)
        m.update({"horizon": H_TARGET, "commodity": "ALL", "alpha": q})
        metric_rows.append(m)
        print(f"  overall: mae={m['mae']:.2f}  rmse={m['rmse']:.2f}  mape={m['mape']:.3f}%  n={m['n']}")

        for commodity, csub in df_test.groupby("commodity", sort=True):
            yt = csub[f"y_{H_TARGET}"].values
            yp = preds.loc[csub.index].values
            cm = _metrics(yt, yp)
            cm.update({"horizon": H_TARGET, "commodity": commodity, "alpha": q})
            metric_rows.append(cm)

        joblib.dump(
            {
                "model": model,
                "feature_cols": feat_cols,
                "categoricals": [c for c in CATEGORICALS if c in feat_cols],
                "horizon": H_TARGET,
                "alpha": q,
                "objective": "quantile",
                "best_iteration": getattr(model, "best_iteration_", None),
            },
            out_dir / f"lgbm_h{H_TARGET}_q{int(q*100):02d}.joblib",
        )

    # --- coverage check: how often is y_true between q10 and q90 prediction? ---
    y_true = df_test[f"y_{H_TARGET}"].values
    lo = preds_by_q[0.1].values
    hi = preds_by_q[0.9].values
    mask = ~(pd.isna(y_true) | pd.isna(lo) | pd.isna(hi))
    inside = ((y_true[mask] >= lo[mask]) & (y_true[mask] <= hi[mask])).mean() * 100
    print(f"\nEmpirical 80% interval coverage: {inside:.1f}% (target: 80%)")

    mdf = pd.DataFrame(metric_rows)
    mdf.to_csv(out_dir / "lgbm_quantile_metrics.csv", index=False)
    print(f"\nMetrics -> {out_dir / 'lgbm_quantile_metrics.csv'}")

    pivot = (mdf[mdf.commodity != "ALL"]
             .pivot_table(index="commodity", columns="alpha", values="mape")
             .round(2))
    print("\n=== Quantile LGBM @ h=12 — MAPE % per commodity ===")
    print(pivot.to_string())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
