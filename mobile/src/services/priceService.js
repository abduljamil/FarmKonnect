import api from './api';

export const getPrices       = ()     => api.get('/prices');
export const getPriceAlerts  = ()     => api.get('/price-alerts');
export const createPriceAlert = (data) => api.post('/price-alerts', data);
export const deletePriceAlert = (id)  => api.delete(`/price-alerts/${id}`);