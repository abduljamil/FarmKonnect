const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Listing = require("../models/Listing");

class ChatService {
  // Get or create a conversation
  async getOrCreateConversation(productId, buyerId, sellerId) {
    try {
      // Validate required parameters
      if (!productId) {
        throw new Error("Product ID is required");
      }
      if (!buyerId) {
        throw new Error("Buyer ID is required");
      }
      if (!sellerId) {
        throw new Error("Seller ID is required");
      }

      // Prevent sellers from messaging themselves
      if (buyerId.toString() === sellerId.toString()) {
        throw new Error("You cannot message yourself about your own listing");
      }

      // Check if conversation already exists
      let conversation = await Conversation.findOne({
        product: productId,
        buyer: buyerId,
        seller: sellerId,
      })
        .populate("product", "title price images")
        .populate("buyer", "name email avatar")
        .populate("seller", "name email avatar");

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
          conversation = await Conversation.findById(conversation._id)
            .populate("product", "title price images")
            .populate("buyer", "name email")
            .populate("seller", "name email");
        }

        return conversation;
      }

      // If not, create a new one
      conversation = await Conversation.create({
        product: productId,
        buyer: buyerId,
        seller: sellerId,
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("product", "title price images")
        .populate("buyer", "name email avatar")
        .populate("seller", "name email avatar");

      return conversation;
    } catch (error) {
      throw new Error(`Error getting/creating conversation: ${error.message}`);
    }
  }

  // Get all conversations for a user (optimized - no N+1 queries)
  async getUserConversations(userId) {
    try {
      const mongoose = require('mongoose');
      let userObjectId;
      try {
        userObjectId = typeof userId === 'string'
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      } catch (err) {
        throw new Error(`Invalid user ID format: ${userId}`);
      }

      // Use aggregation to avoid N+1 queries
      // Add maxTimeMS to prevent hanging queries
      const conversations = await Conversation.aggregate([
        // Match conversations where user is buyer or seller
        {
          $match: {
            $or: [{ buyer: userObjectId }, { seller: userObjectId }],
          },
        },
        // Add field to check if user deleted this conversation
        {
          $addFields: {
            userDeletion: {
              $filter: {
                input: { $ifNull: ["$deletedBy", []] },
                as: "del",
                cond: { $eq: ["$$del.userId", userObjectId] },
              },
            },
          },
        },
        // Lookup latest message after deletion (if deleted)
        {
          $lookup: {
            from: "messages",
            let: {
              convId: "$_id",
              deletedAt: { $arrayElemAt: ["$userDeletion.deletedAt", 0] },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$conversation", "$$convId"] },
                      { $gt: ["$createdAt", { $ifNull: ["$$deletedAt", new Date(0)] }] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "messagesAfterDeletion",
          },
        },
        // Filter: show if not deleted OR has messages after deletion
        {
          $match: {
            $or: [
              { userDeletion: { $size: 0 } }, // Not deleted by user
              { messagesAfterDeletion: { $ne: [] } }, // Has new messages after deletion
            ],
          },
        },
        // Sort by last message time
        { $sort: { lastMessageAt: -1 } },
        // Lookup product (collection is "products", not "listings")
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        // Lookup buyer
        {
          $lookup: {
            from: "users",
            localField: "buyer",
            foreignField: "_id",
            as: "buyer",
          },
        },
        { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
        // Lookup seller
        {
          $lookup: {
            from: "users",
            localField: "seller",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
        // Project only needed fields
        {
          $project: {
            _id: 1,
            lastMessage: 1,
            lastMessageAt: 1,
            unreadCount: 1,
            deletedBy: 1,
            createdAt: 1,
            updatedAt: 1,
            "product._id": 1,
            "product.title": 1,
            "product.price": 1,
            "product.images": 1,
            "product.status": 1,
            "buyer._id": 1,
            "buyer.name": 1,
            "buyer.email": 1,
            "buyer.avatar": 1,
            "seller._id": 1,
            "seller.name": 1,
            "seller.email": 1,
            "seller.avatar": 1,
          },
        },
        // Filter out conversations with missing data (deleted products/users)
        {
          $match: {
            "product._id": { $exists: true, $ne: null },
            "buyer._id": { $exists: true, $ne: null },
            "seller._id": { $exists: true, $ne: null },
          },
        },
      ]);

      return conversations;
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
      await message.populate("sender", "name email avatar");
      await message.populate({
        path: "conversation",
        populate: [
          { path: "buyer", select: "name email avatar" },
          { path: "seller", select: "name email avatar" },
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
        .populate("sender", "name email avatar")
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
      ).populate("sender", "name email avatar");

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
