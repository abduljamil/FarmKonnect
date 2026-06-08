const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please provide a title"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Please provide a description"],
  },
  price: {
    type: Number,
    required: [true, "Please provide a price"],
    min: 0,
  },
  category: {
    type: String,
    required: [true, "Please provide a category"],
    enum: ["crops", "livestock", "equipment", "fertilizers", "seeds", "other"],
  },
  images: [
    {
      type: String, // URLs to images
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  location: {
    type: String,
    required: [true, "Please provide a location"],
  },
  status: {
    type: String,
    enum: ["active", "sold", "inactive"],
    default: "active",
  },
  quantity: {
    type: Number,
    default: 1,
  },
  unit: {
    type: String, // e.g., 'kg', 'piece', 'ton', etc.
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
listingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for the queries getAllListings actually runs:
//   - filter by status (default = "active") + sort by createdAt desc
//   - filter by category + status
//   - "my listings" → filter by createdBy
//   - free-text search on title + description (replaces $regex scan)
// autoIndex is off in production (per CommodityPrice.js precedent), so when
// promoting these to Atlas, create them via mongosh.
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ category: 1, status: 1, createdAt: -1 });
listingSchema.index({ createdBy: 1, createdAt: -1 });
listingSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Listing", listingSchema, "products");
