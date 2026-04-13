import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In a real app, this should be in an environment variable or config structure
// Depending on where you test, you'll need your machine's local IP
// For local testing on Android emulator, 10.0.2.2 points to host localhost
export const API_URL = 'https://farmkonnect.app/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
