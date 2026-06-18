# FarmKonnect Price-Forecasting — Project Guide

*A plain-language walkthrough of what we're building, what we've done so far, and
what's coming next. Written so anyone can follow it — no machine-learning or
coding background needed.*

*Last updated: 2026-05-26*

---

## 1. What is this project, in one sentence?

**FarmKonnect** (the live website, https://www.farmkonnect.app) already shows
people **today's crop prices** across Punjab. We are adding a new ability:
**predicting where those prices are heading** — tomorrow, next week, and next
month — like a weather forecast, but for crop prices.

**Who benefits:** farmers deciding when to sell, traders planning purchases, and
anyone who needs an early read on where the market is going.

---

## 2. The numbers at a glance

| Thing | Amount |
|---|---|
| Crops we track | **6** — Wheat, Rice, Paddy, Maize, Sugar, Seed Cotton (Phutti) |
| Cities (markets) in Punjab | **14** |
| Years of price history | **~17** (2009 → today) |
| Price records in the database | **~270,000** |
| Bad/duplicate records set aside during cleanup | **2,493** |
| Rows in our clean weekly table | **64,247** |
| "Outside influence" columns added (weather, world prices, etc.) | **56** |

---

## 3. The two halves of the project

Think of it as two connected pieces:

1. **The live app (already running).** A website + phone app that displays crop
   prices. Behind it sits a database of prices and a small program (a "scraper")
   that automatically collects fresh prices every day.

2. **The prediction engine (what we're building).** A separate system that
   *learns* from 17 years of history — plus outside factors like weather and the
   dollar rate — to forecast future prices, and then feeds those forecasts back
   into the app.

Most of the work so far has been **getting the data ready** for that prediction
engine. That prep is unglamorous but it's 80% of the battle — predictions are
only as good as the data behind them.

---

## 4. A quick glossary (only the words you'll see here)

- **Commodity** — a crop we track (e.g. Wheat).
- **Variety** — a sub-type of a crop (e.g. Rice → Basmati, IRRI…).
- **Price record** — one price, for one crop, in one city, on one day.
- **The panel** — our big, tidy table of clean weekly prices (explained below).
- **External factors** — outside things that push prices around (weather, global
  prices, the rupee-dollar rate, government decisions…).
- **Model** — the program that learns patterns from the data and makes the
  forecasts.
- **Forecast horizon** — how far ahead we predict (1 day, 1 week, 1 month).

---

## 5. The journey so far (start → now), in plain terms

### Step 1 — Collected the history
We gathered **17 years of daily crop prices** (2009–today) for all 6 crops across
14 Punjab cities from the government's AMIS price portal. That's the raw material.

### Step 2 — Loaded it into the live app + fixed the app
We loaded all ~270,000 records into the app's database so the website shows the
full history (it used to keep only the last 90 days). While doing so we fixed
several real problems users were hitting:
- The crop selector and the time-range buttons (1 week, 1 month, … 5 years) now
  work properly and only show ranges that actually have data.
- A page that was crashing (the "latest prices" ticker) was repaired.
- The default city now shows an active market instead of a stale one.

### Step 3 — Cleaned the data (this is important)
Old data is messy. We fixed three kinds of problems — and crucially, we **never
deleted anything**; we just *flagged* bad records so they're hidden but
recoverable.

1. **Mixed units.** Some old prices were "per 100 kg," others "per 40 kg" — like
   putting miles and kilometres on the same chart. We converted everything to one
   consistent unit (per 40 kg for grains, per kg for sugar). This removed a weird
   "cliff" in the price charts.
2. **Duplicate / split names.** The same rice variety was sometimes filed under
   different names, which broke its history into disconnected pieces. We merged
   them so each variety now has **one continuous record** from 2009 to today.
3. **Obvious errors.** A few entries were clearly wrong (e.g. a typo making maize
   look 10× its real price). We set those aside so they don't mislead the
   forecasts.

In total **2,493 records** were flagged and hidden (out of ~270,000) — duplicates
and obvious errors. The result: clean, consistent, sensible price history.

### Step 4 — Built the clean "panel"
We turned the messy database into **one tidy table**: one row for **each crop, in
each city, for each week**, with its price. That's **64,247 rows**.

Why weekly (not daily)? Daily prices are noisy and have gaps; weekly is smoother
and is the right rhythm for forecasting a few weeks/months out. Where a week was
missing, we filled short gaps (up to 4 weeks) and left long gaps honestly empty.

### Step 5 — Studied the data (the "EDA")
Before building anything, we explored the table to understand its strengths and
weaknesses (this exploration is called **EDA — Exploratory Data Analysis**). We
used standard data tools (the Python *pandas* library) and produced a coverage
map, summaries, and charts.

**The big finding: coverage is uneven.**
- **Rich & complete:** Wheat, Sugar, Maize — nearly every city, full 17 years.
- **Mixed:** Rice — a few variety/city combinations have full history; many
  others are patchy.
- **Sparse / seasonal:** Paddy and Seed Cotton — fewer records, and cotton data
  naturally pauses out of season.

This matters because it tells us *how* to build the predictions: lean on the
well-covered crops, and **combine ("pool") the thin ones together** so they can
still be forecast.

### Step 6 — Gathered the "external factors"
Crop prices don't move on their own — they're pushed by outside forces. We
collected these from **free, public sources** and attached them to every row of
our table, so the model can learn how each one affects prices. We added **56
columns** in six groups:

| Group | What it captures | Where it comes from |
|---|---|---|
| **Calendar** | Season, week of year, **Ramadan/Eid** (demand spikes), harvest months | Computed |
| **Government policy** | Export bans, support prices (MSP), import waves, price caps, IMF-driven changes | Our hand-built policy calendar |
| **World crop prices** | Global wheat, rice, maize, cotton, sugar prices | World Bank "Pink Sheet" |
| **Fertilizer & oil** | Urea, DAP fertilizer, and Brent crude oil prices | World Bank "Pink Sheet" |
| **Markets & currency** | Daily futures for each crop + the **US-dollar / rupee rate** | Yahoo Finance |
| **Weather** | Rainfall, temperature, humidity for each of the 14 cities | NASA POWER (satellite/climate data) |

Examples of why these matter: a weaker rupee tends to push prices up; a government
export ban changes supply overnight; poor rainfall months earlier can mean a
smaller harvest and higher prices later.

The end result of Steps 4–6 is a single **forecast-ready table** with the clean
price history *plus* all 56 influences lined up next to it.

---

## 6. Where we are right now

✅ The **live app** is working and shows full, clean price history.
✅ The **data is clean** (consistent units, merged varieties, errors removed).
✅ The **clean weekly table** is built and studied.
✅ The **external factors** are collected and attached.

In short: **the foundation is done.** We have a rich, trustworthy dataset that's
ready for the actual prediction-building.

---

## 7. What's next (the road ahead)

This is the part where the computer actually "learns." In plain terms:

1. **Prepare the clues.** Turn the raw factors into the right form for learning —
   e.g. "wheat price 1 week ago," "rainfall 3 months ago," seasonal patterns.
   (Weather and market factors must be used with a delay, so we never accidentally
   "peek at the future.")
2. **Teach prediction models.** We'll train several modern forecasting models and
   combine them (an ensemble usually beats any single one). We'll test them
   honestly by checking how well they would have predicted past periods they
   weren't shown.
3. **Aim for sensible accuracy.** Roughly within a few percent for next-day
   forecasts, widening for a month out — and always shown with an uncertainty
   range, not a single false-precise number.
4. **Put forecasts in the app.** A small service runs every night, computes the
   next ~30 days of forecasts, and the website/phone app shows them as a chart
   with a "confidence band."
5. **Keep it fresh.** The system re-checks its own accuracy over time and is
   re-trained periodically so it stays sharp.

---

## 8. Simple status checklist

| Stage | Status |
|---|---|
| Collect 17 years of price data | ✅ Done |
| Load into app + fix the live website | ✅ Done |
| Clean the data (units, duplicates, errors) | ✅ Done |
| Build the clean weekly table | ✅ Done |
| Study the data (EDA) | ✅ Done |
| Gather & attach external factors | ✅ Done |
| **Build & test the prediction models** | ⬜ Next |
| Show forecasts in the app | ⬜ Upcoming |
| Auto-update & monitor | ⬜ Upcoming |

We are right at the line between "data ready" and "build the predictions."

---

## 9. For the more technically curious

- The live app runs on a single cloud server; data lives in a cloud database
  (MongoDB). Updates to the site deploy automatically when code is pushed.
- The forecast-ready dataset is a file called `features.parquet`
  (64,247 rows × 66 columns) under `ml/training/`.
- Two deeper technical documents exist for engineers: **`PLAN.md`** (the detailed
  master plan and status) and **`HANDOFF.md`** (full technical context). This
  guide is the friendly summary of those.

---

*Questions? The short version: we've spent this phase turning 17 years of messy
price data into a clean, richly-informed dataset. The exciting part — actually
forecasting prices and showing them in the app — is what comes next.*
