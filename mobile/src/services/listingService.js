import api from './api';

export const getListings    = (params)    => api.get('/listings', { params });
export const getListingById = (id)        => api.get(`/listings/${id}`);
export const createListing  = (data)      => api.post('/listings', data);
export const updateListing  = (id, data)  => api.put(`/listings/${id}`, data);
export const deleteListing  = (id)        => api.delete(`/listings/${id}`);
export const getMyListings  = ()          => api.get('/listings/my/listings');

// Backend: PATCH /listings/:id/status — used by web's "Hide / Show / Mark Sold"
// buttons. Mobile was missing this wrapper, so the Hide/Show toggle on
// MyListings couldn't be implemented at all.
export const updateListingStatus = (id, status) =>
  api.patch(`/listings/${id}/status`, { status });