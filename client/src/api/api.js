import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://aht-rk52.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to dynamically inject the Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
