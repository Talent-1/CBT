// cbt-frontend/src/api/api.js (MODIFIED for debugging)
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // --- ADDED DEBUGGING ---
    console.log("Axios Interceptor: Checking token in localStorage...");
    if (token) {
      console.log("Axios Interceptor: Token found. Length:", token.length, "Starting with:", token.substring(0, 10), "...");
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log("Axios Interceptor: NO TOKEN FOUND in localStorage.");
    }
    // --- END ADDED DEBUGGING ---
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;