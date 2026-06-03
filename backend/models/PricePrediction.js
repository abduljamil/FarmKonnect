const mongoose = require("mongoose");

// Phase 9 — read-only model over the `pricepredictions` collection.
// The prediction_service container (Phase 8 / 6.5) writes these docs via pymongo
// on a weekly cron; this Node side only reads them. Indexes are created by the
// prediction service's `ensure_indexes` call — autoIndex is off in production
// anyway, so this schema's index declarations are documentation, not actions.

const pricePredictionSchema = new mongoose.Schema(
  {
    commodity: { type: String, required: true, trim: true },
    // null for varietyless commodities (Wheat / Sugar / Maize / Seed Cotton) —
    // mirrors the live commodityprices convention.
    variety: { type: String, default: null, trim: true },
    city: { type: String, required: true, trim: true },
    unit: { type: String, default: null },

    // "As-of" anchor: the week whose data the model saw when producing the
    // forecast. anchor_price is the price at that anchor week.
    anchor_date: { type: Date, required: true },
    anchor_price: { type: Number, required: true, min: 0 },

    // Forecast target: anchor_date + horizon_weeks * 7 days.
    forecast_date: { type: Date, required: true },
    horizon_weeks: { type: Number, required: true, enum: [1, 2, 4, 12] },

    predicted_price: { type: Number, required: true, min: 0 },

    // Which model the router chose for this cell. One of:
    //   persistence / ma4 / lgbm / lgbm_per_commodity / lgbm_quantile_median
    model: { type: String, required: true },

    // Expected MAPE % for this (commodity, horizon) cell from the router. Used
    // to render uncertainty bands as `predicted_price ± expected_mape%`
    // (until quantile bands ship in Phase 10).
    expected_mape: { type: Number, default: null },

    router_version: { type: Number, default: null },
    router_generated_at: { type: String, default: null },
    generated_at: { type: Date, default: Date.now },
  },
  { collection: "pricepredictions" }
);

// Documentation only — the prediction service creates these via pymongo and
// Mongoose's autoIndex is off in production.
pricePredictionSchema.index(
  { commodity: 1, variety: 1, city: 1, forecast_date: 1, horizon_weeks: 1 },
  { unique: true, name: "series_forecast_unique" }
);
pricePredictionSchema.index({ forecast_date: -1 }, { name: "forecast_date_desc" });
pricePredictionSchema.index({ anchor_date: -1 }, { name: "anchor_date_desc" });

module.exports = mongoose.model("PricePrediction", pricePredictionSchema, "pricepredictions");
