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

commodityPriceSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

commodityPriceSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("CommodityPrice", commodityPriceSchema, "commodityprices");
