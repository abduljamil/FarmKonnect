const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  messageType: {
    type: String,
    enum: ["text", "offer", "system"],
    default: "text",
  },
  content: {
    type: String,
    required: true,
  },
  // For offer messages
  offerAmount: {
    type: Number,
    min: 0,
  },
  offerStatus: {
    type: String,
    enum: ["pending", "accepted", "rejected", "countered"],
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, sender: 1, read: 1 });

module.exports = mongoose.model("Message", messageSchema);
