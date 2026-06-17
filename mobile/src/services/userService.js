import api from './api';

export const getProfile    = ()     => api.get('/user/profile');
export const updateProfile = (data) => api.put('/user/profile', data);
export const uploadAvatar  = (formData) =>
  api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Privacy & security — backend routes exist (backend/routes/user.js +
// userController.getPrivacySettings/updatePrivacySettings/getLoginHistory).
// Mobile had removed these on the (incorrect) assumption they 404'd.
export const getPrivacySettings    = ()     => api.get('/user/privacy-settings');
export const updatePrivacySettings = (data) => api.put('/user/privacy-settings', data);
export const getLoginHistory       = ()     => api.get('/user/login-history');