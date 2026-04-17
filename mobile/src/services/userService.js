import api from './api';

export const getProfile    = ()     => api.get('/user/profile');
export const updateProfile = (data) => api.put('/user/profile', data);
export const uploadAvatar  = (formData) =>
  api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });