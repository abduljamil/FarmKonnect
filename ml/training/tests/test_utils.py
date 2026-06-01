import os

import numpy as np
import pandas as pd

from ml.training import train_models as tm
from ml.training import ensemble as ens
from ml.training import retrain_worker as rw


def test_detect_target_train_models():
    df = pd.DataFrame({"price": [100, 200, 150]})
    assert tm.detect_target(df) == "price"


def test_metrics_train_models():
    y_true = np.array([10.0, 20.0, 30.0])
    y_pred = np.array([12.0, 18.0, 33.0])
    m = tm.metrics(y_true, y_pred)
    assert "mae" in m and "rmse" in m and "mape" in m
    assert m["mae"] >= 0


def test_metrics_ensemble():
    y_true = np.array([5.0, 0.0, 10.0])
    y_pred = np.array([4.0, 1.0, 9.0])
    m = ens.metrics(y_true, y_pred)
    assert "mae" in m and "rmse" in m and "mape" in m


def test_get_mongo_raises_without_env():
    # ensure MONGODB_URI not set
    if "MONGODB_URI" in os.environ:
        del os.environ["MONGODB_URI"]
    try:
        try:
            rw.get_mongo()
            assert False, "Expected EnvironmentError when MONGODB_URI is not set"
        except EnvironmentError:
            pass
    finally:
        # no-op: do not restore any env
        pass
