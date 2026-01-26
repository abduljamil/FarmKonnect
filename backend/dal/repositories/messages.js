const Message = require("../../models/Message");
const BaseRepository = require("../base");

class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }

  async findByConversation(conversationId, limit = 50, skip = 0) {
    return await this.model
      .find({ conversation: conversationId })
      .populate("sender", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  async markAsRead(conversationId, excludeSenderId) {
    return await this.model.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: excludeSenderId },
        read: false,
      },
      { read: true }
    );
  }

  async countUnread(conversationIds, excludeSenderId) {
    return await this.model.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: excludeSenderId },
      read: false,
    });
  }

  async getOfferMessages(conversationId) {
    return await this.model
      .find({
        conversation: conversationId,
        messageType: "offer",
      })
      .populate("sender", "name email")
      .sort({ createdAt: -1 });
  }

  async updateOfferStatus(messageId, status) {
    return await this.model
      .findByIdAndUpdate(messageId, { offerStatus: status }, { new: true })
      .populate("sender", "name email");
  }
}

module.exports = new MessageRepository();
