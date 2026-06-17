import API_URL from "../config";

const getToken = () => {
  const userData = sessionStorage.getItem("user");
  if (userData) {
    try {
      return JSON.parse(userData).token;
    } catch {
      return null;
    }
  }
  return null;
};

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
    credentials: "include",
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { message: "Invalid response from server" };
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

export const kisanAPI = {
  health: () => apiCall("/ai/health"),

  listConversations: () => apiCall("/ai/conversations"),

  startConversation: (firstMessage, language) =>
    apiCall("/ai/conversations", {
      method: "POST",
      body: JSON.stringify({ firstMessage, language }),
    }),

  getMessages: (conversationId) =>
    apiCall(`/ai/conversations/${conversationId}/messages`),

  sendMessage: (conversationId, message, language) =>
    apiCall(`/ai/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message, language }),
    }),

  deleteConversation: (conversationId) =>
    apiCall(`/ai/conversations/${conversationId}`, {
      method: "DELETE",
    }),
};

export default kisanAPI;
