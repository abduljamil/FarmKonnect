const AiConversation = require("../../models/AiConversation");
const BaseRepository = require("../base");

class AiConversationRepository extends BaseRepository {
  constructor() {
    super(AiConversation);
  }

  async findByUser(userId, limit = 50) {
    return await this.model
      .find({ user: userId })
      .sort({ lastMessageAt: -1 })
      .limit(limit);
  }

  async touch(conversationId, lastMessage) {
    return await this.model.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: (lastMessage || "").slice(0, 200),
        lastMessageAt: new Date(),
        $inc: { messageCount: 1 },
      },
      { new: true }
    );
  }
}

module.exports = new AiConversationRepository();
