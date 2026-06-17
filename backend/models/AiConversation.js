const mongoose = require("mongoose");

const aiConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  title: {
    type: String,
    default: "New conversation",
    trim: true,
    maxlength: 120,
  },
  lastMessage: {
    type: String,
    default: "",
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  messageCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

aiConversationSchema.index({ user: 1, lastMessageAt: -1 });

module.exports = mongoose.model("AiConversation", aiConversationSchema);
