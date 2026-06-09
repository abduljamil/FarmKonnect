const mongoose = require("mongoose");

const aiMessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AiConversation",
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "model", "tool"],
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  toolCalls: [
    {
      name: { type: String },
      args: { type: mongoose.Schema.Types.Mixed },
      result: { type: mongoose.Schema.Types.Mixed },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

aiMessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model("AiMessage", aiMessageSchema);
