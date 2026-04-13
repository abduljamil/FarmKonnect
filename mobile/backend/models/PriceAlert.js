const mongoose = require("mongoose");

const priceAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    commodity: {
      type: String,
      required: true,
      enum: ["Wheat", "Rice", "Cotton", "Sugar", "Maize", "Flour"],
    },
    variety: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    condition: {
      type: String,
      required: true,
      enum: ["above", "below"],
    },
    targetPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currentPrice: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "triggered", "disabled"],
      default: "active",
      index: true,
    },
    triggeredAt: {
      type: Date,
      default: null,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
priceAlertSchema.index({ user: 1, status: 1 });
priceAlertSchema.index({ commodity: 1, status: 1 });

// Virtual for checking if alert should trigger
priceAlertSchema.virtual("shouldTrigger").get(function () {
  if (this.status !== "active" || this.currentPrice === null) {
    return false;
  }
  
  if (this.condition === "above") {
    return this.currentPrice >= this.targetPrice;
  } else {
    return this.currentPrice <= this.targetPrice;
  }
});

// Method to check and trigger alert
priceAlertSchema.methods.checkAndTrigger = function (currentPrice) {
  this.currentPrice = currentPrice;
  
  if (this.status !== "active") {
    return false;
  }
  
  const shouldTrigger =
    this.condition === "above"
      ? currentPrice >= this.targetPrice
      : currentPrice <= this.targetPrice;
  
  if (shouldTrigger) {
    this.status = "triggered";
    this.triggeredAt = new Date();
    return true;
  }
  
  return false;
};

// Static method to get alerts that need checking for a commodity
priceAlertSchema.statics.getActiveAlertsForCommodity = function (commodity, city = null) {
  const query = {
    commodity,
    status: "active",
  };
  
  if (city) {
    query.$or = [{ city: city }, { city: null }];
  }
  
  return this.find(query).populate("user", "name email");
};

const PriceAlert = mongoose.model("PriceAlert", priceAlertSchema);

module.exports = PriceAlert;
