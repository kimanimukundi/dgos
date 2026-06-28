import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL
  ? `https://${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:3001/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('dgos_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dgos_token');
      localStorage.removeItem('dgos_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
