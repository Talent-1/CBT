// cbt-frontend/src/api/apiClient.js 
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api', // Or just '/api' if you're using a proxy in vite.config.js
  withCredentials: true, // <-- Make sure this is true if you send cookies
  headers: {
    'Content-Type': 'application/json', // Default, might be overridden for file uploads
    // Authorization header will be added dynamically, if used
  },
});

// Add an interceptor to attach the token for all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Or wherever you store your token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;