
import axios from 'axios';

// Define the base API URL - replace with your actual API URL
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with common configuration
const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('stages_dz_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (logout user)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('stages_dz_token');
      localStorage.removeItem('stages_dz_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
