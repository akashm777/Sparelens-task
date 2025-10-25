import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const datasetAPI = {
  upload: async (file, name, description) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post('/datasets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/datasets');
    return response.data;
  },

  getStats: async (datasetId) => {
    const response = await api.get(`/datasets/${datasetId}/stats`);
    return response.data;
  },

  getData: async (datasetId, query) => {
    const response = await api.post(`/datasets/${datasetId}/data`, query);
    return response.data;
  },

  generateChart: async (datasetId, config) => {
    const response = await api.post(`/datasets/${datasetId}/chart`, config);
    return response.data;
  },

  getInsights: async (datasetId) => {
    const response = await api.get(`/datasets/${datasetId}/insights`);
    return response.data;
  },

  delete: async (datasetId) => {
    await api.delete(`/datasets/${datasetId}`);
  },
};

export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;