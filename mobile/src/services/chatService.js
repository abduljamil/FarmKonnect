import api from './api';

export const getConversations = () =>
  api.get('/chat/conversations');

// Paginated message fetch. Backend supports ?limit & ?skip; default to a
// reasonable page size so we don't yank thousands of rows on every chat open.
export const getMessages = (conversationId, { limit = 50, skip = 0 } = {}) =>
  api.get(`/chat/conversations/${conversationId}/messages`, {
    params: { limit, skip },
  });

export const sendMessage = (conversationId, content) =>
  api.post('/chat/messages', { conversationId, content });

export const startConversation = (listingId, recipientId) =>
  api.post('/chat/conversations', { listingId, recipientId });

export const deleteConversation = (conversationId) =>
  api.delete(`/chat/conversations/${conversationId}`);

// Backend: GET /api/chat/unread-count → { count: <int> }
export const getUnreadCount = () => api.get('/chat/unread-count');