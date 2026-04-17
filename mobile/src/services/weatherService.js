import api from './api';

export const getWeather = (lat, lon) => {
  return api.get('/weather/current', { params: { lat, lon } });
};
