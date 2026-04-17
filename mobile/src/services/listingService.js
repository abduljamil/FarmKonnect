import api from './api';

export const getListings  = (params) => api.get('/listings', { params });
export const getListingById = (id)   => api.get(`/listings/${id}`);
export const createListing  = (data) => api.post('/listings', data);
export const updateListing  = (id, data) => api.put(`/listings/${id}`, data);
export const deleteListing  = (id)   => api.delete(`/listings/${id}`);
export const getMyListings  = ()     => api.get('/listings/my/listings');