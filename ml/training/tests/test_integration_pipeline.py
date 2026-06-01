import os
import pandas as pd
import numpy as np
import joblib
import tempfile
import mongomock

from ml.training import predict_and_push as pp
from ml.training import monitor as mon


def test_predict_monitor_retrain_pipeline(tmp_path, monkeypatch):
    # create a tiny features parquet (one group)
    base_date = pd.to_datetime("2026-05-25")
    df = pd.DataFrame({
        "date": [base_date],
        "commodity": ["Wheat"],
        "variety": [None],
        "city": ["Lahore"],
        "priceType": ["FQP"],
        "price": [10.0],
    })
    feats = tmp_path / "features.parquet"
    df.to_parquet(feats)

    # create ensemble dir with simple base models
    ensemble_dir = tmp_path / "ensemble_models"
    ensemble_dir.mkdir()
    from sklearn.dummy import DummyRegressor
    jd = DummyRegressor(strategy="mean")
    jd.fit(np.array([[0], [1]]), np.array([100.0, 100.0]))
    joblib.dump(jd, ensemble_dir / "base_lgbm.joblib")
    joblib.dump(jd, ensemble_dir / "base_rf.joblib")

    # create a single mongomock client and patch both modules to use it
    client = mongomock.MongoClient()
    monkeypatch.setattr(pp, "MongoClient", lambda *args, **kwargs: client)
    monkeypatch.setattr(mon, "MongoClient", lambda *args, **kwargs: client)

    # set MONGODB_URI so scripts don't error (client is patched)
    os.environ["MONGODB_URI"] = "mongodb://test"

    # seed historical prices: many small-price records to make median small
    db = client.get_database('farmkonnect_ml')
    prices = []
    for i in range(30):
        prices.append({
            "commodity": "Wheat",
            "variety": None,
            "city": "Lahore",
            "date": (base_date - pd.Timedelta(days=30 + i)).to_pydatetime(),
            "price": 10.0,
        })
    # Add an actual price at the forecast date (next week) that is very large
    prices.append({
        "commodity": "Wheat",
        "variety": None,
        "city": "Lahore",
        "date": (base_date + pd.Timedelta(weeks=1)).to_pydatetime(),
        "price": 1000.0,
    })
    db["commodityprices"].insert_many(prices)

    # run predict_and_push to write forecasts (horizon=1)
    pp.main(["--features", str(feats), "--ensemble", str(ensemble_dir), "--horizon", "1"]) 

    # ensure forecasts were written
    fcount = db["priceforecasts"].count_documents({})
    assert fcount > 0

    # run monitor to compute monitoring and enqueue retrain if needed
    mon.main(["--features", str(feats), "--lookback-days", "28"]) 

    # check monitoring and jobs
    mon_doc = db["ml_monitoring"].find_one({})
    assert mon_doc is not None

    jobs = list(db["ml_jobs"].find({}))
    assert any(j.get("type") == "retrain" for j in jobs), "Expected a retrain job to be enqueued"
