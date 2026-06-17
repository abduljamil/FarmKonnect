const aiChatService = require("../services/aiChatService");

exports.startConversation = async (req, res) => {
  try {
    const { firstMessage, language } = req.body;
    const userId = req.user._id;
    const convo = await aiChatService.createConversation(userId, firstMessage, language);
    res.status(201).json({ success: true, data: convo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.listConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const convos = await aiChatService.listConversations(userId);
    res.json({ success: true, data: convos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await aiChatService.getMessages(conversationId);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, language } = req.body;
    const userId = req.user._id;

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message content required" });
    }

    const result = await aiChatService.sendMessage({
      conversationId,
      userId,
      userMessage: message.trim(),
      language,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    await aiChatService.deleteConversation(conversationId, userId);
    res.json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.health = (req, res) => {
  const ok = !!process.env.GEMINI_API_KEY;
  res.status(ok ? 200 : 503).json({
    success: ok,
    aiEnabled: ok,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });
};
