# FarmKonnect Price Forecasting — Complete Documentation

> A single end-to-end document covering what the system is, why every design
> choice was made, how it works in production, and how to operate it. Written
> so a non-engineer can read it top-to-bottom and so an engineer can use it
> as a reference. Technical terms are defined inline the first time they
> appear; there's also a glossary at the bottom.

> Last updated: 2026-06-03. Live at https://www.farmkonnect.app.

---

## Table of contents

0. [How to read this document](#0-how-to-read)
1. [What this is, in one paragraph](#1-what-this-is)
2. [The two halves of the project](#2-the-two-halves)
3. [Why this is hard — the headline finding](#3-why-this-is-hard)
4. [First-principles primer (zero ML knowledge assumed)](#3b-primer)
5. [Background concepts (terms you'll see throughout)](#4-background-concepts)
6. [The data we work with](#5-the-data)
7. [The architecture, end-to-end](#6-architecture)
8. [How the models work, in plain language](#7-models-plain)
9. [How the models work, technically](#7b-models-technical)
10. [Accuracy results, with what the numbers mean](#8-accuracy)
11. [Worked example — a single prediction, start to finish](#8b-worked)
12. [A day in the life of the prediction service](#8c-day-in-life)
13. [The user-facing chart](#9-chart)
14. [Live operations](#10-operations)
15. [Monitoring and retraining](#11-monitoring)
16. [What we tried and rejected, and why](#12-rejected)
17. [Limitations and honest caveats](#13-limitations)
18. [Future work](#14-future)
19. [FAQ](#14b-faq)
20. [Glossary](#15-glossary)

---

<a name="0-how-to-read"></a>
## 0. How to read this document

This doc is **layered**. Each section is written so you can read just the
parts that match your background and goal:

| If you are… | Read these sections | Skip these |
|---|---|---|
| **A non-technical user** (farmer, trader, journalist) | 1, 2, 3, 4 (primer), 13 (chart), 19 (FAQ) | 7-9 (technical models), 14 (operations) |
| **A product manager / decision-maker** | 1, 2, 3, 8, 10, 16, 17, 18 | 8-9 deep technical bits |
| **A developer joining the project** | All of it, but start with 2, 7, 11, 12 | — |
| **An ML engineer auditing the system** | 4-6, 8-12, 16, 17 | 0-3 if pressed for time |
| **An operator running it day-to-day** | 14, 15, 19 + the linked playbooks | the model internals |

**Conventions used in this doc:**

- **Bold technical terms** are defined inline the first time. They're also
  collected in the [Glossary](#15-glossary) at the bottom.
- ` `inline code` ` = a file path, command, or piece of code you can run.
- Sidebar notes (in blockquotes, like the one below) give plain-language
  context for what's around them.

> **Example of a sidebar note.** When you see this style, it's a parenthetical
> explanation — safe to skip if you already know what the surrounding text
> is talking about.

- All currency is **Pakistani Rupees (Rs / ₨)** unless noted. Prices are
  **per 40 kg ("Maund")** for grains and **per 1 kg** for sugar.
- Dates are in **YYYY-MM-DD**.
- Code examples assume you're on the local repo at
  `C:\Users\ahtsh\OneDrive\Desktop\FarmKonnect-EC2-Backup`.

---

<a name="1-what-this-is"></a>
## 1. What this is, in one paragraph

**FarmKonnect** is a live website (https://www.farmkonnect.app) showing daily
wholesale prices for six staple crops — **Wheat, Rice, Paddy, Maize, Sugar,
and Seed Cotton** — across **14 cities in Punjab, Pakistan**, going back to
**2009**. The data comes from the government AMIS (Agriculture Market
Information System) portal. **What we built on top of it** is a price-
forecasting system: every week it predicts where each crop's price is heading
**1 week, 2 weeks, 4 weeks, and 12 weeks ahead** in each city, shows those
forecasts on the existing price chart as a dashed orange line, and monitors
its own accuracy in production.

In numbers:

| Thing                              | Amount   |
|------------------------------------|---------:|
| Crops tracked                      | 6        |
| Cities (mandi markets)             | 14       |
| Years of price history             | ~17 (2009→2026) |
| Daily price records in the DB      | ~270,000 |
| Bad/duplicate records flagged      | 2,493    |
| Rows in the clean weekly table     | 64,247   |
| Outside-factor columns added       | 56       |
| Series we forecast for             | 146      |
| Forecast cells (commodity × horizon) | 24    |
| Live predictions in Atlas right now| 6,684    |
| Average prediction error overall   | **4.61% MAPE** |

---

<a name="2-the-two-halves"></a>
## 2. The two halves of the project

Two things, working together:

### 2.1 The live app (already running)

A normal three-tier web app, all on one EC2 server (a virtual machine in the
cloud) using Docker (a way to package each piece of software so it runs the
same way everywhere):

- **Frontend** (`frontend/`): a React website (the buttons, charts, dropdowns
  you see). Built with Vite, served by nginx.
- **Backend** (`backend/`): a Node.js HTTP API (`/api/prices/...`) talking to
  the database.
- **Scraper** (`scrapper/`): a Python service that pulls fresh prices from
  the AMIS portal a few times a day and writes them to the database.
- **Database**: MongoDB Atlas (the cloud version of MongoDB), free tier.
  Collections: `commodityprices` (the daily price records), and now
  `pricepredictions` (the forecasts we produce) and `prediction_monitoring`
  (how well the forecasts are doing).
- **Mobile app**: React Native (`mobile/`), separate build.

### 2.2 The ML system (what this document is about)

> **ML** = "machine learning". A program that learns patterns from past data
> and makes predictions about new data. Here, it learns from past crop prices
> and predicts future ones.

The ML system has three layers, each running as its own piece:

1. **Training pipeline** (Python scripts under `ml/training/`): turns raw
   prices into a clean, modelable dataset, then trains the prediction models.
   Runs occasionally — once when we set everything up, then monthly to
   refresh.
2. **Prediction service** (`prediction_service/` — its own Docker container,
   `farmkonnect_prediction_service_1`): runs every week, produces fresh
   forecasts, writes them to the database. It also monitors itself.
3. **Serving layer**: the existing backend exposes
   `GET /api/prices/forecast` (Node + Mongoose model). The frontend's
   existing `PriceChart.jsx` calls it and renders the forecast as a dashed
   orange line on the same chart that shows the historical prices.

---

<a name="3-why-this-is-hard"></a>
## 3. Why this is hard — the headline finding

> **Mandi prices** = wholesale crop prices set at organized agricultural
> marketplaces (mandis) in Pakistan. These are partially government-regulated
> (Minimum Support Prices, export bans, etc.), which makes them very sticky.

**On Pakistani weekly mandi prices, the simplest possible forecast — "next
week's price is the same as this week's" — is almost impossible to beat.**

This sounds obvious but it took weeks to fully confirm. We tested:
- Three naive baselines (persistence, ma4, seasonal_naive)
- A modern gradient-boosted ensemble (LightGBM, M5-competition-winning
  family)
- A foundation model (Amazon Chronos)
- Per-commodity specialist models
- Quantile regression

For most of the 24 forecast cells (commodity × horizon combinations),
**doing nothing** — "predict that the price stays where it is" — turns out
to be the best strategy. That's because:

1. Government-administered prices barely move week-to-week
2. When they do move, the movement is hard to predict from any data we have
3. Most modeling improvements get eaten by noise

The system we shipped acknowledges this honestly:
- 22 of 24 cells route to **persistence** ("price stays where it is")
- 1 cell uses a **Wheat specialist** LGBM at the 12-week horizon (where there
  IS structure, around MSP regime changes)
- 1 cell uses a **quantile median** LGBM for Sugar at h=12 (heavy-tailed
  sugar prices benefit from a robust point forecast)

This is the right answer for this data, but it makes the headline accuracy
number (**4.61% weighted MAPE**) much closer to the persistence-only floor
(**4.62%**) than people typically expect from "a forecasting system." The
real value isn't in beating persistence everywhere; it's in:

- **Knowing when persistence is the right answer** (and not deploying
  expensive models there)
- **Knowing exactly which cells gain from learned models** (Wheat h=12 saves
  13.8% MAPE, Sugar h=12 saves 3.2%)
- **Quantifying uncertainty** — the chart shows a real ±confidence range
- **Detecting drift** — Phase 12 monitoring will tell us if/when the
  patterns shift (e.g., when 2026 MSP deregulation actually lands)

---

<a name="3b-primer"></a>
## 4. First-principles primer (zero ML knowledge assumed)

This section explains every idea the system relies on, starting from the
absolute basics. If you've taken even a basic statistics class you can skip
much of it; otherwise, read straight through.

### 4.1 What does it mean to "predict a price"?

The price of wheat in Faisalabad changes over time. Every day it has some
value — sometimes Rs 3,400, sometimes Rs 3,800, etc. We have records of
what it was every day for the past 17 years. **Predicting a price** means
guessing what it *will be* on some specific day in the future — say, 4 weeks
from now.

Concretely:

- Today's date: 2026-06-05
- Today's Wheat/Faisalabad price: Rs 3,775
- The forecast service makes 4 predictions:
  - 1 week from now (2026-06-12): Rs 3,789
  - 2 weeks from now (2026-06-19): Rs 3,802
  - 4 weeks from now (2026-07-03): Rs 3,840
  - 12 weeks from now (2026-08-28): Rs 4,056

None of these are guaranteed — they're educated guesses based on patterns
the system has learned. Each guess has an **uncertainty band** around it
(more on that below).

### 4.2 Why is this hard?

Three reasons:

1. **The future depends on things we can't see today.** Will there be a
   drought 4 weeks from now? Will the government announce an export ban
   tomorrow? We don't know.
2. **Many things influence price.** Local supply (how much wheat is in the
   mandi), global supply (world wheat prices), weather, currency rates,
   policy (MSP — see below), demand spikes (Ramadan, Eid), fertilizer
   prices. The system has to weigh all of them.
3. **The patterns shift over time.** What predicted wheat prices in 2015
   doesn't necessarily predict them in 2026 — the government changed the
   MSP regime, the rupee weakened, climate patterns shifted.

### 4.3 What is a "model"?

A **model** is a rule (or a set of rules) that takes some inputs and
produces an output. For us:

- **Input**: today's price, recent prices (last 4 / 13 / 52 weeks),
  weather, world prices, calendar, policy flags — about 75 numbers.
- **Output**: predicted price 1, 2, 4, or 12 weeks from now.

The model "knows" how to translate inputs into outputs because it **learned**
the relationship from 17 years of historical data. The learning process —
called **training** — looks at thousands of past examples like "when the
input numbers were X, the actual price 12 weeks later turned out to be Y"
and figures out the pattern.

> **Concrete analogy.** Imagine training a model to predict house prices.
> You show it 10,000 examples like "3 bedrooms, 2,000 sq ft, near a good
> school, in Lahore → sold for Rs 50 million." The model figures out which
> features (bedrooms, sq ft, school quality, city) matter and how much.
> Then you can give it a brand new house's features and ask "how much
> would this one sell for?" — that's prediction. Our system does the same
> thing but with crop prices instead of house prices.

### 4.4 The simplest model: "persistence"

The dumbest possible model is "tomorrow's price will be the same as
today's." This is called **persistence**.

Sounds silly, but on Pakistani mandi prices it's hard to beat. Why? Because
mandi prices are **sticky** — they don't move much week-to-week. The
government's MSP sets a floor; the wholesale market dynamics are slow;
information travels through the supply chain in days, not minutes.

**Persistence MAPE at h=1 (1 week ahead)**: 1.86%. That means on average,
"the price next week will be the same as today" is wrong by only ~Rs 70 on
a Rs 3,775 wheat price. Most "smart" models can't do better than that
because most of the time, the price genuinely doesn't move much.

### 4.5 What does "MAPE" mean?

**MAPE = Mean Absolute Percentage Error.**

A way to measure how wrong predictions are, as a percentage. Compute the
percent error for each prediction, take the absolute value (so over-predicting
and under-predicting both count), and average them.

> **Worked example.**
>
> Suppose you make 3 predictions:
> - Predicted Rs 3,800, actual was Rs 3,775. Error: (3800 - 3775) / 3775 = +0.66%
> - Predicted Rs 4,100, actual was Rs 4,200. Error: (4100 - 4200) / 4200 = -2.38%
> - Predicted Rs 3,950, actual was Rs 4,000. Error: (3950 - 4000) / 4000 = -1.25%
>
> Absolute errors: 0.66%, 2.38%, 1.25%.
> Mean: (0.66 + 2.38 + 1.25) / 3 = **1.43% MAPE**.
>
> Lower is better. 0% would mean perfect predictions (never happens in real
> data).

**Why percentage and not rupees?** Because we want to compare across
commodities with very different price scales. Sugar is ~Rs 150/Kg; wheat
is ~Rs 3,500/40Kg. Saying "off by Rs 50" means very different things for
those two. "Off by 2%" lets you compare apples-to-apples.

### 4.6 "Horizon" and the four numbers

We predict at **four different time horizons**: 1, 2, 4, and 12 weeks ahead.

These are separate forecasts. The 1-week-ahead model and the 12-week-ahead
model are different — each is tuned for its own time scale.

> **Why not predict every week from 1 to 12?** We could, but most users
> care about 4 specific time scales:
> - **1 week**: am I selling next Friday? what'll the price be?
> - **2 weeks**: planning a short trip to the mandi
> - **4 weeks**: ~1 month — short-term planning
> - **12 weeks**: ~3 months — covers a harvest cycle
>
> Adding intermediate horizons would mean more models to train, more
> predictions to store, no real new information for users.

### 4.7 What is "the panel"?

The **panel** is our main data table for modeling. Each row represents
**one specific (commodity, variety, city, week)** combination — for example:

| commodity | variety | city       | week        | price |
|-----------|---------|------------|-------------|------:|
| Wheat     | (null)  | Faisalabad | 2026-05-29  | 3775  |
| Wheat     | (null)  | Faisalabad | 2026-05-22  | 3760  |
| Rice      | IRRI    | Faisalabad | 2026-05-29  | 4050  |
| Sugar     | (null)  | Lahore     | 2026-05-29  | 152.5 |
| ...       | ...     | ...        | ...         | ...   |

The panel has **64,247 rows** total — that's 146 unique series (commodity ×
variety × city combinations) × ~440 weeks of history each (with some series
shorter due to missing data).

After we add features (lags, weather, etc.), each row has **89 columns**.

### 4.8 What does "weekly" mean? (W-FRI)

AMIS publishes **daily** prices, but daily data is noisy:
- Markets close on weekends and public holidays
- Some days have no auctions
- Holiday weeks skew the average

So we **resample** the daily data to weekly. For each (commodity, variety,
city, calendar week), we take the **mean price across that week** and call
it the "weekly price." We anchor the week to **Friday** (so a "week" runs
Saturday through Friday). This is the **W-FRI** convention.

> **Why Friday?** Pakistani mandis often have their busiest auctions early
> in the week; Friday represents a settled price. Also matches the
> reporting cadence of most external data sources.

### 4.9 What's a "feature"?

A **feature** is any single piece of information the model uses. For each
panel row (one week of one series), we attach 89 features:

| Group | What | Examples |
|---|---|---|
| **Own price (current)** | The price right now | `price` |
| **Own price (lags)** | Past prices | `price_lag_1`, `price_lag_4`, `price_lag_52` |
| **Rolling stats** | Smoothed past prices | `price_lag1_ma4` (4-week mean) |
| **Calendar** | When in the year | `cal_woy_sin`, `cal_is_ramadan` |
| **Weather** (lagged) | Local agro-climatology | `wx_precip_sum_lag1`, `wx_tmax_max_lag1` |
| **Markets** (lagged) | Daily futures + USD/PKR | `yf_wheat_cbot_lag1`, `yf_usdpkr_lag1` |
| **World prices** (lagged) | Monthly World Bank | `wb_wheat_hrw_lag1`, `wb_brent_lag1` |
| **Cross-commodity** | Other crops' recent moves | `xc_maize_pct4w`, `xc_sugar_pct4w` |
| **Policy / MSP** | Government regime | `msp_regime`, `msp_weeks_since_change`, `pol_export_ban` |
| **Categorical** | Identity | `commodity`, `variety`, `city`, `unit` |

When the model makes a prediction, it consumes ALL of these for the row it's
predicting from.

### 4.10 What is a "lag"?

A **lag** is just "the value of something N weeks ago."

- `price_lag_1` for week T = price at week T - 1 (last week)
- `price_lag_4` for week T = price at week T - 4 (a month ago)
- `price_lag_52` for week T = price at week T - 52 (a year ago)

Why we need lags: a model trained without lags would see only "this week's
price" and "this week's weather." That's not enough to detect patterns like
"prices tend to rise 3 weeks after heavy rain at planting time."

We include lags at **1, 2, 4, 8, 13, 26, 39, and 52 weeks** for the price
itself, and **1 week** for every weather/market/world variable.

> **The danger of NOT lagging exogenous data**: if you give the model
> "this week's weather" as a feature, it learns to associate today's
> weather with today's price — which is fine for explaining today, but
> useless for forecasting because you don't know next week's weather yet.
> By lagging by 1 week, we ensure the model only uses information
> physically available at the time of prediction. Phase 5 of the pipeline
> exists entirely to enforce this.

### 4.11 What is "leakage" and why it matters

**Leakage** is when information that wouldn't be available at prediction
time accidentally seeps into the training data. It causes the model to
look amazing on tests but fail catastrophically in production.

Three places leakage can creep in:

1. **The target itself in features**: e.g., the model sees the price it's
   supposed to predict. Trivial leak — the model learns to copy it. We
   guard against this by dropping `price_raw` (the un-winsorized price)
   before training.
2. **Contemporaneous exogenous data**: weather, world prices, etc., as of
   the prediction's TARGET date instead of the ANCHOR date. We guard
   against this by lagging every external variable by 1 week.
3. **Eval-set leak**: using the test data during training (e.g., as the
   early-stopping validation set). We hit this in Phase 6 and fixed it in
   Phase 6.5 — the symptom was an artificially good MAPE that didn't
   replicate in production.

### 4.12 What is "MSP"?

**MSP = Minimum Support Price.** A government-set floor below which the
government commits to buy a commodity. The state guarantees farmers won't
sell below this price. It's a major price driver in Pakistan, especially
for **Wheat**.

The MSP history in our data:
- **2009–2024**: active (incrementing values over time, Rs 950 → Rs 3,900 per 40Kg)
- **2024-10**: abolished (under IMF program)
- **2025-03**: reinstated (Rs 3,500 per 40Kg)
- **2026-05**: deregulation legislated (transition period now)

These regime breaks are the biggest single source of price-pattern shifts
in the data, and the only place where our LGBM specialist consistently
beats persistence.

### 4.13 What does "the model" actually do, mechanically?

We use **LightGBM**, which is a **gradient-boosted decision tree** model.
That sounds intimidating but the core idea is simple:

- A **decision tree** is a flowchart of yes/no questions:
  ```
  Is the current price > Rs 3,500?
    YES → Is the city Faisalabad?
            YES → Is msp_regime = "reinstated"?
                    YES → predict +3.2% over 12 weeks
                    NO  → predict -1.1% over 12 weeks
            NO  → ...
    NO → ...
  ```
- One tree alone isn't very accurate. So LightGBM trains **many trees in
  sequence** (typically 300-1,000), where each new tree learns to correct
  the mistakes of the previous trees combined.
- The final prediction is the **sum** of all the trees' outputs.

This is called **gradient boosting**. It's the workhorse algorithm for
tabular forecasting — won the M5 forecasting competition, used in
production at countless companies.

We don't use deep neural networks because:
1. Our dataset is small (~60k training rows) — neural nets need millions
2. LightGBM trains in seconds on CPU; neural nets need GPU
3. LightGBM handles missing data and categorical features natively; neural
   nets need careful preprocessing
4. For tabular data with mixed types, LightGBM is at or near the state of
   the art

### 4.14 Why is the target "pct change" and not "the actual price"?

A subtle but critical design choice.

**Naive approach**: train the model to predict the future price directly.
"Given these features, the price 12 weeks from now will be Rs 3,840."

**Problem**: our 6 commodities live on wildly different price scales.
- Wheat: ~Rs 3,000-4,500 per 40Kg
- Sugar: ~Rs 80-180 per Kg

If we train one model on both, the loss function (how the model judges its
mistakes) is dominated by the wheat rows because the raw error numbers are
20× bigger. The model essentially ignores sugar.

**Fix**: predict the **percentage change** from the current price, not the
absolute price.

- For each training row, the target is `(future_price - current_price) /
  current_price`.
- All commodities now live on the same target scale (typically -10% to
  +10% per week).
- At prediction time, we run the model to get a pct change, then
  reconstruct the absolute price: `predicted = current × (1 + pct)`.

> **The number this changed**: when we tried predicting absolute prices,
> Sugar's MAPE was ~50%. After switching to pct-change target, Sugar's
> MAPE dropped to ~7%. Same model, same data, just a different way of
> framing the target.

### 4.15 What is "the router"?

Different cells (commodity × horizon combinations) want different models.
- Wheat at 1 week ahead → persistence wins
- Wheat at 12 weeks ahead → LGBM specialist wins
- Sugar at 12 weeks ahead → LGBM quantile median wins
- etc.

The **router** is a small JSON config that records, for each cell, **which
model the prediction service should run**. It's not a model itself — it's
a routing table.

This replaces a more complicated alternative (a **stacking ensemble** — a
meta-model trained to combine other models' predictions). With persistence
winning 22 of 24 cells, the meta-model would mostly learn "use persistence"
— basically the router we have, with more overfit risk and more code.

### 4.16 What is "uncertainty"?

A single number ("price will be Rs 4,056 in 12 weeks") is misleading because
no real-world prediction is exact. We always provide a **band** — a range
of likely values.

Two kinds of bands in our system:

1. **Rule-of-thumb band**: `predicted ± expected_mape%`. For most cells,
   we don't have a real probabilistic model — we just use the holdout
   MAPE as an "expected typical error" and show a band of that width.
2. **Real quantile band**: for Sugar at h=12 specifically, we train three
   separate LightGBM models — one for the 10th percentile, one for the
   50th (median), one for the 90th. The chart shows the band from the
   10th-percentile prediction to the 90th-percentile prediction.

The real band is more meaningful but more expensive to train. We only do it
for cells where it's worth the cost.

> **Empirical coverage**: when we measure how often the actual price falls
> inside our 10-90 band, we get ~69% coverage (would be 80% in theory).
> Close enough to be useful, but the chart labels this "Confidence range"
> rather than "80% CI" to be honest.

---

<a name="4-background-concepts"></a>
## 5. Background concepts (terms you'll see throughout)

This section defines every technical term used elsewhere in the doc. You can
skip if you know them, or read it once and refer back.

### 4.1 Time series

A **time series** is a sequence of measurements indexed by time. The price of
wheat in Faisalabad every Friday is a time series. The temperature in
Lahore every day is a time series. What makes time series different from
other data: the order matters, and each value is correlated with the values
near it in time.

### 4.2 Forecasting

**Forecasting** = predicting future values of a time series. Different from
ordinary prediction: in forecasting, you're using past values *of the same
series* (and sometimes other things) to predict its future.

### 4.3 Horizon

The **forecast horizon** is how far ahead you're predicting. We forecast at
four horizons: **1 week, 2 weeks, 4 weeks, 12 weeks**. Each is a separate
prediction; the model for "next week" is different from the model for
"3 months out."

### 4.4 MAPE (Mean Absolute Percentage Error)

The main number we use to measure how good a forecast is.

> **MAPE = average of |actual − predicted| / actual, expressed as a
> percentage.**

A MAPE of 5% means our predictions are off by ~5% on average. For a wheat
price of Rs 3,500, that's about Rs 175 off. Lower is better. A MAPE of 0
would mean perfect predictions (impossible in practice).

Why "absolute": we average the magnitude of errors, treating "Rs 100 too
high" and "Rs 100 too low" the same. Why "percentage": so we can compare
across commodities with very different price scales (Wheat ~3,500 vs Sugar
~150 makes raw error misleading).

### 4.5 Holdout, train, test, validation

To check whether a model generalizes (works on data it hasn't seen), we:

- **Train set**: the data the model learns from (~95% of our data).
- **Holdout / test set**: data the model never sees during training; we
  measure MAPE on it. For us, the test set is the most recent **52 weeks**
  per series.
- **Validation set**: a third bucket, used during training to decide when
  to stop (so the model doesn't memorize the training set). We use the
  26 weeks before the test set as validation.

A common mistake — and one we made and fixed (see Phase 6.5) — is using the
test set as the validation set. That's called an **eval-set leak**: the
model gets to peek at the test data during training, so the reported MAPE on
the test set is artificially low.

### 4.6 Persistence / naive baselines

A **baseline** is a stupid-simple prediction we compare smarter models to. If
a complicated model can't beat the baseline, the complicated model is
useless. Our three baselines:

- **Persistence**: "next week's price = this week's price." MAPE = 1.86% at
  h=1, 9.80% at h=12 (across all commodities, recent year).
- **Seasonal naive**: "next week's price = the price 52 weeks ago." MAPE ~22%
  at every horizon — terrible, because Pakistani prices don't repeat
  year-over-year (inflation, MSP changes, supply shocks).
- **ma4** (moving average over the last 4 weeks): MAPE ~5% at h=1.
  Smoother than persistence but loses information.

### 4.7 Categorical vs numerical features

A **feature** is an input to the model. Features come in two flavors:

- **Numerical**: a number with meaningful order. Price, temperature,
  weeks-since-MSP-change.
- **Categorical**: a label with no inherent order. Commodity name (Wheat /
  Rice / Sugar...), city (Faisalabad / Lahore...), MSP regime status
  (active / abolished / reinstated / deregulated).

We use **LightGBM** which natively handles categoricals via clever splits;
no one-hot encoding needed.

### 4.8 LightGBM / gradient boosting

**LightGBM** is the specific machine-learning algorithm we use. It's a
**gradient-boosted decision tree** model:

- A **decision tree** is a flowchart that asks yes/no questions about the
  data ("is wheat price > 3000?", "is the city Faisalabad?") and outputs a
  prediction at the bottom.
- **Gradient boosting** means training many small decision trees in
  sequence, where each tree tries to correct the mistakes of the previous
  trees. The final prediction is the sum of all the trees' outputs.

We use it because:
- It handles missing data, categorical features, and mixed numeric/categorical
  inputs natively
- It trains fast on CPU (no GPU needed)
- It's the workhorse that won the M5 forecasting competition (the biggest
  public forecasting contest)
- The inference is microseconds — fits inside the EC2 container with no
  problem

### 4.9 Lag features

For forecasting, you can't use information that wouldn't be available at the
moment of prediction. That information is called **leakage**. To avoid it,
we use **lag features**: the price 1 week ago, 2 weeks ago, 4 weeks ago,
etc. Lag-1 of the price at week T is the price at week T-1. We add lags at
1, 2, 4, 8, 13, 26, 39, and 52 weeks back.

### 4.10 Pct-change target

Instead of predicting the absolute future price directly, we predict the
**percentage change** from the current price. So if Wheat in Faisalabad is
Rs 3,000 this week, and the model predicts +5%, the absolute price
prediction is Rs 3,150.

Why this matters: Sugar prices are ~Rs 150 (Rs/Kg) while Wheat prices are
~Rs 3,500 (Rs/40Kg). A model trained on absolute prices would be dominated
by the high-priced commodities and mis-predict Sugar by 10×. Predicting
percentage change normalizes everything onto the same scale.

### 4.11 The "panel"

The **panel** is the master modeling table. It has one row per
**(commodity, variety, city, week)** combination, plus columns for the price
and all the features we add to it. After all cleaning it has **64,247 rows
and (after lag features) 89 columns**.

> **Variety**: a sub-type of a crop. Rice has varieties like IRRI, Basmati
> 385, Kainat. Wheat / Sugar / Maize / Seed Cotton have no varieties (the
> variety field is `null` for those).

> **Weekly resampling**: AMIS publishes daily prices but daily data is noisy
> (markets closed on weekends, holidays). We compute one number per series
> per week, anchored to Friday. This is the **W-FRI** convention.

### 4.12 Router

A **router** is a small piece of code that, for each forecast cell,
decides which model to use. It's not a model itself — it's a JSON file
that maps `{commodity}__h{horizon}` to one of:
- `persistence` (use the current price)
- `ma4` (use the 4-week moving average)
- `lgbm` (use the global LightGBM model)
- `lgbm_per_commodity` (use a commodity-specialist LightGBM)
- `lgbm_quantile_median` (use the median-quantile LightGBM)

The router was built to replace a more complicated **stacking ensemble**
that was in the original plan. We found stacking added overfit risk for very
little MAPE gain.

### 4.13 Uncertainty / confidence band

A point forecast is one number; a **band** is a range. We provide two kinds:

- For most cells: a **rule-of-thumb** band = predicted_price ± expected_mape%.
- For Sugar h=12 specifically: a **real quantile band** from the 10th and
  90th percentile predictions of a quantile-LGBM trained separately.

The empirical coverage of the real band is **69%** (we'd want 80% in
theory). Close enough to be useful, but the chart labels it "Confidence
range" rather than "80% CI."

---

<a name="5-the-data"></a>
## 5. The data we work with

### 5.1 Where it comes from

- **Historical prices**: scraped from the government AMIS portal, 2009-2026,
  ~268,000 daily records.
- **Live prices**: the same scraper (`scrapper/amis_scraper.py`) pulls
  current prices several times a day and writes them to MongoDB Atlas.
- **External factors** (added in Phase 3):
  - **World prices**: World Bank "Pink Sheet" monthly commodity benchmarks
    (wheat HRW/SRW, maize, rice Thai/Vietnam, sugar, cotton A, DAP/urea
    fertilizer, Brent crude oil).
  - **Markets / FX**: Yahoo Finance daily futures (CBOT wheat, corn,
    cotton, sugar, Brent) and the USD/PKR exchange rate.
  - **Weather**: NASA POWER satellite data per city — daily rainfall,
    temperature (mean / max / min), humidity, going back to 2009.
  - **Calendar / policy**: Islamic calendar (Ramadan, Eid), Punjab harvest
    months, and a hand-curated CSV of every export ban, MSP regime change,
    IMF program, etc., since 2008.

### 5.2 What we cleaned

Bad data ruins forecasts. We did three big cleanup passes:

1. **Unit normalization**: old records mixed `Rs/100Kg` and `Rs/40Kg`,
   creating a visible "cliff" on the chart. We converted everything to one
   canonical unit per commodity (Rs/40Kg "Maund" for grains, Rs/Kg for
   sugar).
2. **Rice/paddy variety unification**: variant names like `"Rice (IRRI)"`
   were stored as the COMMODITY name itself. We migrated to
   `commodity:"Rice" + variety:"IRRI"` to make per-variety series continuous.
3. **Outlier flagging**: a robust statistical filter (median + Median
   Absolute Deviation, requiring 40%+ local gap to flag) caught 540 typos.
   We don't delete them — we set `excluded: true` so they're hidden from
   queries but recoverable.

Total docs flagged: 2,493. Total docs in DB: ~270,000.

### 5.3 The panel build (`ml/training/build_panel.py`)

Turns the messy daily DB into a clean weekly table:

1. Pull all FQP-priced records, excluding flagged outliers, for our 6 target
   commodities
2. Resample to weekly (W-FRI mean) per (commodity, variety, city)
3. Forward-fill gaps ≤ 4 weeks (longer gaps stay as NaN)
4. Winsorize each series to its 1st/99th percentile (clip extreme outliers
   that survived the earlier cleanup)
5. Output `panel.parquet`: 64,247 rows × 11 columns

### 5.4 Feature engineering

Each step adds columns to the panel. After all of them:

| Stage | What gets added | Cols |
|---|---|---:|
| `build_deterministic.py` | Calendar (year/month/week-of-year sin/cos, Ramadan/Eid flags), harvest windows, policy flags from policy_events.csv, MSP regime + value + new derivatives (weeks_since_change, yoy_ratio, announcement_window) | +35 |
| `build_features.py` | Weather (5 vars × city × week), markets (7 daily futures, resampled to weekly), WB monthly (12 commodities, joined by month with "as-of" rule), cross-commodity 4-week pct change for each of 6 commodities | +30 |
| `build_lagged.py` | Own-price lags at 1/2/4/8/13/26/39/52 wks, rolling means/std on lag-1 price, 1-wk lag of every weather/market/WB column (anti-leakage), shifted targets y_1/y_2/y_4/y_12 | +23 |

Final modeling input: `features_lagged.parquet` (64,247 × 89).

---

<a name="6-architecture"></a>
## 6. The architecture, end-to-end

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  USER OPENS https://www.farmkonnect.app/dashboard                   │
│        │                                                            │
│        ▼                                                            │
│  ┌─────────────┐                                                    │
│  │  Frontend   │  React + Vite + recharts                           │
│  │  (nginx)    │  PriceChart.jsx                                    │
│  └─────────────┘                                                    │
│        │                                                            │
│        │  GET /api/prices/history?commodity=Wheat&city=Faisalabad   │
│        │  GET /api/prices/forecast?commodity=Wheat&city=Faisalabad  │
│        ▼                                                            │
│  ┌─────────────┐                                                    │
│  │  Backend    │  Node + Express + Mongoose                         │
│  │  (port 3000)│  priceController.js / models/{CommodityPrice,     │
│  │             │            PricePrediction}.js                     │
│  └─────────────┘                                                    │
│        │                                                            │
│        │  Mongoose queries                                          │
│        ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐            │
│  │ MongoDB Atlas (cloud, M0 free tier)                 │            │
│  │  • commodityprices       — actual prices (~270k)    │            │
│  │  • pricepredictions      — forecasts (~6,684)       │            │
│  │  • prediction_monitoring — rolling-MAPE summaries   │            │
│  └─────────────────────────────────────────────────────┘            │
│        ▲                            ▲                               │
│        │ writes hourly              │ writes weekly + monitors      │
│        │                            │                               │
│  ┌─────────────┐              ┌─────────────────────────┐           │
│  │  Scraper    │              │  Prediction service     │           │
│  │ (Python)    │              │  (Python + LightGBM)    │           │
│  │  pulls AMIS │              │   • run_loop.py         │           │
│  │  → Mongo    │              │   • predict_and_upsert  │           │
│  └─────────────┘              │   • monitor.py          │           │
│                               └─────────────────────────┘           │
│                                                                     │
│  All services in their own Docker containers on a single EC2 VM,    │
│  brought up together with docker-compose.                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.1 The prediction service (Phase 8 + 12)

A long-running Docker container (`farmkonnect_prediction_service_1`) that
ticks every hour. On each tick:

1. **Is the predictions collection empty?** → Run a 12-week backfill (the
   "first run" path).
2. **Is today ≥ Saturday relative to the most recent Friday, AND no
   predictions exist for that Friday yet?** → Run a weekly cycle.
3. **Either way**: also run the monitor, which compares old predictions
   against actual prices that have now landed and writes rolling-MAPE stats.

A weekly cycle (~100 seconds):
1. `build_panel.py` pulls fresh prices from Atlas (~10s)
2. External collectors refresh weather / WB / yfinance (cached after first
   run; ~5-45s)
3. `build_deterministic.py` + `build_features.py` + `build_lagged.py`
   reconstruct features (~5s)
4. Router config + relevant LGBM bundles loaded (~2s)
5. For each (commodity, variety, city) series, take the latest valid week,
   dispatch via router, predict, upsert to Atlas
6. `monitor.py` runs over the predictions whose forecast_date has now passed

The whole thing is one container, one Python process, scheduled by a simple
hourly loop. No Kubernetes, no message queue, no FastAPI. The scheduler is
idempotent — if the container restarts mid-week, the next tick figures out
where it left off.

### 6.2 Router (Phase 7)

The `ml/training/router/router_config.json` file is the source of truth for
"which model handles which cell." It's small (24 entries) and human-readable.
Current production:

```json
{
  "Wheat__h12": {
    "model": "lgbm_per_commodity",
    "expected_mape": 14.64,
    "edge_pct": 13.79,
    "reason": "beats_persistence_by_13.8pct"
  },
  "Sugar__h12": {
    "model": "lgbm_quantile_median",
    "expected_mape": 7.37,
    "edge_pct": 3.24,
    "reason": "beats_persistence_by_3.2pct"
  },
  "Wheat__h1": {
    "model": "persistence",
    "expected_mape": 2.36,
    "edge_pct": 0.0,
    "reason": "persistence_is_best"
  },
  ...
}
```

Selection rule: for each cell, take the candidate with the lowest MAPE on
the same recent-year holdout — **but only if that candidate beats
persistence by ≥1%**. Below 1% edge, persistence wins by default. This
defends against shipping flatter-by-noise winners.

---

<a name="7-models-plain"></a>
## 7. How the models work, in plain language

Three families of model, each appropriate for different cells:

### 7.1 Persistence ("the price will stay the same")

Used for **22 of 24 cells**, including everything at horizon ≤ 4 weeks.

Why this works: Pakistani mandi prices are set by a mix of government policy
(MSP), accumulated supply (harvests come once or twice a year, then prices
drift slowly), and aggregated demand. None of these change much
week-to-week. The "best guess" for next week is just "no change."

How: literally, `predicted_price = current_price`. No model, no parameters.

### 7.2 Per-commodity LightGBM specialist ("a learned model for THIS crop")

Used for **Wheat h=12** specifically (the 12-week-ahead forecast for wheat
in any city).

Why: Wheat is the most policy-sensitive crop in Pakistan (the MSP regime
abolished in 2024, reinstated in 2025, deregulating in 2026 means big
multi-week price moves). A model trained only on Wheat data, with all the
relevant features (MSP regime, weeks-since-change, year-over-year MSP
ratio, world wheat price, fertilizer prices), can pick up patterns that
"price stays the same" misses.

How: we feed the model a vector of ~75 numbers (lagged prices, lagged
weather, lagged world prices, calendar/policy flags, cross-commodity
signals) and it outputs a percentage change. We then compute
`predicted_price = current_price × (1 + that_percentage)`.

Measured improvement: Wheat h=12 MAPE drops from **16.98% (persistence) to
14.64% (specialist)**, a 13.8% relative gain. In absolute Rs: about Rs 100
less error per prediction on a typical Rs 3,500 wheat price.

### 7.3 Quantile median LightGBM ("a robust median forecast")

Used for **Sugar h=12** specifically.

Why: Sugar has heavy-tailed pct changes — usually small, occasionally huge.
The mean-trained LightGBM gets dragged around by those big movements and
makes worse predictions on a typical week. A median-trained model (one that
minimizes the median absolute error instead of the mean) is more robust.

Bonus: training at the same time at the 10th and 90th percentiles gives us a
real **confidence band** — "we're 80% sure the price 12 weeks from now is
between X and Y." The chart shows this as a shaded orange strip.

Measured improvement: Sugar h=12 MAPE drops from **7.62% (persistence) to
7.37% (quantile median)**, a 3.2% relative gain. Small but real, plus the
band quality (empirical 80% coverage = 69%) is more useful than a point
forecast.

---

<a name="7b-models-technical"></a>
## 8. How the models work, technically

This section is for engineers who want the actual training details. Skip if
not needed.

### 8.1 Training data

- **Input file**: `ml/training/data/features_lagged.parquet` (64,247 × 89).
- **Target**: the percentage change column `(y_h − price) / price` per
  horizon h ∈ {1, 2, 4, 12}.
- **Train / val / test split** (per series):
  - Test = last 52 weeks per series (~4,690 rows total)
  - Validation = the 26 weeks before that (~2,300 rows total) — used for
    early stopping
  - Train = everything before that (~57,000 rows)

### 8.2 Categorical features

LightGBM gets these as native categoricals (no one-hot):
- `commodity` ∈ {Wheat, Rice, Paddy, Maize, Sugar, Seed Cotton (Phutti)}
- `variety` ∈ {null, IRRI, Basmati 385, Basmati Super New/Old, Kainat New,
  Basmati, Kainat}
- `city` ∈ {Lahore, Faisalabad, Gujranwala, Okara, Sargodha, Rawalpindi,
  Multan, RahimYarKhan, Layyah, BahawalPur, BahawalNagar, Chichawatni,
  Sialkot, Jhang}
- `unit` ∈ {Rs/40Kg (Maund), Rs/Kg}
- `msp_regime` ∈ {active, abolished, reinstated, deregulated}

### 8.3 LightGBM hyperparameters

```
n_estimators=2000      # max trees
learning_rate=0.05     # how fast each tree corrects
num_leaves=63          # max leaves per tree
min_data_in_leaf=20    # don't split a leaf with fewer rows
feature_fraction=0.9   # random feature subset per tree
bagging_fraction=0.9   # random row subset per tree
bagging_freq=5         # re-sample every 5 trees
early_stopping(100)    # stop if val loss doesn't improve for 100 trees
```

These are conservative defaults. We didn't sweep them — the headroom from
hyperparameter tuning on a dataset this size is small, and we'd rather
spend that complexity budget on feature engineering.

### 8.4 Three training variants

1. **Global** (`train_lgbm.py`): one model per horizon, all 146 series
   pooled, commodity passed as a categorical. Trains in ~2 min per horizon.
2. **Per-commodity** (`train_lgbm_per_commodity.py`): one model per
   (commodity, horizon) pair, only for Wheat / Paddy / Seed Cotton (the
   harder series). Trains in ~30s each.
3. **Quantile** (`train_lgbm_quantile.py`): three models at h=12, with
   `objective="quantile"` at α ∈ {0.1, 0.5, 0.9}.

After training, each model is saved as a joblib bundle:
```python
{
  "model": LGBMRegressor,
  "feature_cols": [...],         # exact column order training saw
  "categoricals": [...],         # which cols are categorical
  "horizon": int,
  "best_iteration": int,
}
```

### 8.5 Router build (`build_router.py`)

Reads three metrics CSVs (baselines, global LGBM, per-commodity LGBM,
quantile LGBM) and picks the lowest-MAPE candidate per cell subject to the
1% edge threshold. Emits `router_config.json` (the production routing) +
`router_summary.csv` (human-readable).

Critical rule (learned from the Chronos episode): all candidate metrics
**must be computed on the same set of (series, anchor_date) tuples**.
Comparing MAPEs from different test sets is silently wrong — see
`ml/training/router/ROUTER.md § Negative result`.

### 8.6 Inference path

The prediction service (`prediction_service/predict_and_upsert.py`):

1. Loads `router_config.json` → list of (commodity, horizon) cells
2. Loads ONLY the joblib bundles the router actually references (lazy)
3. Re-runs the Phase 2+3+5 pipeline to get a fresh `features_lagged.parquet`
4. For each (commodity, variety, city) series, takes the latest valid row
   (live mode) or last 12 valid rows (backfill mode)
5. For each horizon, looks up the routed model:
   - **persistence**: `y_pred = current price`
   - **ma4**: `y_pred = price_lag1_ma4` from the parquet
   - **lgbm / per_commodity / quantile_median**: feed the feature vector
     to the model, get back a pct change, reconstruct `price × (1 + pct)`
   - **For quantile_median**: also run q10 and q90 models to get
     `predicted_price_low/high` and sort them in case quantiles cross
6. Bulk-upserts to Atlas, keyed by
   `(commodity, variety, city, forecast_date, horizon_weeks)` (unique index)

Total time per cycle: ~100s, dominated by the panel pull from Atlas (~10s)
and the NASA POWER weather fetch (~40s the first time, cached after).

---

<a name="8-accuracy"></a>
## 9. Accuracy results, with what the numbers mean

### 9.1 Headline number

**Weighted MAPE across all 24 (commodity, horizon) cells, weighted by sample
count: 4.61%.**

What that means: averaged across all our forecast cells, weighted by how
many predictions each makes, our prediction is **off by 4.61% on average**.
For a Rs 3,500 wheat forecast, that's about Rs 160 off.

### 9.2 By horizon (weighted across commodities)

| Horizon | Persistence-only MAPE | Phase 6.5 router MAPE | Translation                                                |
|---:|---:|---:|---|
| 1 week  | 1.86% | **1.86%** | ~Rs 65 off on a Rs 3,500 wheat price                       |
| 2 weeks | 3.19% | **3.19%** | ~Rs 112                                                   |
| 4 weeks | 5.35% | **5.35%** | ~Rs 187                                                   |
| 12 weeks| 9.80% | **9.57%** | ~Rs 335 (down from Rs 343 thanks to Wheat / Sugar specialists) |

Persistence alone gets you 22 of 24 cells; the modeling only helps at h=12.

### 9.3 By commodity at each horizon (which model the router chose, MAPE in %)

| Commodity            | h=1  | h=2  | h=4  | h=12                       |
|----------------------|----:|----:|----:|----------------------------:|
| Sugar                | 1.17 | 2.06 | 3.64 | **7.37** (quantile median) |
| Rice                 | 1.34 | 2.29 | 3.88 | 7.16                       |
| Maize                | 2.18 | 3.69 | 5.91 | 10.57                      |
| Wheat                | 2.36 | 4.15 | 7.50 | **14.64** (specialist)     |
| Seed Cotton (Phutti) | 2.39 | 4.13 | 6.44 | 9.65                       |
| Paddy                | 4.17 | 7.10 | 11.83| 17.63                      |

Easiest cell: **Sugar h=1** at 1.17% (sugar barely moves week-to-week).
Hardest cell: **Paddy h=12** at 17.63% (sparse data, seasonal swings).

### 9.4 What the LGBM specialists actually buy us

| Cell        | Persistence | LGBM/specialist | Edge       |
|-------------|------------:|----------------:|-----------:|
| Wheat h=12  | 16.98%      | **14.64%**      | -13.8% relative (-2.34 pp absolute) |
| Sugar h=12  | 7.62%       | **7.37%**       | -3.2% relative (-0.25 pp absolute)  |

The Wheat h=12 win is the only big one. It's tied to the MSP regime
transitions (2024 abolished, 2025 reinstated). When the 2026 deregulation
plays out, the specialist might lose its edge — Phase 12 monitoring will
catch that.

### 9.5 Live monitoring results

First check (2026-06-03): **16 active cells, 0 drift alarms**. The
production rolling-MAPE matches the holdout-MAPE within noise. Highest live
MAPE so far: Wheat h=4 at 7.25% vs router-recorded 7.50% — well within the
1.5× threshold.

---

<a name="8b-worked"></a>
## 11. Worked example — a single prediction, start to finish

Let's walk through one concrete prediction: **Wheat in Faisalabad,
12 weeks ahead**, as of the most recent panel close on Friday 2026-06-05.

### Step 1: What data does the model see?

The pipeline produces a feature row for **(Wheat, Faisalabad, 2026-06-05)**.
A sampling of what's in it (89 columns total, just the interesting ones
shown):

| Feature group | Column | Value | What it means |
|---|---|---|---|
| Current price | `price` | 3775.20 | The Wheat/Faisalabad price for the week ending Fri 2026-06-05 |
| Own-price lag | `price_lag_1` | 3760.40 | Same series, 1 week ago |
| Own-price lag | `price_lag_4` | 3812.00 | 4 weeks ago |
| Own-price lag | `price_lag_52` | 3450.00 | 1 year ago — captures yearly cycle |
| Rolling stat | `price_lag1_ma4` | 3789.10 | Mean of the last 4 weeks (before current) |
| Categorical | `commodity` | "Wheat" | The commodity (passed natively to LGBM as a category) |
| Categorical | `city` | "Faisalabad" | The city |
| Categorical | `msp_regime` | "deregulated" | Current MSP regime — we're in the deregulation transition |
| MSP derivative | `msp_weeks_since_change` | 4 | 4 weeks since the 2026-05-15 deregulation event |
| MSP derivative | `msp_value_yoy_ratio` | 1.00 | MSP / MSP-52-weeks-ago (Rs 3500 / Rs 3500 = 1.00) |
| Policy flag | `pol_announcement_window` | 0 | We're outside the ±2 wk window of any MSP change |
| Weather (lagged) | `wx_precip_sum_lag1` | 0.0 | No rainfall last week in Faisalabad |
| Weather (lagged) | `wx_tmax_max_lag1` | 41.5 | Max temperature last week — hot, summer |
| Weather (lagged) | `wx_t2m_mean_lag1` | 33.8 | Mean temperature last week |
| Markets (lagged) | `yf_wheat_cbot_lag1` | 580.25 | CBOT wheat futures close last week (cents/bushel) |
| Markets (lagged) | `yf_usdpkr_lag1` | 277.14 | USD/PKR exchange rate last week |
| World Bank | `wb_wheat_hrw_lag1` | 282.00 | World Bank Pink Sheet HRW wheat price (US$/MT, as-of latest month) |
| World Bank | `wb_dap_lag1` | 595.40 | DAP fertilizer price (US$/MT) |
| World Bank | `wb_crude_brent_lag1` | 84.30 | Brent crude oil (US$/bbl) |
| Cross-commodity | `xc_maize_pct4w` | -0.024 | Maize prices in Faisalabad have dropped ~2.4% over the last 4 wks |
| Cross-commodity | `xc_rice_pct4w` | +0.018 | Rice prices in Faisalabad up ~1.8% |
| Calendar | `cal_woy` | 23 | Week 23 of the year (June) |
| Calendar | `cal_is_ramadan` | 0 | Not Ramadan |
| Calendar | `cal_is_harvest` | 0 | Not in the wheat harvest window (Apr-May) |

### Step 2: What does the router say?

The prediction service reads `router_config.json` and looks up
`"Wheat__h12"`:

```json
{
  "commodity": "Wheat",
  "horizon": 12,
  "model": "lgbm_per_commodity",
  "expected_mape": 14.64,
  "edge_pct": 13.79,
  "reason": "beats_persistence_by_13.8pct"
}
```

So we'll use the **lgbm_per_commodity** specialist for Wheat at h=12. The
specific joblib file: `ml/training/models/lgbm_wheat_h12.joblib`.

(For comparison, `"Wheat__h1"` → `model: "persistence"`, so the 1-week
prediction would just be `predicted = current_price = 3775.20`.)

### Step 3: The LGBM specialist makes a prediction

The prediction service:
1. Loads `lgbm_wheat_h12.joblib` (~3 MB, contains a fitted LightGBM model
   with ~127 trees plus the `feature_cols` and `categoricals` schema)
2. Selects the 75 feature columns the model was trained on
3. Casts categorical columns (`commodity`, `variety`, `city`, `unit`,
   `msp_regime`) to pandas `category` dtype
4. Calls `model.predict(X)` which returns a single number: the predicted
   **percentage change** in price over 12 weeks
5. For our example, the model outputs: `pct_pred = +0.0744`

### Step 4: Reconstruct the absolute price

```
predicted_price = current_price × (1 + pct_pred)
                = 3775.20 × (1 + 0.0744)
                = 3775.20 × 1.0744
                = 4056.17 Rs/40Kg
```

So the model is saying: 12 weeks from now (week ending 2026-08-28), Wheat
in Faisalabad will be **Rs 4,056** (up 7.4% from today's Rs 3,775).

### Step 5: Compute the uncertainty band

This cell uses `lgbm_per_commodity`, which doesn't have a real quantile
band. So we use the rule-of-thumb:

```
band_width = expected_mape%  =  14.64%
predicted_price_low_band  = 4056.17 × (1 - 0.1464) = 3462
predicted_price_high_band = 4056.17 × (1 + 0.1464) = 4650
```

(For Sugar h=12 — the only cell with real quantile bands — we'd run two
more LightGBM models, `lgbm_h12_q10.joblib` and `lgbm_h12_q90.joblib`, on
the same feature vector and use their outputs as the low/high band.)

### Step 6: Construct the prediction document

The service builds a document and bulk-upserts it to MongoDB Atlas's
`pricepredictions` collection:

```json
{
  "commodity":            "Wheat",
  "variety":              null,
  "city":                 "Faisalabad",
  "unit":                 "Rs/40Kg (Maund)",
  "anchor_date":          ISODate("2026-06-05T00:00:00Z"),
  "anchor_price":         3775.20,
  "forecast_date":        ISODate("2026-08-28T00:00:00Z"),
  "horizon_weeks":        12,
  "predicted_price":      4056.17,
  "model":                "lgbm_per_commodity",
  "expected_mape":        14.64,
  "router_version":       1,
  "router_generated_at":  "2026-06-03T10:45:03Z",
  "generated_at":         ISODate("2026-06-03T10:55:41Z")
  // (No predicted_price_low / _high — Wheat doesn't have a quantile model)
}
```

Unique key: `(commodity, variety, city, forecast_date, horizon_weeks)`.
If we run the predict cycle again later with the same anchor, this doc gets
**updated** rather than duplicated.

### Step 7: A user opens the chart

A user navigates to https://www.farmkonnect.app/dashboard and picks
"Wheat / Faisalabad". The frontend:
1. Fetches `/api/prices/history?commodity=Wheat&city=Faisalabad&days=180`
   → gets daily prices for the last 6 months (solid green line on the chart)
2. Fetches `/api/prices/forecast?commodity=Wheat&city=Faisalabad`
   → gets all 4 horizon forecasts anchored to the latest week (4 dots on
   the dashed orange line, plus the band)
3. The chart's tooltip on hover shows:
   - "Predicted Rs 4,056 (12 wk forecast) ± 14.6% expected error"
4. The legend below shows: "12-week outlook: ₨ 4,056 ± 14.6%"

### Step 8: The next week's actual price lands

Over the next 12 weeks, the scraper writes each week's actual Wheat
prices into `commodityprices`. On 2026-08-28 (or shortly after), the
panel will have the actual price for that week. Let's say it turned out
to be **Rs 4,200**.

The Phase 12 monitor (`monitor.py`) joins that actual against the
prediction doc above and computes:

```
abs_pct_err = |4056.17 - 4200| / 4200  =  3.4%
```

This single row contributes to the **rolling 4-week MAPE** for the
`(Wheat, horizon=12)` cell. If the rolling MAPE stays below
`14.64% × 1.5 = 21.96%`, no alarm fires. If it spikes above that for 2
consecutive weeks, that's the signal to retrain.

---

<a name="8c-day-in-life"></a>
## 12. A day in the life of the prediction service

What actually runs inside the container on a typical day. The container
ticks **every hour** (configurable via `RUN_INTERVAL_SECONDS`).

### Monday morning (no work needed)

```
[00:01 UTC] [main] starting scheduler interval=3600s offset=1d backfill_weeks=12
[00:01 UTC] [tick] today=2026-05-25 is 3d past Fri 2026-05-22; predictions
                  for week ending Fri 2026-05-22 already present; running
                  monitor only
[00:01 UTC] [invoke] /usr/local/bin/python /app/prediction_service/monitor.py
                     --window-weeks 4 --alarm-multiplier 1.5
[00:01 UTC] [load]   loaded 184 predictions with past forecast_date in window
[00:01 UTC] [load]   loaded 64,247 panel rows from /work/data/panel.parquet
[00:01 UTC] [match]  matched 156/184 predictions to actual prices
[00:01 UTC] [upsert] wrote 18/18 monitoring rows to FarmKonnect.prediction_monitoring
[00:01 UTC] [ok]     no drift alarms — all cells within threshold
[00:01 UTC] [invoke] exit=0
```

That's it. ~10 seconds of work, mostly Mongo round-trips. The container
sleeps for another hour.

This repeats every hour all week. The monitor keeps refreshing rolling
stats; the predict cycle stays idle.

### Saturday morning (a new W-FRI close just happened)

```
[03:01 UTC] [tick] running live cycle for week ending Fri 2026-05-29
[03:01 UTC] [invoke] /usr/local/bin/python predict_and_upsert.py --mode live
[03:01 UTC] [pipeline] -> build_panel
[03:01 UTC] [pipeline]    Connecting to Atlas... pulled 268,341 rows
[03:01 UTC] [pipeline]    Resampling 146 series to W-FRI...
[03:01 UTC] [pipeline]    Wrote /work/data/panel.parquet (64,378 × 11)
[03:02 UTC] [pipeline] -> fetch_worldbank (cached → skipping)
[03:02 UTC] [pipeline] -> fetch_yfinance (cached → skipping)
[03:02 UTC] [pipeline] -> fetch_nasa_power (refreshing for the new week)
[03:02 UTC] [pipeline] -> build_deterministic
[03:02 UTC] [pipeline] -> build_features
[03:02 UTC] [pipeline] -> build_lagged
[03:03 UTC] [router]   loaded 24 cells, version=1
[03:03 UTC] [models]   loaded global=[] per_commodity=[('Wheat', 12)]
                       quantile_median=[12] with bands=yes
[03:03 UTC] [predict]  mode=live anchors=146 across 146 series
[03:03 UTC] [predict]  emitted 584 prediction docs
[03:03 UTC] [upsert]   wrote 584 (upserted=146, modified=438) into
                       FarmKonnect.pricepredictions
[03:03 UTC] [invoke]   exit=0
[03:03 UTC] [invoke] /usr/local/bin/python monitor.py --window-weeks 4 ...
[03:03 UTC] [ok]       no drift alarms
[03:03 UTC] [invoke]   exit=0
```

The full predict cycle takes ~2 minutes. Then back to sleep.

### Once a month (developer-initiated)

Following `ml/RETRAIN.md`:

1. Developer pulls fresh `features_lagged.parquet` from EC2
2. Re-runs `run_baselines.py`, `train_lgbm.py`,
   `train_lgbm_per_commodity.py`, `train_lgbm_quantile.py`
3. Re-runs `build_router.py` → potentially updated `router_config.json`
4. `git commit && git push`
5. GitHub Actions auto-deploys → `docker-compose up -d --build` →
   prediction service restarts with new joblibs
6. If router decisions changed: developer wipes `pricepredictions` and
   restarts the container so the next backfill produces docs with the
   new models / expected_mapes

Total developer time: ~30 minutes/month. The system runs unattended in
between.

### When something breaks (theoretical)

If a tick raises an exception (e.g., Atlas connectivity drops):
- The outer `try/except` in `run_loop.main()` catches it, logs
  `[main] tick raised <ExceptionType>: <message>`
- The loop continues — sleep, try again in an hour
- No alerting infrastructure yet; "broken state" surfaces by:
  - Stale `generated_at` timestamps on predictions
  - Missed weeks in `prediction_monitoring`
  - Operator noticing `docker logs` shows errors

Phase 12.5 (not built): hook Sentry or another alerting service so
exceptions page someone immediately.

---

<a name="9-chart"></a>
## 13. The user-facing chart

What a user sees on https://www.farmkonnect.app/dashboard with, say,
"Wheat / Faisalabad" selected:

1. **Solid green line** — actual historical prices from the database, drawn
   over the selected time range (1W / 1M / 3M / 6M / 1Y / 5Y / All).
2. **Dashed orange line** — model forecasts, picking up from the latest
   actual price and extending 12 weeks into the future. Four points: +1
   week, +2 weeks, +4 weeks, +12 weeks ahead.
3. **Shaded orange band** — uncertainty range. For Sugar h=12 specifically,
   this is a real q10/q90 quantile band. For everything else, it's a
   rule-of-thumb `± expected_mape%` interval.
4. **Tooltip on hover**:
   - For historical points: just the price.
   - For forecast points: predicted price + "Predicted (N wk forecast)" +
     "± X% expected error."
5. **Legend strip below the chart**:
   - "Actual price" with the green color swatch
   - "Model forecast" with the dashed orange swatch
   - "Confidence range" swatch when at least one forecast point has a real
     band
   - "12-week outlook: ₨ X (₨ low – ₨ high)" — the longest-horizon
     prediction with its band

The chart works in three modes (area, line, bar), each handles the forecast
overlay. Mobile uses a custom SVG implementation with the same visual
language — solid history + dashed forecast.

---

<a name="10-operations"></a>
## 11. Live operations

### 11.1 Where everything lives

| Thing                                          | Location                                                            |
|------------------------------------------------|---------------------------------------------------------------------|
| EC2 host                                       | `ubuntu@13.205.25.250` (key `farmkonnect-key.pem`)                  |
| App dir on EC2                                 | `~/FarmKonnect`                                                     |
| Local repo                                     | `C:\Users\ahtsh\OneDrive\Desktop\FarmKonnect-EC2-Backup`            |
| Database                                       | MongoDB Atlas, DB `FarmKonnect`                                     |
| Live prices                                    | `commodityprices` collection (~270k docs)                          |
| Forecasts                                      | `pricepredictions` collection (6,684 docs)                          |
| Monitoring stats                               | `prediction_monitoring` collection                                  |
| ML pipeline code                               | `ml/training/`                                                      |
| Trained models                                 | `ml/training/models/*.joblib` (19 files)                            |
| Router config                                  | `ml/training/router/router_config.json`                             |
| Prediction service container                   | `prediction_service/` → `farmkonnect_prediction_service_1` on EC2  |
| Backend                                        | `backend/` → `farmkonnect_backend_1`                                |
| Frontend                                       | `frontend/` → `farmkonnect_frontend_1`                              |
| Scraper                                        | `scrapper/` → `farmkonnect_scraper_service_1`                       |

### 11.2 How a deploy works

`git push origin main` → GitHub Actions:
1. **lint-frontend job**: `npm run lint` on frontend
2. **deploy job** (only if lint passes): SSHes to EC2, runs
   `set -euo pipefail; cd ~/FarmKonnect; git pull; docker-compose down;
   docker-compose up -d --build; docker image prune -f`. The `set -e` (added
   in Phase 11) makes the script exit non-zero on the first failure, so
   GH Actions shows red if anything goes wrong.

The deploy.yml ignores `mobile/**` and `**/*.md` so doc-only commits don't
trigger redeploys.

### 11.3 Useful commands

```bash
# SSH in
ssh -i farmkonnect-key.pem ubuntu@13.205.25.250

# Container status
sudo docker ps --format "table {{.Names}}\t{{.Status}}"

# Prediction service logs
sudo docker logs --tail 80 farmkonnect_prediction_service_1

# Force a manual prediction cycle (skips scheduler check)
sudo docker exec farmkonnect_prediction_service_1 \
    python /app/prediction_service/predict_and_upsert.py --mode live

# Manually run monitor
sudo docker exec farmkonnect_prediction_service_1 \
    python /app/prediction_service/monitor.py --window-weeks 4

# Wipe predictions and force fresh backfill
sudo docker run --rm --network host mongo:7 mongosh "$URI" --quiet --eval \
    'db.pricepredictions.drop()' && \
sudo docker restart farmkonnect_prediction_service_1

# Inspect the live forecast API
curl -s "https://www.farmkonnect.app/api/prices/forecast?commodity=Wheat&city=Faisalabad&horizon_weeks=12" | jq

# Check drift alarms
db.prediction_monitoring.find({drift_alarm: true}).sort({computed_at_week: -1})
```

---

<a name="11-monitoring"></a>
## 12. Monitoring and retraining

### 12.1 What gets monitored

Every hour the `monitor.py` script joins `pricepredictions` rows whose
`forecast_date` has already passed with the actual prices in
`panel.parquet`, computes per-row absolute percentage error, aggregates
**rolling 4-week MAPE per (commodity, horizon) cell**, and writes one
summary doc per cell per ISO-week to `prediction_monitoring`.

Sample summary doc:
```js
{
  commodity: "Wheat",
  horizon_weeks: 4,
  window_weeks: 4,
  computed_at_week: "2026-05-29",
  n: 30,
  rolling_mape: 7.25,
  worst_pct_err: 18.6,
  expected_mape: 7.50,
  alarm_threshold: 11.25,
  drift_alarm: false,
  model: "persistence",
  computed_at: "2026-06-03T11:56:03Z"
}
```

If `rolling_mape > 1.5 × expected_mape`, `drift_alarm` is true and a log
line `[ALARM] Wheat h=4 rolling MAPE 11.50% > 11.25% ...` is emitted to the
container's stdout (visible via `docker logs`).

### 12.2 When to retrain

Two triggers:
1. **Calendar**: monthly, regardless of metrics
2. **Alarm**: any cell stays in `drift_alarm: true` for ≥2 consecutive weeks

### 12.3 How to retrain

Documented step-by-step in **`ml/RETRAIN.md`**:
1. scp `features_lagged.parquet` from EC2's prediction service container
2. Run `train_lgbm.py` + `train_lgbm_per_commodity.py` +
   `train_lgbm_quantile.py` locally
3. Run `build_router.py` to rebuild the router config
4. Commit the new joblibs + router_config.json
5. `git push` — deploy auto-rebuilds the container
6. Wipe `pricepredictions` if router cells changed, restart container

~30 minutes per month, manual. Could be automated via a GitHub Action or
Colab notebook (hooks described in RETRAIN.md) but not implemented — the
manual flow is short enough.

---

<a name="12-rejected"></a>
## 13. What we tried and rejected, and why

### 13.1 Chronos (Amazon foundation model)

**Tried**: zero-shot Chronos-t5-small (46M params, pretrained on a huge
corpus of diverse time series). Generated 25,320 walk-forward predictions
across 127 series.

**Result**: Chronos overall MAPE was worse than persistence at every
horizon (2.28 / 3.91 / 6.69 / 13.08% vs persistence 1.86 / 3.19 / 5.35 /
9.80%).

**The trap we caught**: an initial naive router run picked Chronos for
Paddy h=1, h=2, h=4 because its MAPE there looked lower than persistence.
But persistence's MAPE was from Phase 4's calendar-week-from-end test set;
Chronos's was from a different walk-forward set that included different
weeks for sparse Paddy series. Comparing them was silently wrong.

**Fair comparison** (computing persistence MAPE on Chronos's exact anchor
set): persistence beats Chronos in every (commodity, horizon) cell by
1-18%. Chronos is therefore NOT a router candidate.

**Lesson**: any new model candidate must score on the same (series,
anchor_date) tuples as persistence — this rule is now in
`build_router.py`'s docstring and the PLAN.md decisions log.

**Worth revisiting if**: chronos-t5-base (200M params) or fine-tuning on
AMIS data ever shows materially better numbers. The 8M-param "tiny" version
might be too small for sticky admin'd prices.

### 13.2 SARIMA

**Skipped without serious testing.** SARIMA models seasonal patterns explicitly,
but Pakistani prices don't repeat year-over-year (seasonal_naive showed
~22% MAPE everywhere). Combined with no-pooling per-series fitting and
weekly observations, the expected MAPE gain was tiny and not worth the
implementation cost.

### 13.3 TFT (Temporal Fusion Transformer)

**Deferred**. The attention mechanism could weight policy/calendar events
around shocks in ways tree models can't. Plausibly +1-3% on Wheat h=12.
But: needs PyTorch, hyperparameter sweep, GPU (Colab T4 free works).
~1-2 weeks of work. Gated behind Phase 12 monitoring showing the current
specialist isn't enough.

### 13.4 Stacking ensemble (original plan)

**Replaced with the router.** Stacking is valuable when multiple base
models disagree usefully. With persistence winning 22/24 cells, the
meta-learner would mostly learn "use persistence" — basically the router
we have, with more overfit risk in the meta-stacker itself.

### 13.5 Sugarcane MSP, CPI, M2 collectors

**Deferred**. Need to find + validate free APIs from State Bank Pakistan
and AMIS for these tier-2 macro factors. Logged as a future Phase 6.6
mini-phase.

### 13.6 Teammate Javeria's earlier Phase 4-12 scaffolding

**Rejected and removed** (commit `7a3091d`, -37 files / -1,790 lines). On
detailed code review:
- Target leakage (raw price in features at h=1)
- Unfit saved models (joblib.dump'd UNFIT base models in ensemble; OOF
  loop trained clones, originals never trained, predict_and_push silently
  swallowed the NotFittedError into all-NaN predictions)
- In-sample stacking metrics (Ridge.fit(meta_X, meta_y); predict(meta_X)
  reported as test performance)
- Status-field mismatch killing the retrain worker
- AdminPanel.jsx parse error silently froze ALL deploys since 2026-06-01
- 6 other issues

Decided to rebuild Phases 4-7 from scratch rather than untangle. Kept
Phases 2-3 (our original work). Documented in PLAN.md Decisions log,
2026-06-02.

---

<a name="13-limitations"></a>
## 14. Limitations and honest caveats

Things to know about the current system:

1. **Persistence everywhere** — 22 of 24 cells route to persistence. This is
   the right answer for this data, but it means most improvements going
   forward will come from finding new external signals, not from better
   modeling. If new data (CPI, sugarcane MSP, trade volumes, news
   sentiment) becomes available, that's where the next gains are.

2. **Wheat h=12 specialist edge is regime-tied** — the 13.8% improvement is
   tied to the 2024-2025 MSP transitions. When the 2026 deregulation plays
   out and the regime stabilizes, the specialist might lose its edge.
   Phase 12 monitoring will catch this within 4-8 weeks of any drift.

3. **Single 52-week holdout** — we evaluated on the most recent 52 weeks per
   series. A multi-year walk-forward eval would tell us more about
   stability across years. Deferred as future work; live monitoring partially
   substitutes.

4. **Empirical band coverage is 69%, not 80%** — the q10/q90 quantile band
   for Sugar h=12 covers 69% of actual outcomes (we'd want 80% in theory).
   The chart labels this as "Confidence range," not a strict 80% CI.

5. **Sparse series have stale anchors** — Paddy in some cities and Seed
   Cotton in off-season have <12 fresh weeks. The chart's forecast for
   those might be anchored to a date months old.

6. **Free-tier MongoDB Atlas (M0)** — 512 MB storage, ~60 MB used. Years of
   headroom but no on-demand backups. Manual mongodump is the safety net.

7. **EC2 box has 1.9 GB RAM** — fine for the current containers but a
   bigger model (TFT, Chronos-base) would need a bigger instance.

8. **GitHub Actions deploy lied about success before Phase 11** — multiple
   times during development we'd see a green deploy check while containers
   were stopped. Phase 11 (`set -e` in the SSH script) fixed this. Confirm
   with `docker ps` after deploys, not just the GH check mark.

9. **No fine-tuning on AMIS for Chronos** — only zero-shot was tried.
   Fine-tuning likely improves it but requires GPU + ~1 week of work.

10. **Forecast cadence is weekly, not daily** — by design (panel is W-FRI;
    daily horizons aren't meaningful for sticky admin'd prices). If a real
    daily-trading use case emerges this would need substantial rework.

---

<a name="14-future"></a>
## 15. Future work

In rough priority order:

### High-leverage if monitoring shows drift

- **Walk-forward CV** across 3-5 years instead of single split — tells us
  whether the Wheat h=12 specialist generalizes. Estimated effort: 1 day.
- **Chronos fine-tune on AMIS data** — needs Colab T4, ~1 week. Trigger:
  Wheat h=12 specialist starts losing in production monitoring.
- **TFT** — heavy (~1-2 weeks). Trigger: same as Chronos.

### Medium-leverage new data sources

- **State Bank Pakistan CPI / M2** — monthly macro, plausibly helps long-
  horizon forecasts. ~2-3 days to find + validate the APIs.
- **Sugarcane MSP** from AMIS — Sugar-specific factor we're missing. ~1 day.
- **Trade volumes** (Pakistan wheat imports/exports) — already have export
  ban dates in policy_events.csv but not volumes.
- **News sentiment / event extraction** — export ban announcements often
  precede price moves by 1-3 weeks. Could use a simple keyword extractor
  on local agricultural news feeds. ~1-2 weeks of work.

### Operational polish

- **Per-cell edge thresholds in the router** — currently a global 1%. Per-
  cell thresholds derived from bootstrap variance would be more principled.
- **Automated retrain workflow** — GitHub Action on monthly cron that SSHes
  to EC2 and runs the retrain steps. Manual is fine for now but the docs
  hooks are in place.
- **Quantile per-commodity Wheat h=12** — currently Wheat h=12 uses a mean
  specialist; a quantile variant would give Wheat a real confidence band
  on the chart (currently uses the rule-of-thumb).
- **Phase 12 dashboard** — query `prediction_monitoring` in the admin panel
  to show drift visually instead of just in logs.

---

<a name="14b-faq"></a>
## 19. FAQ

**Q: Will the chart predict tomorrow's price exactly?**
No. Tomorrow's price isn't even part of our model — we predict at weekly
horizons (1, 2, 4, 12 weeks ahead), not daily. And the predictions are
**averages over many similar past situations**, not certainties about
your specific market. The chart shows a band around the prediction so
you can see how confident the model is.

**Q: Why does the forecast line stay flat for some commodities?**
Because for 22 of 24 (commodity, horizon) cells, the best prediction the
model has is "the price stays where it is." This isn't laziness — we
tested smarter models against this baseline and most of them lost.
Pakistani mandi prices genuinely don't move much week-to-week, so a flat
forecast is the most honest answer.

**Q: Why doesn't the model use today's news / weather forecast / etc.?**
Two reasons:
1. The system was designed to be **completely automated** with no human
   curation, so it only ingests data that has a stable, free API (AMIS,
   NASA POWER, World Bank, Yahoo Finance).
2. News and weather forecasts are themselves predictions — using them
   would mean trusting another model's predictions inside ours. That's
   doable but adds failure modes.

Future work (Phase 6.6) includes adding event-extracted news features
(e.g., "an export ban was just announced") to the policy_events.csv file
manually, which the model already uses.

**Q: What happens during MSP regime changes?**
Wheat prices are very sensitive to MSP. When the regime changes (e.g.,
abolished 2024-10, reinstated 2025-03), the model has only a handful of
past examples — so its predictions for the first few weeks after a
regime change are less reliable than usual. The `msp_weeks_since_change`
feature lets the model partially correct for this, but the truly
disruptive 2-3 weeks around a change are when monitoring is most useful.

**Q: Is the chart's "12-week outlook" a guarantee?**
No. It's a point estimate from a statistical model trained on past data.
The `± expected_mape%` band represents the **average historical error**
of the model on similar predictions — actual outcomes will be inside the
band roughly 60-70% of the time (lower than 80% because real prices have
fat tails, especially during policy shocks).

**Q: Why are some forecast horizons (h=1, h=2) just persistence?**
Because for those horizons, the data tells us that "doing nothing" is
the most accurate prediction we can make on this kind of data. Trying
to predict next-week prices with a learned model gives WORSE accuracy
than just saying "next week is the same as this week." The router is
honest about this and ships persistence where appropriate.

**Q: How often does the system update?**
- **Live prices** (the green line): updates several times a day via the
  scraper.
- **Forecasts** (the dashed orange line): regenerates **once a week**,
  on Saturday UTC after Friday's data has been collected.
- **Self-monitoring**: every hour, the system checks how its old
  predictions compare to the new actuals.
- **Model retraining**: monthly, manual, via `ml/RETRAIN.md`.

**Q: Can I predict prices for a city / variety not in the chart?**
Only for the 6 commodities × 14 cities × ~146 (commodity, variety, city)
combinations that have AMIS data going back to 2009. We can't predict
for cities or commodities AMIS doesn't track.

**Q: Why is the test set "last 52 weeks"?**
Because forecasting needs to be evaluated chronologically — you can only
test "could the model have predicted X using data available before X."
Random splits (common in non-time-series ML) would let the model see
future data when predicting past data, which inflates accuracy. We hold
out the most recent 52 weeks per series so the test set is always
strictly in the future relative to the training set.

**Q: What did you NOT do and why?**
The biggest "didn't do" items:
- **Fine-tuned Chronos** (would need GPU + ~1 week of work). Zero-shot
  Chronos was worse than persistence; fine-tuning might help.
- **TFT** (Temporal Fusion Transformer). Heavier ML; we don't think the
  expected accuracy gain justifies the implementation cost without
  evidence of need.
- **Sub-weekly horizons**. The data isn't reliable enough at daily
  granularity for it to be useful.
- **Forecasting retail prices**. We forecast wholesale (FQP) only —
  retail markups vary by location and aren't in the AMIS data.

**Q: How would I add a new commodity?**
1. The scraper would need to know how to fetch its AMIS data
2. The panel would need to include it (add to `TARGETS` in `build_panel.py`)
3. The router would auto-generate cells for it; nothing more needed
4. Retrain to pick up the new commodity

**Q: How would I add a new external data source?**
1. Write a collector script under `ml/training/collectors/`
2. Wire it into `build_features.py`'s join logic
3. The new columns get auto-lagged by `build_lagged.py` if they start
   with `wx_`, `yf_`, `wb_`, or `xc_`
4. Retrain

**Q: What's the most likely thing to break?**
Probably one of the external collectors. Yahoo Finance and World Bank
URLs change occasionally; their parsers might break. The collectors
have fallback URLs and skip-if-cached logic to be resilient, but a
true breakage would show as "no fresh weather/markets/WB data this
week" in the prediction service logs. The router would still produce
predictions (using cached external data), just with slightly stale
exogenous features.

**Q: Why MongoDB and not SQL?**
Pre-existing decision before the ML system was built — the live app
already uses MongoDB Atlas. We just write to the same database. For the
modeling work specifically, we use **parquet files on disk**, not the
database; MongoDB is just the read/write boundary with the live app.

**Q: Why Python for ML and Node for the API?**
- Python has the ML libraries (LightGBM, scikit-learn, pandas, pyarrow,
  joblib). No serious ML happens in Node.
- The live app was already Node + React. We didn't want to rewrite it.
- The two languages communicate via the database, not by calling each
  other directly. The Node API reads predictions that Python wrote;
  there's no live Python→Node call. Clean separation.

---

<a name="15-glossary"></a>
## 20. Glossary

Each entry has a one-line definition followed by a deeper explanation
where needed. Terms are in alphabetical order.

**AMIS** *(Agriculture Market Information System)*. The Pakistani
government's wholesale price portal. It publishes daily floor/quoted
prices (FQP) for major crops across organized mandis. Our scraper
(`scrapper/amis_scraper.py`) reads this portal several times a day; our
historical ingest pulled 17 years of daily records (~268,000 rows).

**Anchor date / anchor price**. For any forecast, the "as of" date — the
latest week whose actual price was used as input. Tightly linked to the
**forecast date**: `forecast_date = anchor_date + horizon_weeks × 7
days`. The `anchor_price` is the actual price at the anchor date; it's
stored on every prediction doc so consumers can show "predicted to move
from ₨ X to ₨ Y."

**Atlas** (MongoDB Atlas). The cloud-hosted version of MongoDB we use.
Free tier "M0" has 512 MB storage. Three collections live there:
`commodityprices` (actual prices), `pricepredictions` (our forecasts),
`prediction_monitoring` (Phase 12 stats).

**Backfill**. On the first run of the prediction service (when
`pricepredictions` is empty), it doesn't just forecast forward — it
generates **historical** forecasts for the last 12 weeks too, anchoring
each at its own past Friday. This populates the chart with model
predictions that already-known actuals can be compared against, so the
chart shows "where the model would have said prices were going 12 weeks
ago vs where they actually went."

**Band / confidence interval / confidence range**. A range, not a
single number. "We think the price 12 weeks from now will be between
₨ 3,500 and ₨ 4,600." We provide two flavors: real q10/q90 quantile
bands (only for Sugar h=12 currently), and rule-of-thumb
`predicted ± expected_mape%` bands (for everything else). The chart
labels both as "Confidence range" honestly, not as a strict statistical
CI, because empirical coverage is ~69% rather than the theoretical 80%.

**Baseline**. A stupid-simple prediction we use as a benchmark. Any
real model must beat it to justify its complexity. Three baselines in
our system: **persistence** (price stays same), **ma4** (4-week moving
average), **seasonal_naive** (price 52 weeks ago).

**Bulk write / bulk_write**. A MongoDB operation that performs many
inserts/updates in a single round-trip. We use it in `upsert_predictions`
to push 6,684 documents in ~25 seconds (versus minutes for one-by-one).

**Categorical feature**. A label with no inherent ordering (Wheat vs
Rice has no "ordering" — they're just different categories). LightGBM
handles these natively via category-aware splits ("is the commodity in
{Wheat, Paddy, Seed Cotton}?"). We don't one-hot encode — the model is
told which columns are categorical and treats them specially.

**Cell** *(in the context of the router)*. One (commodity, horizon)
combination. We have 6 commodities × 4 horizons = **24 cells**. Each is
routed to its own model independently.

**Chronos**. Amazon's pretrained time-series foundation model
(transformer-based, 8M-710M params depending on variant). We evaluated
chronos-t5-small (46M params) zero-shot against persistence on the same
holdout. It lost in every (commodity, horizon) cell by 1-18%. Kept the
experiment in-tree (`run_chronos.py`, `chronos_predictions.parquet`,
`ROUTER.md § Negative result`) so the same experiment doesn't get
re-run with different expectations.

**Commodity**. A crop we track. Six in total: Wheat, Rice, Paddy, Maize,
Sugar, Seed Cotton (Phutti). "Rice" and "Paddy" are distinct because
rice has been milled and paddy hasn't.

**Cron / scheduler**. A loop that runs something on a schedule. Our
prediction service has an in-process scheduler (`run_loop.py`) that
ticks hourly and decides each tick whether to run the predict cycle,
just the monitor, or do nothing. No external cron daemon; it's just a
Python `while True: tick(); sleep(3600)`.

**Decision tree**. A flowchart of yes/no splits that ends in a
prediction. One tree alone isn't very accurate; gradient boosting
trains hundreds of them in sequence to compound the predictive power.

**docker-compose**. The tool that orchestrates our 4 Docker containers
(frontend, backend, scraper, prediction_service) on a single EC2 VM.
The deploy workflow runs `docker-compose down && docker-compose up -d
--build` on every push to main.

**Drift**. When a model's accuracy decays in production because the
underlying data distribution shifted. Most common cause for us: policy
changes (MSP regime transitions, export bans). Phase 12 monitoring
exists to detect drift fast — if rolling 4-wk MAPE exceeds 1.5× the
router's recorded `expected_mape`, an alarm fires.

**EC2**. Amazon's cloud virtual machines. Our entire app runs on one
instance (`13.205.25.250`) with 1.9 GB RAM and 36% of 15 GB disk used.
The free-tier-ish instance is fine for the current workload; a heavier
model (TFT, Chronos-base) would need a bigger instance.

**ESLint / linting**. The static-analysis tool the frontend uses to
catch JS errors before they hit production. The deploy workflow runs
`npm run lint` as a gate — if it fails, deploy doesn't run.

**Eval-set leak**. Using the test set during training, e.g., as the
early-stopping validation. The training loop "peeks" at the test data
so the model implicitly tunes itself for it, and reported test MAPE is
artificially low. We hit this in Phase 6 and fixed it in Phase 6.5 (the
"honest LGBM" pass). Symptom in our case: two of the three LGBM-winning
cells (Paddy h=12, Seed Cotton h=12) turned out to be leak artifacts —
they didn't beat persistence under honest evaluation.

**Feature**. An input to the model. We have **89 columns** of features
in `features_lagged.parquet`. See section 4.9 for the full taxonomy.

**Foundation model**. A large pretrained model whose architecture is
"general" enough to handle many tasks with minimal fine-tuning. Chronos
is one. They've revolutionized NLP; for time series they're a more
recent trend. Our experiment showed they don't transfer well zero-shot
to Pakistani mandi prices specifically.

**Forecast horizon / horizon**. How far ahead we predict. Our four:
1, 2, 4, 12 weeks.

**FQP** *(Floor/Quoted Price)*. AMIS's daily wholesale price for a
commodity in a city. The one we model. AMIS also publishes Min/Max but
those are noisier.

**Gradient boosting**. A class of ML algorithm where many weak models
(usually small decision trees) are trained in sequence. Each new model
learns to correct the residual errors of the previous models combined.
The final prediction is the sum (or weighted sum) of all the models'
outputs. Highly effective on tabular data; LightGBM is the specific
implementation we use.

**Holdout / test set**. Data set aside from training so we can measure
accuracy honestly. For us: the most recent **52 weeks per series** in
the panel.

**Joblib bundle**. A `.joblib` file is a Python-pickled object. Each
trained LightGBM model is saved as a bundle containing
`{model, feature_cols, categoricals, horizon, best_iteration}` so the
prediction service can load it and run inference without re-training.
We have 19 joblib files in `ml/training/models/`.

**Lag**. A past value of a series. `price_lag_1` for week T = price at
week T-1. We add lags at 1, 2, 4, 8, 13, 26, 39, 52 weeks. All
exogenous data (weather, world prices, FX) is also lagged by 1 week so
the model only sees information available at prediction time.

**Leakage**. Information that wouldn't be available at prediction time
seeping into training. Causes models to look great on holdouts and fail
in production. Three places it can creep in: target in features (we
guard via dropping `price_raw`), contemporaneous exogenous data (we
guard via the 1-wk lag rule), eval-set leak (we guard via proper val
split). See Phase 6.5.

**LightGBM / LGBM**. The specific gradient-boosted decision tree
library (by Microsoft) we use. Trains in seconds on CPU. Handles
categorical features and missing values natively. The workhorse for
tabular forecasting.

**LightGBM hyperparameters** *(ours)*:
- `n_estimators=2000` — max number of trees
- `learning_rate=0.05` — how fast each tree corrects (smaller = slower
  but often better)
- `num_leaves=63` — max leaves per tree
- `min_data_in_leaf=20` — don't split a leaf with fewer than 20 rows
- `feature_fraction=0.9` — random 90% of features per tree
- `bagging_fraction=0.9` — random 90% of rows per tree
- `bagging_freq=5` — re-sample rows every 5 trees
- `early_stopping(100)` — stop training if validation loss doesn't
  improve for 100 consecutive trees

**M0**. The free tier of MongoDB Atlas. 512 MB storage, shared
performance, ~5-second response time on cold queries. We use ~60 MB —
years of headroom.

**MAPE** *(Mean Absolute Percentage Error)*. Our main accuracy metric.
For each prediction: `|actual - predicted| / actual × 100`. Take the
mean across all predictions. Lower is better. 0% would mean perfect
predictions. Headline number for our system: **4.61%** weighted across
all 24 cells.

**Mandi**. An organized wholesale agricultural marketplace in
Pakistan. The AMIS portal aggregates prices across mandis in each
district. There are dozens of mandis across the 14 cities we track.

**MEP** *(Minimum Export Price)*. A government-set floor below which a
commodity can't be exported. Used as a tool to discourage exports when
domestic supply is tight. Appears as a `pol_mep_set` / `pol_mep_removed`
flag in our policy features.

**Mongoose**. The Node.js ORM (object-relational mapper) we use to
query MongoDB. Defines schemas (e.g., `backend/models/PricePrediction.js`)
and provides a fluent query API.

**MSP** *(Minimum Support Price)*. Government-set floor price for crops.
The state buys at this price if market prices fall below it. Heavily
affects Wheat in Pakistan. The MSP regime changes (active → abolished →
reinstated → deregulated, 2024-2026) are the single biggest source of
modelable structure in our wheat data.

**MSP regime**. A categorical feature with 4 values:
- `active` — the historical default (pre-2024-10)
- `abolished` — Oct 2024 to Mar 2025 (IMF-driven liberalization)
- `reinstated` — Mar 2025 to May 2026 (PMK 3,500/40Kg)
- `deregulated` — May 2026 onwards (legislated transition to free pricing)

**Panel**. Our master weekly modeling table. **64,247 rows × 89 columns**
(after feature engineering). One row per (commodity, variety, city, week).
The output of `build_panel.py` → enriched by `build_features.py` and
`build_lagged.py` into `features_lagged.parquet`.

**Parquet**. A columnar storage format optimized for analytics. We use
it for all intermediate ML files because reading specific columns is
fast and the on-disk size is much smaller than CSV. Read with
`pandas.read_parquet()`.

**Pct-change target**. Instead of predicting the future price directly,
we predict the **percentage change** from the current price. So if
Wheat is Rs 3,000 this week and the model predicts +5%, the absolute
prediction is Rs 3,150. Critical for our use case because commodities
have wildly different price scales (Sugar ~Rs 150/Kg vs Wheat ~Rs
3,500/40Kg). Without pct-change target, a global model is dominated by
the high-price rows and mis-predicts Sugar by 5-10×.

**Persistence baseline**. "Next week's price = this week's price."
Hard to beat on Pakistani mandi prices because they're administratively
sticky. **Routes 22 of 24 of our cells** in the current production
config. Persistence MAPE at h=1: 1.86% across all commodities.

**Pickle / pickling**. Python's built-in serialization format. `joblib`
is a faster pickle alternative used for ML model files. A pickle file
captures the full state of a Python object (LightGBM model, numpy
arrays, dictionaries) and can be loaded back in another Python process.

**Pipeline**. The chain of scripts that turns raw data into trained
models. Ours runs in this order:
1. `build_panel.py` — DB → weekly panel parquet
2. Collectors (WB, yfinance, NASA POWER) — external data parquets
3. `build_deterministic.py` — calendar + policy features
4. `build_features.py` — join external features onto the panel
5. `build_lagged.py` — add lag features + shifted targets
6. `run_baselines.py` — measure persistence/ma4 baselines
7. `train_lgbm.py` + `train_lgbm_per_commodity.py` +
   `train_lgbm_quantile.py` — train models
8. `build_router.py` — pick winners per cell, emit router config

The prediction service re-runs steps 1-5 weekly; steps 6-8 happen during
monthly retraining.

**PricePrediction**. The Mongoose model in `backend/models/PricePrediction.js`
that the Node API uses to read documents from `pricepredictions`. Schema
mirrors what `predict_and_upsert.py` writes via pymongo.

**Pymongo**. Python's MongoDB driver. The prediction service uses it
directly (not via an ORM) for its bulk writes. Mongoose is Node-only.

**Quantile regression**. A variant of regression where, instead of
predicting the **mean** of the target distribution, you predict a
specific **percentile** — the 10th, 50th (median), 90th. Useful for:
- Robust point forecasts (median is less sensitive to outliers than mean)
- Generating uncertainty bands (10th-percentile prediction and
  90th-percentile prediction give an 80% interval)

We train quantile LightGBM at α ∈ {0.1, 0.5, 0.9} for horizon h=12 only.
The median (α=0.5) competes with mean LGBM for router selection (and
wins for Sugar); q10/q90 produce the real band shown on the chart for
Sugar h=12.

**Recharts**. The React chart library the frontend uses
(`PriceChart.jsx`). We use it for AreaChart / LineChart / BarChart with
stacked Areas for the quantile band rendering.

**Resampling**. The process of converting data from one time frequency
to another. Daily → weekly is the most common in our system: we group
daily prices by W-FRI week and take the mean. Done in
`build_panel.py` via `df.resample("W-FRI").mean()`.

**Router**. The small JSON config (`router_config.json`) that maps
each cell (commodity, horizon) to a model name (persistence / ma4 /
lgbm / lgbm_per_commodity / lgbm_quantile_median). It's the single
source of truth for what model the prediction service should run for
each cell. Built by `build_router.py` from the metrics CSVs of the
candidate models.

**Series**. A single (commodity, variety, city) combination. We have
**146 series**: 6 commodities × ~24 (variety, city) combinations
average. Some commodities have multiple varieties (Rice has 5, Paddy
has 3); others have none (Wheat, Sugar, Maize, Seed Cotton).

**Specialist model**. A model trained on data from only one commodity,
instead of pooling all commodities. Trade-off: more focused (each
commodity's dynamics get the model's full capacity) vs. less data per
model (Paddy specialist sees only 3,584 rows; the global model sees
59,557). Specialists win for Wheat at h=12; they lose to global or
persistence for the others.

**SSH / scp**. Tools for remote command execution and file copying.
We use them to manage the EC2 server: `ssh ubuntu@13.205.25.250` for
shell access, `scp` to push/pull files. Automated in the GitHub Actions
deploy via `appleboy/ssh-action`.

**Stacking ensemble**. A meta-model trained on top of other models'
predictions. The "stacker" takes the outputs of N base models and
learns how to combine them. We considered it; the router (a simpler,
non-learned decision table) replaces it. Stacking is valuable when
multiple base models disagree usefully — with persistence winning 22/24
cells, the stacker would mostly learn "use persistence" and add
overfitting risk.

**TFT** *(Temporal Fusion Transformer)*. A deep neural network for
time series, with an attention mechanism for weighting different
covariates. Requires GPU training and ~1-2 weeks to set up properly.
We deferred it. Plausibly +1-3% on Wheat h=12 specifically; trigger
condition for revisiting is "Phase 12 monitoring shows the current
specialist isn't enough."

**Validation set**. Data used during training (not test) to decide
when to stop training (early stopping). We use the 26 weeks before the
test set in each series. Phase 6.5 fixed the practice of using the
test set as the validation set, which had been silently inflating
reported accuracy by 1-5%.

**Variety**. A sub-type of a commodity. Rice has 5 varieties (IRRI,
Basmati 385, Basmati Super New/Old, Kainat New). Paddy has 3. Wheat,
Sugar, Maize, and Seed Cotton have no varieties — their `variety` field
is `null`.

**Vite**. The frontend build tool (replaces webpack). Faster dev
server, ES-modules-first. Lint config in `frontend/.eslintrc`.

**W-FRI**. Friday-anchored weekly resampling — the convention we use
for the panel. A "W-FRI week" runs Saturday through Friday. Means our
prediction service runs after a Friday's close to have the full week's
data.

**Walk-forward eval**. An evaluation procedure where you train on
weeks 1-T, predict T+1, then re-train on 1-(T+1), predict T+2, and so
on. More rigorous than a single train/test split because it tests
performance across many "fresh" prediction moments. We don't do this
yet — currently a single 52-week holdout. Walk-forward eval is on the
future-work list, especially for stability-testing the Wheat h=12
specialist.

**Winsorize**. Capping extreme values at a percentile. We winsorize
each series to its 1st/99th percentile in `build_panel.py` — anything
above the 99th percentile gets clipped DOWN to the 99th percentile
value, anything below the 1st gets clipped UP. Removes outliers
without dropping the rows.

**y_h / y_1, y_2, y_4, y_12**. Target columns in `features_lagged.parquet`.
`y_h` = `price.shift(-h)` per series — the actual future price h weeks
from the current row. The training script computes the percentage
change `(y_h - price) / price` as the actual target to minimize.

---

## Document end

If you want to learn more:
- **For an even shorter explainer**, read `PROJECT_GUIDE.md` (untracked,
  local-only).
- **For the engineering snapshot**, read `HANDOFF.md` (untracked, local-only).
- **For the detailed plan + decisions log**, read `PLAN.md` (gitignored).
- **For per-phase write-ups**, read:
  - `ml/training/baselines/BASELINES.md` (Phase 4)
  - `ml/training/models/LGBM.md` (Phase 6)
  - `ml/training/router/ROUTER.md` (Phase 7 + Chronos negative result)
  - `prediction_service/README.md` (Phase 8 / 6.5 / 10.5 / 12)
  - `ml/RETRAIN.md` (Phase 12.B retrain playbook)
