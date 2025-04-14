// src/axiosInterceptors.js
import axios from 'axios';

axios.interceptors.response.use(
  response => response,
  error => {
    console.log('Interceptor caught error:', error);
    if (error.response && error.response.status === 403) {
      console.log('Received 403 error - token may be expired. Logging out.');
      // Clear stored token and related data
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
