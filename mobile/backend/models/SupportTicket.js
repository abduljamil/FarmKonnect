const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema({
  // User who created the ticket (optional for guests)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // Guest contact info (for non-logged-in users)
  guestEmail: {
    type: String,
  },
  guestName: {
    type: String,
  },
  // Related transaction (optional)
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
  },
  // Ticket details
  subject: {
    type: String,
    required: true,
    maxlength: 200,
  },
  category: {
    type: String,
    enum: ["dispute", "payment", "delivery", "technical", "account", "other"],
    default: "other",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },
  status: {
    type: String,
    enum: ["open", "in_progress", "resolved", "closed"],
    default: "open",
  },
  // Messages in the ticket
  messages: [{
    sender: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    senderName: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: Date,
  closedAt: Date,
});

// Update updatedAt on save
supportTicketSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes
supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ transaction: 1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
