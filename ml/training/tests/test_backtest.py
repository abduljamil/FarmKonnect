import pandas as pd
import numpy as np
from ml.training import backtest as bt


def make_weekly_panel(start='2020-01-06', weeks=10):
    dates = pd.date_range(start=start, periods=weeks, freq='7D')
    rows = []
    for d in dates:
        rows.append({'date': d, 'commodity': 'Wheat', 'variety': None, 'city': 'Lahore', 'price': 100 + np.random.randint(-5, 6)})
    return pd.DataFrame(rows)


def test_expanding_backtest_basic():
    df = make_weekly_panel(weeks=12)
    metrics_df, preds_df = bt.expanding_backtest(df, target_col='price', horizon=1, min_train_periods=4)
    assert isinstance(metrics_df, pd.DataFrame)
    # predictions should exist for at least one fold
    assert not preds_df.empty
