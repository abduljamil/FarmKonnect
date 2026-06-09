import api from './api';

export const listConversations = () => api.get('/ai/conversations');

export const startConversation = (firstMessage) =>
  api.post('/ai/conversations', { firstMessage });

export const getMessages = (conversationId) =>
  api.get(`/ai/conversations/${conversationId}/messages`);

export const sendMessage = (conversationId, message) =>
  api.post(`/ai/conversations/${conversationId}/messages`, { message });

export const deleteConversation = (conversationId) =>
  api.delete(`/ai/conversations/${conversationId}`);

export const health = () => api.get('/ai/health');
