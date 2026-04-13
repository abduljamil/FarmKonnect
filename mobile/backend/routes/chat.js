const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Get or create conversation
router.post("/conversations", chatController.getOrCreateConversation);

// Get user's conversations
router.get("/conversations", chatController.getUserConversations);

// Get messages for a conversation
router.get(
  "/conversations/:conversationId/messages",
  chatController.getMessages
);

// Send a message (HTTP fallback, Socket.io is preferred)
router.post("/messages", chatController.sendMessage);

// Mark messages as read
router.put("/conversations/:conversationId/read", chatController.markAsRead);

// Update offer status
router.put("/messages/:messageId/offer", chatController.updateOfferStatus);

// Get unread message count
router.get("/unread-count", chatController.getUnreadCount);

// Get total conversations count (admin)
router.get("/stats/conversations", chatController.getConversationsCount);

// Delete conversation
router.delete(
  "/conversations/:conversationId",
  chatController.deleteConversation
);

module.exports = router;
