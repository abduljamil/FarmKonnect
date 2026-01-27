import API_URL from "../config";

// Get auth token from sessionStorage
const getToken = () => {
  const userData = sessionStorage.getItem("user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return user.token;
    } catch (e) { // eslint-disable-line no-unused-vars
      return null;
    }
  }
  return null;
};

// API helper function
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

// Chat API
export const chatAPI = {
  // Get or create conversation
  getOrCreateConversation: async (productId, sellerId) => {
    return apiCall("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ productId, sellerId }),
    });
  },

  // Get user's conversations
  getUserConversations: async () => {
    return apiCall("/chat/conversations");
  },

  // Get messages for a conversation
  getMessages: async (conversationId, limit = 50, skip = 0) => {
    return apiCall(
      `/chat/conversations/${conversationId}/messages?limit=${limit}&skip=${skip}`
    );
  },

  // Send message (HTTP fallback)
  sendMessage: async (
    conversationId,
    content,
    messageType = "text",
    offerAmount = null
  ) => {
    return apiCall("/chat/messages", {
      method: "POST",
      body: JSON.stringify({
        conversationId,
        content,
        messageType,
        offerAmount,
      }),
    });
  },

  // Mark messages as read
  markAsRead: async (conversationId) => {
    return apiCall(`/chat/conversations/${conversationId}/read`, {
      method: "PUT",
    });
  },

  // Update offer status
  updateOfferStatus: async (messageId, status) => {
    return apiCall(`/chat/messages/${messageId}/offer`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  // Get unread message count
  getUnreadCount: async () => {
    return apiCall("/chat/unread-count");
  },

  // Delete conversation
  deleteConversation: async (conversationId) => {
    return apiCall(`/chat/conversations/${conversationId}`, {
      method: "DELETE",
    });
  },
};

export default chatAPI;
