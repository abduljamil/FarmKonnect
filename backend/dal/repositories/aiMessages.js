const AiMessage = require("../../models/AiMessage");
const BaseRepository = require("../base");

class AiMessageRepository extends BaseRepository {
  constructor() {
    super(AiMessage);
  }

  async findByConversation(conversationId, limit = 100) {
    return await this.model
      .find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  async deleteByConversation(conversationId) {
    return await this.model.deleteMany({ conversation: conversationId });
  }
}

module.exports = new AiMessageRepository();
