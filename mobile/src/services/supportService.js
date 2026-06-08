import api from './api';

// Backend routes (backend/routes/support.js):
//   POST   /api/support/tickets               (optional auth)
//   GET    /api/support/tickets               (protected)
//   GET    /api/support/tickets/:id           (protected)
//   POST   /api/support/tickets/:id/messages  (protected)
export const createTicket  = (data)             => api.post('/support/tickets', data);
export const getMyTickets  = ()                 => api.get('/support/tickets');
export const getTicket     = (id)               => api.get(`/support/tickets/${id}`);
export const addMessage    = (id, content)      => api.post(`/support/tickets/${id}/messages`, { content });
