import api from './api';

export const getPrices       = ()     => api.get('/prices/latest');
export const getCommodities  = ()     => api.get('/prices/commodities');
export const getCities       = ()     => api.get('/prices/cities');
export const getVarieties    = (commodity) => api.get(`/prices/varieties/${encodeURIComponent(commodity)}`);
export const getCitiesByFilters = (params) => api.get('/prices/cities-by-filters', { params });
export const getPriceHistory = (params) => api.get('/prices/history', { params });
export const getPriceAlerts  = ()     => api.get('/price-alerts');
export const createPriceAlert = (data) => api.post('/price-alerts', data);
export const deletePriceAlert = (id)  => api.delete(`/price-alerts/${id}`);