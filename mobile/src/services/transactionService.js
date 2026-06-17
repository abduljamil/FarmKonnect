import api from './api';

export const createTransaction    = (data)     => api.post('/payments/transactions', data);
export const getMyTransactions    = ()         => api.get('/payments/transactions');
export const getTransaction       = (id)       => api.get(`/payments/transactions/${id}`);
export const confirmOrder         = (id)       => api.put(`/payments/transactions/${id}/confirm`);
export const markDelivered        = (id, data) => api.put(`/payments/transactions/${id}/deliver`, data);
export const completeTransaction  = (id)       => api.put(`/payments/transactions/${id}/complete`);
export const cancelTransaction    = (id)       => api.put(`/payments/transactions/${id}/cancel`);
export const raiseDispute         = (id, data) => api.put(`/payments/transactions/${id}/dispute`, data);
// Buyer rejects a delivery (backend: PUT /reject-delivery, body { reason }).
export const rejectDelivery       = (id, data) => api.put(`/payments/transactions/${id}/reject-delivery`, data);
export const confirmDelivery      = (id)       => api.put(`/payments/transactions/${id}/confirm-delivery`);
export const confirmPayment       = (id)       => api.put(`/payments/transactions/${id}/confirm-payment`);
export const sellerConfirmPayment = (id)       => api.put(`/payments/transactions/${id}/seller-confirm-payment`);

// JazzCash payment processing — buyer-only, called after createTransaction
// for JazzCash orders. Backend route: POST /payments/transactions/:id/pay
// with { mobileNumber, cnic, paymentIdempotencyKey }.
export const processPayment = (id, data) => api.post(`/payments/transactions/${id}/pay`, data);