import api from './api';

export const getConversations = () =>
  api.get('/chat/conversations');

export const getMessages = (conversationId) =>
  api.get(`/chat/conversations/${conversationId}/messages`);

export const sendMessage = (conversationId, content) =>
  api.post('/chat/messages', { conversationId, content });

export const startConversation = (listingId, recipientId) =>
  api.post('/chat/conversations', { listingId, recipientId });

export const deleteConversation = (conversationId) =>
  api.delete(`/chat/conversations/${conversationId}`);