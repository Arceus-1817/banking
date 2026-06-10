import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_URL = 'http://10.74.59.226:8085'; 

const api = axios.create({
  baseURL: DEFAULT_URL,
  timeout: 10000, 
});

export const updateBaseURL = async (newUrl) => {
  if (newUrl) {
    api.defaults.baseURL = newUrl;
    await AsyncStorage.setItem('backend_url', newUrl);
  }
};

api.interceptors.request.use(
  async (config) => {
    const savedUrl = await AsyncStorage.getItem('backend_url');
    if (savedUrl) {
      config.baseURL = savedUrl;
    }
    // Do not attach token for authentication routes (like login)
    const isAuthRoute = config.url && (config.url.includes('/api/auth/login') || config.url.includes('/api/auth/'));
    const token = await AsyncStorage.getItem('userToken');
    if (token && !isAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;