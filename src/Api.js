// api.js (place this in the root directory)
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_URL = 'https://rbms.mahadiscom.in/mseb'; // Replace with your API URLhttps://rbms.mahadiscom.in/mseb

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to include the JWT
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) { 
      try {
        await AsyncStorage.removeItem('jwtToken');
        Alert.alert('Session Expired', 'Please log in again.');
      } catch (removeError) {
        console.error('Error removing token:', removeError);
      } 
    }
    return Promise.reject(error);
  }
);

export default api;