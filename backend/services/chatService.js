const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Listing = require("../models/Listing");

class ChatService {
  // Get or create a conversation
  async getOrCreateConversation(productId, buyerId, sellerId) {
    try {
      // Prevent sellers from messaging themselves
      if (buyerId.toString() === sellerId.toString()) {
        throw new Error("You cannot message yourself about your own listing");
      }

      // Check if conversation already exists
      let conversation = await Conversation.findOne({
        product: productId,
        buyer: buyerId,
        seller: sellerId,
      }).populate("product buyer seller", "title name email");

      // If conversation exists, check if it was deleted by the current user
      if (conversation) {
        const wasDeletedByUser = conversation.deletedBy.some(
          (del) => del.userId.toString() === buyerId.toString()
        );

        if (wasDeletedByUser) {
          // Remove the deletion entry for this user to "restore" the conversation
          conversation.deletedBy = conversation.deletedBy.filter(
            (del) => del.userId.toString() !== buyerId.toString()
          );
          await conversation.save();

          // Reload with populated fields
          conversation = await Conversation.findById(conversation._id).populate(
            "product buyer seller",
            "title name email"
          );
        }

        return conversation;
      }

      // If not, create a new one
      conversation = await Conversation.create({
        product: productId,
        buyer: buyerId,
        seller: sellerId,
      });

      conversation = await Conversation.findById(conversation._id).populate(
        "product buyer seller",
        "title name email"
      );

      return conversation;
    } catch (error) {
      throw new Error(`Error getting/creating conversation: ${error.message}`);
    }
  }

  // Get all conversations for a user
  async getUserConversations(userId) {
    try {
      const conversations = await Conversation.find({
        $or: [{ buyer: userId }, { seller: userId }],
      })
        .populate("product", "title price images status")
        .populate("buyer seller", "name email")
        .sort({ lastMessageAt: -1 });

      // Filter out conversations where user deleted AND no new messages after deletion
      const filteredConversations = [];
      for (const conv of conversations) {
        const deletionInfo = conv.deletedBy.find(
          (del) => del.userId.toString() === userId.toString()
        );

        if (deletionInfo) {
          // Check if there are messages after deletion
          const hasNewMessages = await Message.exists({
            conversation: conv._id,
            createdAt: { $gt: deletionInfo.deletedAt },
          });

          // Only show if there are new messages after deletion
          if (hasNewMessages) {
            filteredConversations.push(conv);
          }
        } else {
          // User hasn't deleted this conversation, show it
          filteredConversations.push(conv);
        }
      }

      return filteredConversations;
    } catch (error) {
      throw new Error(`Error fetching conversations: ${error.message}`);
    }
  }

  // Send a message
  async sendMessage(
    conversationId,
    senderId,
    content,
    messageType = "text",
    offerAmount = null
  ) {
    try {
      // First, verify the conversation exists
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Update conversation's last message but keep deletion timestamps
      // This allows the conversation to reappear for users who deleted it,
      // but they will only see messages after their deletion timestamp
      conversation.lastMessage = content;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      const messageData = {
        conversation: conversationId,
        sender: senderId,
        messageType,
        content,
      };

      // Add offer data if it's an offer message
      if (messageType === "offer" && offerAmount) {
        messageData.offerAmount = offerAmount;
        messageData.offerStatus = "pending";
      }

      const message = await Message.create(messageData);

      // Populate sender and conversation info
      await message.populate("sender", "name email");
      await message.populate({
        path: "conversation",
        populate: [
          { path: "buyer", select: "name email" },
          { path: "seller", select: "name email" },
          { path: "product", select: "title" },
        ],
      });

      if (!message.conversation) {
        console.error(`⚠️ Failed to populate conversation for message ${message._id}`);
        throw new Error("Failed to populate conversation details");
      }

      return message;
    } catch (error) {
      throw new Error(`Error sending message: ${error.message}`);
    }
  }

  // Get messages for a conversation
  async getMessages(conversationId, limit = 50, skip = 0, userId = null) {
    try {
      let query = { conversation: conversationId };

      // If userId is provided, filter messages based on deletion timestamp
      if (userId) {
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          const deletionInfo = conversation.deletedBy.find(
            (del) => del.userId.toString() === userId.toString()
          );

          // Only show messages sent after the user's deletion timestamp
          if (deletionInfo) {
            query.createdAt = { $gt: deletionInfo.deletedAt };
          }
        }
      }

      const messages = await Message.find(query)
        .populate("sender", "name email")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      throw new Error(`Error fetching messages: ${error.message}`);
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId, userId) {
    try {
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          read: false,
        },
        { read: true }
      );
    } catch (error) {
      throw new Error(`Error marking messages as read: ${error.message}`);
    }
  }

  // Update offer status
  async updateOfferStatus(messageId, status) {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { offerStatus: status },
        { new: true }
      ).populate("sender", "name email");

      return message;
    } catch (error) {
      throw new Error(`Error updating offer status: ${error.message}`);
    }
  }

  // Get unread message count for a user
  async getUnreadCount(userId) {
    try {
      const conversations = await Conversation.find({
        $or: [{ buyer: userId }, { seller: userId }],
      });

      const conversationIds = [];
      for (const conv of conversations) {
        const deletionInfo = conv.deletedBy.find(
          (del) => del.userId.toString() === userId.toString()
        );

        if (deletionInfo) {
          // Check if there are messages after deletion
          const hasNewMessages = await Message.exists({
            conversation: conv._id,
            createdAt: { $gt: deletionInfo.deletedAt },
          });
          if (hasNewMessages) {
            conversationIds.push(conv._id);
          }
        } else {
          conversationIds.push(conv._id);
        }
      }

      const unreadCount = await Message.countDocuments({
        conversation: { $in: conversationIds },
        sender: { $ne: userId },
        read: false,
      });

      return unreadCount;
    } catch (error) {
      throw new Error(`Error getting unread count: ${error.message}`);
    }
  }

  // Delete a conversation (soft delete per user, hard delete when both delete)
  async deleteConversation(conversationId, userId) {
    try {
      // Find the conversation
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Check if user is part of the conversation
      if (
        conversation.buyer.toString() !== userId.toString() &&
        conversation.seller.toString() !== userId.toString()
      ) {
        throw new Error("Not authorized to delete this conversation");
      }

      const deletionTimestamp = new Date();

      // Add user to deletedBy array with timestamp (soft delete)
      await Conversation.findByIdAndUpdate(conversationId, {
        $pull: { deletedBy: { userId: userId } }, // Remove existing entry if any
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        $push: { deletedBy: { userId: userId, deletedAt: deletionTimestamp } },
      });

      // Check if both users have deleted the conversation
      const updatedConversation = await Conversation.findById(conversationId);
      const buyerDeleted = updatedConversation.deletedBy.find(
        (del) => del.userId.toString() === conversation.buyer.toString()
      );
      const sellerDeleted = updatedConversation.deletedBy.find(
        (del) => del.userId.toString() === conversation.seller.toString()
      );

      // If both users have deleted the conversation - hard delete
      if (buyerDeleted && sellerDeleted) {
        // Find the LATEST deletion timestamp (most recent deletion)
        // We delete all messages before this time because both users have now deleted
        const latestDeletionDate = new Date(
          Math.max(
            new Date(buyerDeleted.deletedAt).getTime(),
            new Date(sellerDeleted.deletedAt).getTime()
          )
        );

        // Delete all messages that were sent BEFORE the latest deletion timestamp
        // Since both users have deleted, remove all messages both have seen
        await Message.deleteMany({
          conversation: conversationId,
          createdAt: { $lte: latestDeletionDate },
        });

        // Also delete the conversation itself when both users delete
        await Conversation.findByIdAndDelete(conversationId);

        return { success: true, isFullyDeleted: true };
      }

      return { success: true, isFullyDeleted: false };
    } catch (error) {
      throw new Error(`Error deleting conversation: ${error.message}`);
    }
  }
}

module.exports = new ChatService();
