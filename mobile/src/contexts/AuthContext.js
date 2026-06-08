import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken, setOnUnauthorized } from '../services/api';
import { registerForPushNotificationsAsync, unregisterPushToken } from '../services/pushNotifications';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // M4 perf fix: one round-trip to AsyncStorage instead of two sequential awaits.
    const loadStorageData = async () => {
      try {
        const pairs = await AsyncStorage.multiGet(['token', 'user']);
        const storedToken = pairs.find(([k]) => k === 'token')?.[1];
        const storedUser  = pairs.find(([k]) => k === 'user' )?.[1];
        setAuthToken(storedToken || null);
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
        // Refresh push registration on cold start too — covers the case
        // where the user already had a session before push was added or
        // where the token has rotated since last launch.
        if (storedToken) {
          registerForPushNotificationsAsync().catch(() => {});
        }
      } catch (error) {
        // Storage failure is non-fatal — user lands on the welcome screen.
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();

    // When the response interceptor sees a 401, drop React state too so the
    // AppNavigator switches to the auth stack on the next render. The
    // interceptor already cleared AsyncStorage + the cached token.
    setOnUnauthorized(() => {
      setToken(null);
      setUser(null);
    });
    return () => setOnUnauthorized(null);
  }, []);

  const signIn = async (email, password) => {
    try {
      const response = await api.post('/auth/signin', { email, password });

      const { user } = response.data;
      let token = response.data.token;

      // Fallback: extract token from Set-Cookie if backend issued it as a cookie
      // rather than a JSON field (some auth paths do both).
      if (!token && response.headers) {
        const setCookieHeader = response.headers['set-cookie'] || response.headers['Set-Cookie'];
        if (setCookieHeader) {
          const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
          for (const cookieStr of cookies) {
            if (cookieStr.includes('token=')) {
              token = cookieStr.split('token=')[1].split(';')[0];
              break;
            }
          }
        }
      }

      if (!token) {
        return { success: false, message: 'Server did not return a session token.' };
      }

      // Single multiSet roundtrip beats two awaits (M4 perf fix).
      const pairs = [['token', token]];
      if (user) pairs.push(['user', JSON.stringify(user)]);
      await AsyncStorage.multiSet(pairs);
      setAuthToken(token);
      setToken(token);
      if (user) setUser(user);

      // Register for push notifications post-login. Non-blocking + fails
      // silently if the device denies permission / is a simulator.
      registerForPushNotificationsAsync().catch(() => {});

      return { success: true };
    } catch (error) {
      const data = error.response?.data;
      if (data?.requiresVerification) {
        return {
          success: false,
          requiresVerification: true,
          email: data.email || email,
          message: data.message
        };
      }
      return {
        success: false,
        message: data?.message || error.message || 'Login failed'
      };
    }
  };

  const signUp = async (name, email, password) => {
    try {
      const response = await api.post('/auth/signup', { name, email, password });
      return { success: true, data: response.data };
    } catch (error) {
      const data = error.response?.data;
      return { success: false, message: data?.message || error.message || 'Sign up failed' };
    }
  };

  const logout = async () => {
    // Unregister push first while we still have a valid auth header — keeps
    // notifications targeted to the right account if another user signs in
    // on this device. Non-blocking; we still log out on failure.
    try { await unregisterPushToken(); } catch { /* non-fatal */ }
    try {
      await AsyncStorage.multiRemove(['token', 'user']);
    } catch {
      // Storage failure is non-fatal; state still clears.
    }
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  // Mobile-native Google sign-in. The token comes from expo-auth-session's
  // Google provider on the SignInScreen — we just exchange it for our own
  // session JWT via POST /api/auth/google (server-side verification with
  // Google's tokeninfo endpoint, then upsert + JWT).
  const signInWithGoogle = async (idToken) => {
    if (!idToken) {
      return { success: false, message: 'Missing Google ID token' };
    }
    try {
      const res = await api.post('/auth/google', { idToken });
      const { token, user: u } = res.data || {};
      if (!token) {
        return { success: false, message: 'Server did not return a session token.' };
      }
      const pairs = [['token', token]];
      if (u) pairs.push(['user', JSON.stringify(u)]);
      await AsyncStorage.multiSet(pairs);
      setAuthToken(token);
      setToken(token);
      if (u) setUser(u);
      registerForPushNotificationsAsync().catch(() => {});
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Google sign-in failed',
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signInWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
