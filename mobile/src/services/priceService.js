import api from './api';

export const getPrices       = ()     => api.get('/prices/latest');
export const getCommodities  = ()     => api.get('/prices/commodities');
export const getCities       = ()     => api.get('/prices/cities');
export const getVarieties    = (commodity) => api.get(`/prices/varieties/${encodeURIComponent(commodity)}`);
export const getCitiesByFilters = (params) => api.get('/prices/cities-by-filters', { params });
export const getPriceHistory = (params) => api.get('/prices/history', { params });
export const getForecast     = (params) => api.get('/prices/forecast', { params });
// Date-range coverage ({ minDate, maxDate, count }) for a commodity+city series.
// Drives the time-range options so we only offer periods that actually contain
// data (mirrors the web PriceChart).
export const getCoverage     = (params) => api.get('/prices/coverage', { params });
export const getPriceAlerts        = ()     => api.get('/alerts');
export const createPriceAlert      = (data) => api.post('/alerts', data);
export const deletePriceAlert      = (id)   => api.delete(`/alerts/${id}`);
// Backend: PATCH /api/alerts/:id/seen and PATCH /api/alerts/seen/all
export const markAlertSeen         = (id)   => api.patch(`/alerts/${id}/seen`);
export const markAllAlertsSeen     = ()     => api.patch('/alerts/seen/all');
export const reactivatePriceAlert  = (id)   => api.post(`/alerts/${id}/reactivate`);