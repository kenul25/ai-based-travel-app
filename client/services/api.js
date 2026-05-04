import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.141.35.32:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add the JWT token to the auth header
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from async storage', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
