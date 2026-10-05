import axios from 'axios';
import { tokenService } from '../utils/tokenService';

// Create Axios instance with base URL
export const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

// Ensure Content-Type is set appropriately per request
axiosInstance.interceptors.request.use((config) => {
  const isFormData = config.data instanceof FormData;
  if (!isFormData && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// Request interceptor: Add access token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors and token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 error and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenService.getRefreshToken();
        if (refreshToken) {
          // Attempt to refresh the token
          const response = await axios.post(
            'http://127.0.0.1:8000/api/token/refresh/',
            { refresh: refreshToken }
          );

          const { access } = response.data;
          tokenService.setAccessToken(access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {  // Refresh failed
        const status = refreshError.response?.status;
        if (status === 401 || status === 403) {
          tokenService.clearTokens();
          window.dispatchEvent(new Event('FORCE_LOGOUT'));
        } else {
          // Network/server error – preserve tokens and surface error
          console.warn('Token refresh failed (network/server). Preserving tokens.', refreshError);
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
