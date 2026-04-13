import api from './api';

export const getWeather = (lat, lon) => {
  return api.get('/weather', { params: { lat, lon } });
};
