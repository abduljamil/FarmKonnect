const mongoose = require("mongoose");

const commodityPriceSchema = new mongoose.Schema({
  commodity: {
    type: String,
    required: true,
    trim: true,
  },
  variety: {
    type: String,
    default: null,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  priceType: {
    type: String,
    required: true,
    enum: ["Min", "Max", "FQP"],
  },
  unit: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

commodityPriceSchema.index(
  { commodity: 1, variety: 1, city: 1, date: 1, priceType: 1 },
  { unique: true }
);

// Supports getLatestPrices(): $match on priceType, then $sort { date:-1, timestamp:-1 }.
// Without it the aggregation does an in-memory sort over every FQP doc and exceeds
// Mongo's 32MB sort limit now that the collection holds 17yr of history.
// NOTE: autoIndex is off in production, so this index was also created directly in Atlas.
commodityPriceSchema.index({ priceType: 1, date: -1, timestamp: -1 });

// NOTE: A 90-day TTL on `timestamp` previously auto-deleted documents. We
// removed it so we can keep the full historical price record (2009-present)
// needed for ML model training. To drop the existing index in Atlas, run
// `node backend/scripts/dropTtlIndex.js` once.

commodityPriceSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("CommodityPrice", commodityPriceSchema, "commodityprices");
