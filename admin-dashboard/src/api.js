import axios from 'axios';

// Dynamically rewrite any global axios request referencing localhost:8085 to use the production URL or hostname
axios.interceptors.request.use((config) => {
  if (config.url && config.url.includes('localhost:8085')) {
    if (import.meta.env.VITE_API_URL) {
      config.url = config.url.replace(/^https?:\/\/localhost:8085/, import.meta.env.VITE_API_URL)
                             .replace(/^localhost:8085/, import.meta.env.VITE_API_URL.replace(/^https?:\/\//, ''))
                             .replace(/localhost:8085/g, import.meta.env.VITE_API_URL.replace(/^https?:\/\//, ''));
    } else {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      config.url = config.url.replace('localhost:8085', `${hostname}:8085`);
    }
  }
  return config;
});

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${hostname}:8085`;
export const api = axios.create({ baseURL: BASE_URL });

// ─── Global 401 interceptor ───────────────────────────────────────────────────
// Expired tokens trigger logout instead of silent failure
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('pigmypay_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
