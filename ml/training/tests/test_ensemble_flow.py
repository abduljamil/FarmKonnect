import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from ml.training import ensemble as ens


def test_make_oof_preds_dummy():
    # simple dataset
    X = pd.DataFrame({'f1': np.arange(20), 'f2': np.arange(20) * 2})
    y = np.arange(20).astype(float)

    models = {
        'dummy_mean': DummyRegressor(strategy='mean')
    }

    oof = ens.make_oof_preds(models, X, y, n_splits=4)
    assert 'dummy_mean' in oof
    assert len(oof['dummy_mean']) == len(y)
