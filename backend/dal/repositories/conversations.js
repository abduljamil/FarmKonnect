const Conversation = require("../../models/Conversation");
const BaseRepository = require("../base");

class ConversationRepository extends BaseRepository {
  constructor() {
    super(Conversation);
  }

  async findByUser(userId) {
    return await this.model
      .find({
        $or: [{ buyer: userId }, { seller: userId }],
      })
      .populate("product", "title price images status")
      .populate("buyer seller", "name email")
      .sort({ lastMessageAt: -1 });
  }

  async findByProductAndUsers(productId, buyerId, sellerId) {
    return await this.model
      .findOne({
        product: productId,
        buyer: buyerId,
        seller: sellerId,
      })
      .populate("product buyer seller", "title name email");
  }

  async updateLastMessage(conversationId, message, timestamp) {
    return await this.model.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: message,
        lastMessageAt: timestamp,
      },
      { new: true }
    );
  }
}

module.exports = new ConversationRepository();
