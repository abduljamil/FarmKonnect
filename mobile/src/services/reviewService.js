import api from './api';

// Mirrors backend/routes/reviews.js — only the buyer/seller-facing endpoints
// are useful from mobile; admin delete lives elsewhere.
export const createReview        = (data)            => api.post('/reviews', data);
export const getUserReviews      = (userId)          => api.get(`/reviews/user/${userId}`);
export const getMyReviews        = ()                => api.get('/reviews/my-reviews');
export const canReviewTransaction = (transactionId)  => api.get(`/reviews/can-review/${transactionId}`);
