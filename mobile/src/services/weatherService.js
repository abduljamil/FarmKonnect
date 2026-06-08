import api from './api';

// Backend's /weather/current only reads ?city= (it looks up the city's
// coordinates from a hardcoded PAKISTAN_CITIES map). Lat/lon was silently
// discarded — every request fell back to Lahore. The DashboardScreen flow
// resolves the user's location to a city name via reverse-geocode and
// passes that here.
export const getWeather = (city) =>
  api.get('/weather/current', { params: { city: city || 'Lahore' } });

export const getWeatherForecast = (city) =>
  api.get('/weather/forecast', { params: { city: city || 'Lahore' } });

export const getWeatherCities = () => api.get('/weather/cities');
