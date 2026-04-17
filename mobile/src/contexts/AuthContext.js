import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
      } catch (error) {
        console.log('Error loading data', error);
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const signIn = async (email, password) => {
    try {
      const response = await api.post('/auth/signin', { email, password });
      console.log('Full response data:', JSON.stringify(response.data));
      console.log('Full response headers:', JSON.stringify(response.headers));

      const { user } = response.data;
      let token = response.data.token;

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

      console.log('Token found:', token ? 'YES' : 'NO');

      if (token) {
        await AsyncStorage.setItem('token', token);
        setToken(token);
      } else {
        return { success: false, message: 'Server did not return a session token.' };
      }

      if (user) {
        await AsyncStorage.setItem('user', JSON.stringify(user));
        setUser(user);
      }
      return { success: true };
    } catch (error) {
      console.log('SIGNIN ERROR:', JSON.stringify(error.response?.data));
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
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.log('Error logging out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
