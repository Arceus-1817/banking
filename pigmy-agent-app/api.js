import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🚨 UPDATED WITH YOUR HOTSPOT IP AND PORT 8085 🚨
const BASE_URL = 'http://10.109.100.226:8085'; 

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, 
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;