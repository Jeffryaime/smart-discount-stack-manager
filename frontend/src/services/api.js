import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add shop parameter to all requests
apiClient.interceptors.request.use((config) => {
  const urlParams = new URLSearchParams(window.location.search);
  const shop = urlParams.get('shop');
  
  // In development mode, use a default shop if none provided
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shopParam = shop || (isDevelopment ? 'test-shop.myshopify.com' : null);
  
  if (shopParam) {
    config.params = {
      ...config.params,
      shop: shopParam,
    };
  }
  
  return config;
});

export const discountStacksApi = {
  getAll: async () => {
    const response = await apiClient.get('/discounts');
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/discounts/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/discounts', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/discounts/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/discounts/${id}`);
    return response.data;
  },

  test: async (id, testData) => {
    const response = await apiClient.post(`/discounts/${id}/test`, { testData });
    return response.data;
  },

  searchProducts: async (query, limit = 50) => {
    const response = await apiClient.get('/discounts/search/products', {
      params: { query, limit }
    });
    return response.data;
  },
};

export default apiClient;