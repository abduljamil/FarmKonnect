const mongoose = require("mongoose");

// Constants for validation
const MIN_TRANSACTION_AMOUNT = 100; // Minimum Rs. 100
const MAX_TRANSACTION_AMOUNT = 10000000; // Maximum Rs. 10 million
const MAX_PLATFORM_FEE = 30; // Maximum 30% platform fee
const ESCROW_DAYS = 14; // Auto-release after 14 days
const DISPUTE_WINDOW_DAYS = 7; // Can raise dispute within 7 days of completion
const MAX_QUANTITY = 10000;
const MAX_DELIVERY_PROOF_IMAGES = 5;

const transactionSchema = new mongoose.Schema({
  // The listing being purchased
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  // User who is buying
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // User who is selling (listing owner)
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Related conversation (optional)
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
  },
  // Transaction details
  amount: {
    type: Number,
    required: true,
    min: [MIN_TRANSACTION_AMOUNT, `Minimum transaction amount is Rs. ${MIN_TRANSACTION_AMOUNT}`],
    max: [MAX_TRANSACTION_AMOUNT, `Maximum transaction amount is Rs. ${MAX_TRANSACTION_AMOUNT}`],
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, "Quantity must be at least 1"],
    max: [MAX_QUANTITY, `Maximum quantity is ${MAX_QUANTITY}`],
  },
  // Payment method
  paymentMethod: {
    type: String,
    enum: ["cod", "jazzcash", "easypaisa"],
    required: true,
  },
  // Payment status flow
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "released", "failed", "refunded", "cancelled"],
    default: "pending",
  },
  // Transaction/Order status
  orderStatus: {
    type: String,
    enum: ["pending", "confirmed", "delivered", "completed", "disputed", "cancelled"],
    default: "pending",
  },
  // Idempotency key to prevent duplicate payments
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  // JazzCash specific fields
  jazzcashTransactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  jazzcashResponse: {
    type: mongoose.Schema.Types.Mixed,
  },
  // Escrow management
  escrowHeldAt: {
    type: Date,
  },
  escrowExpiryDate: {
    type: Date,
  },
  escrowAutoReleased: {
    type: Boolean,
    default: false,
  },
  // For seller payout
  payoutStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },
  payoutTransactionId: {
    type: String,
  },
  payoutAttempts: {
    type: Number,
    default: 0,
  },
  payoutLastAttemptAt: {
    type: Date,
  },
  payoutCompletedAt: {
    type: Date,
  },
  // Platform fee (percentage kept by platform)
  platformFee: {
    type: Number,
    default: 0,
    min: [0, "Platform fee cannot be negative"],
    max: [MAX_PLATFORM_FEE, `Maximum platform fee is ${MAX_PLATFORM_FEE}%`],
  },
  platformFeeAmount: {
    type: Number,
    default: 0,
  },
  // Seller receives this amount
  sellerAmount: {
    type: Number,
    min: [0, "Seller amount cannot be negative"],
  },
  // Delivery details
  deliveryAddress: {
    type: String,
    minlength: [10, "Delivery address must be at least 10 characters"],
  },
  deliveryNotes: {
    type: String,
    maxlength: [500, "Delivery notes cannot exceed 500 characters"],
  },
  // Delivery location coordinates
  deliveryLocation: {
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    address: {
      type: String,
    },
  },
  // Contact info
  buyerPhone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^03[0-9]{9}$/.test(v);
      },
      message: "Invalid Pakistani phone number format (03XXXXXXXXX)",
    },
  },
  sellerPhone: {
    type: String,
  },
  // Ratings tracking
  buyerHasRated: {
    type: Boolean,
    default: false,
  },
  sellerHasRated: {
    type: Boolean,
    default: false,
  },
  // COD-specific confirmation fields
  buyerConfirmedDelivery: {
    type: Boolean,
    default: false,
  },
  buyerDeliveryConfirmedAt: Date,
  buyerConfirmedPayment: {
    type: Boolean,
    default: false,
  },
  buyerPaymentConfirmedAt: Date,
  sellerConfirmedPayment: {
    type: Boolean,
    default: false,
  },
  sellerPaymentConfirmedAt: Date,
  // Buyer can reject delivery
  buyerRejectedDelivery: {
    type: Boolean,
    default: false,
  },
  buyerRejectionReason: {
    type: String,
  },
  buyerRejectedAt: Date,
  // Dispute fields
  disputeReason: {
    type: String,
    enum: [
      "payment_not_received",
      "wrong_amount",
      "product_issue",
      "delivery_issue",
      "item_not_received",
      "item_not_as_described",
      "other"
    ],
  },
  disputeDescription: {
    type: String,
    maxlength: [1000, "Dispute description cannot exceed 1000 characters"],
  },
  disputedAt: Date,
  disputedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  disputeDeadline: {
    type: Date, // Deadline for dispute resolution
  },
  disputeEvidence: [{
    url: String,
    type: { type: String, enum: ["image", "document"] },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
  }],
  disputeResolvedAt: Date,
  disputeResolution: String,
  disputeResolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Admin who resolved
  },
  // Window to raise disputes (X days after completion)
  disputeWindowEndsAt: Date,
  // Refund fields
  refundStatus: {
    type: String,
    enum: ["none", "pending", "processing", "completed", "failed"],
    default: "none",
  },
  refundAmount: {
    type: Number,
  },
  refundTransactionId: {
    type: String,
  },
  refundReason: {
    type: String,
  },
  refundRequestedAt: Date,
  refundCompletedAt: Date,
  // Delivery proof images (uploaded by seller)
  deliveryProofImages: {
    type: [{
      type: String,
      validate: {
        validator: function(v) {
          // Basic URL validation
          return /^https?:\/\/.+/.test(v);
        },
        message: "Invalid image URL",
      },
    }],
    validate: {
      validator: function(v) {
        return v.length <= MAX_DELIVERY_PROOF_IMAGES;
      },
      message: `Maximum ${MAX_DELIVERY_PROOF_IMAGES} delivery proof images allowed`,
    },
  },
  deliveryProofUploadedAt: Date,
  // Timestamps
  paidAt: Date,
  confirmedAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Version for optimistic locking (prevent race conditions)
  __v: {
    type: Number,
    select: true,
  },
});

// Calculate seller amount and set escrow expiry before saving
transactionSchema.pre("save", function (next) {
  // Calculate seller amount
  if (this.amount && this.platformFee >= 0) {
    // Validate platform fee doesn't exceed amount
    if (this.platformFee > MAX_PLATFORM_FEE) {
      return next(new Error(`Platform fee cannot exceed ${MAX_PLATFORM_FEE}%`));
    }

    this.platformFeeAmount = Math.round((this.amount * this.platformFee) / 100);
    this.sellerAmount = this.amount - this.platformFeeAmount;

    // Ensure seller amount is not negative
    if (this.sellerAmount < 0) {
      return next(new Error("Seller amount cannot be negative"));
    }
  }

  // Set escrow expiry when payment is made (for JazzCash)
  if (this.isModified("paymentStatus") && this.paymentStatus === "paid" && this.paymentMethod === "jazzcash") {
    if (!this.escrowHeldAt) {
      this.escrowHeldAt = new Date();
      this.escrowExpiryDate = new Date(Date.now() + ESCROW_DAYS * 24 * 60 * 60 * 1000);
    }
  }

  // Set dispute window when order is completed
  if (this.isModified("orderStatus") && this.orderStatus === "completed") {
    if (!this.disputeWindowEndsAt) {
      this.disputeWindowEndsAt = new Date(Date.now() + DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    }
  }

  // Set dispute deadline when dispute is raised (7 days to resolve)
  if (this.isModified("orderStatus") && this.orderStatus === "disputed") {
    if (!this.disputeDeadline) {
      this.disputeDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  next();
});

// Method to check if dispute can still be raised
transactionSchema.methods.canRaiseDispute = function() {
  if (this.orderStatus === "disputed" || this.orderStatus === "cancelled") {
    return false;
  }
  if (this.orderStatus === "completed" && this.disputeWindowEndsAt) {
    return new Date() < this.disputeWindowEndsAt;
  }
  // Can raise dispute before completion
  return ["confirmed", "delivered"].includes(this.orderStatus);
};

// Method to check if escrow should auto-release
transactionSchema.methods.shouldAutoReleaseEscrow = function() {
  if (this.paymentMethod !== "jazzcash") return false;
  if (this.paymentStatus !== "paid") return false;
  if (this.escrowAutoReleased) return false;
  if (this.orderStatus === "disputed") return false;
  if (!this.escrowExpiryDate) return false;

  return new Date() > this.escrowExpiryDate;
};

// Static method to find transactions with expired escrow
transactionSchema.statics.findExpiredEscrow = function() {
  return this.find({
    paymentMethod: "jazzcash",
    paymentStatus: "paid",
    escrowAutoReleased: false,
    orderStatus: { $nin: ["disputed", "cancelled", "completed"] },
    escrowExpiryDate: { $lt: new Date() },
  });
};

// Static method to find unresolved disputes past deadline
transactionSchema.statics.findOverdueDisputes = function() {
  return this.find({
    orderStatus: "disputed",
    disputeResolvedAt: null,
    disputeDeadline: { $lt: new Date() },
  });
};

// Indexes
transactionSchema.index({ buyer: 1, createdAt: -1 });
transactionSchema.index({ seller: 1, createdAt: -1 });
transactionSchema.index({ listing: 1 });
transactionSchema.index({ paymentStatus: 1 });
transactionSchema.index({ orderStatus: 1 });
transactionSchema.index({ escrowExpiryDate: 1 }, { sparse: true });
transactionSchema.index({ disputeDeadline: 1 }, { sparse: true });
// Note: idempotencyKey index is already created by unique: true in schema definition

module.exports = mongoose.model("Transaction", transactionSchema);
