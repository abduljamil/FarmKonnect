const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  lastMessage: {
    type: String,
    default: "",
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deletedBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      deletedAt: {
        type: Date,
        required: true,
      },
    },
  ],
});

// Compound index to ensure unique conversation per product-buyer-seller combo
conversationSchema.index({ product: 1, buyer: 1, seller: 1 }, { unique: true });

// Additional indexes for faster queries
conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ seller: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
