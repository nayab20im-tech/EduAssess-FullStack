import axios from 'axios';

export const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

const AUTH_TOKEN_KEY = 'eduassess_auth_token';

export const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
};

export const storeAuthToken = (token) => {
  if (typeof window === 'undefined' || !token) return;
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
    }
    return Promise.reject(error);
  }
);

export const getGoogleAuthUrl = () => `${API_ORIGIN}/api/auth/google`;

export const getApiErrorMessage = (
  error,
  fallback = 'Something went wrong. Please try again.'
) => {
  if (error.response?.data?.message) return error.response.data.message;

  if (error.code === 'ECONNABORTED') {
    return 'The request took longer than expected. Your internet may be slow, or AI evaluation may still be processing.';
  }

  if (!error.response) {
    return import.meta.env.PROD
      ? 'The EduAssess service is temporarily unreachable. Check your internet connection and try again.'
      : `Cannot connect to the backend at ${API_ORIGIN}. Start the backend and verify its MongoDB connection.`;
  }

  return fallback;
};

export default api;
