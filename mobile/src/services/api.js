import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In a real app, this should be in an environment variable or config structure.
// For local testing on Android emulator, 10.0.2.2 points to host localhost.
export const API_URL = 'https://farmkonnect.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// M5 perf fix: cache the token in module scope so the request interceptor
// stops awaiting AsyncStorage on every single API call (was adding 5-30ms of
// I/O per request on Android). AuthContext calls setAuthToken on login/logout
// to keep this in sync. Initial value is hydrated lazily on the first call
// after a cold start.
let cachedToken = null;
let hydrated = false;

export const setAuthToken = (token) => {
  cachedToken = token || null;
  hydrated = true;
};

api.interceptors.request.use(
  async (config) => {
    if (!hydrated) {
      try {
        cachedToken = await AsyncStorage.getItem('token');
      } catch {
        cachedToken = null;
      }
      hydrated = true;
    }
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth-expiry handler: any 401 from the backend (expired JWT, deleted user,
// rotated JWT_SECRET) wipes the cached token + AsyncStorage so AuthContext
// drops back to the auth stack on its next re-read. Without this, the whole
// app sits in a "logged in but every call 401s" state until manual logout.
// AuthContext subscribes via setOnUnauthorized so it can also clear React
// state in the same tick — otherwise the UI still thinks you're signed in.
let onUnauthorized = null;
export const setOnUnauthorized = (fn) => { onUnauthorized = fn; };

// Connection-status hook used by the offline banner. Any "Network Error"
// from axios flips us to offline; the next successful response flips back.
// Avoids adding @react-native-community/netinfo as a new native dep.
let onConnectionChange = null;
let lastOnlineState = true;
export const setOnConnectionChange = (fn) => { onConnectionChange = fn; };
const flipOnline = (online) => {
  if (online !== lastOnlineState) {
    lastOnlineState = online;
    try { onConnectionChange?.(online); } catch { /* non-fatal */ }
  }
};

api.interceptors.response.use(
  (response) => {
    flipOnline(true);
    return response;
  },
  async (error) => {
    if (error?.response?.status === 401) {
      cachedToken = null;
      hydrated = true;
      try { await AsyncStorage.multiRemove(['token', 'user']); } catch { /* non-fatal */ }
      try { onUnauthorized?.(); } catch { /* non-fatal */ }
    }
    // axios marks network failures with no `error.response` (the request
    // never reached the server). Treat that as offline.
    if (!error?.response) {
      flipOnline(false);
    } else {
      flipOnline(true);
    }
    return Promise.reject(error);
  }
);

export default api;
