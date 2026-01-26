const chatService = require("../services/chatService");

// Get or create conversation
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { productId, sellerId } = req.body;
    const buyerId = req.user._id;

    // console.log("Creating conversation with:", { productId, buyerId: buyerId?.toString(), sellerId });

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required",
      });
    }

    const conversation = await chatService.getOrCreateConversation(
      productId,
      buyerId,
      sellerId
    );

    // Check if this is a newly created conversation
    const Conversation = require("../models/Conversation");
    const isNewConversation = conversation.createdAt.getTime() > Date.now() - 5000; // Created within last 5 seconds

    // Emit event to admin panel for real-time conversation count update
    if (isNewConversation && req.io) {
      req.io.emit("new_conversation", { conversation });
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Error in getOrCreateConversation:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user conversations
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await chatService.getUserConversations(userId);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get conversation messages
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    const userId = req.user._id;

    const messages = await chatService.getMessages(
      conversationId,
      parseInt(limit),
      parseInt(skip),
      userId
    );

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Send message (HTTP endpoint)
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, messageType, offerAmount } = req.body;
    const senderId = req.user._id;

    const message = await chatService.sendMessage(
      conversationId,
      senderId,
      content,
      messageType,
      offerAmount
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await chatService.markMessagesAsRead(conversationId, userId);

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update offer status
exports.updateOfferStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const message = await chatService.updateOfferStatus(messageId, status);

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await chatService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete conversation
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const result = await chatService.deleteConversation(conversationId, userId);

    // Emit event to admin panel if conversation was hard deleted (both users deleted)
    if (result.isFullyDeleted && req.io) {
      req.io.emit("conversation_deleted", { conversationId });
    }

    res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get total conversations count (admin only)
exports.getConversationsCount = async (req, res) => {
  try {
    const Conversation = require("../models/Conversation");
    const count = await Conversation.countDocuments();

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
