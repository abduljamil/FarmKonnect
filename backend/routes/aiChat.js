const express = require("express");
const router = express.Router();
const aiChatController = require("../controllers/aiChatController");
const { protect, optionalAuth } = require("../middleware/auth");
const { writeLimiter } = require("../middleware/limiter");

router.get("/health", aiChatController.health);

router.use(optionalAuth);

router.get("/conversations", aiChatController.listConversations);
router.post("/conversations", aiChatController.startConversation);
router.get(
  "/conversations/:conversationId/messages",
  aiChatController.getMessages
);
router.post(
  "/conversations/:conversationId/messages",
  writeLimiter,
  aiChatController.sendMessage
);
router.delete(
  "/conversations/:conversationId",
  aiChatController.deleteConversation
);

module.exports = router;
