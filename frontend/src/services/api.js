import axios from 'axios';

// Dynamically determine API base URL based on how the app is accessed
const getApiBaseUrl = () => {
  // Get ngrok URL from environment variable
  const ngrokApiUrl = process.env.REACT_APP_NGROK_URL;
  
  // If accessed through ngrok (contains ngrok-free.app in hostname)
  if (window.location.hostname.includes('ngrok-free.app')) {
    // Use the ngrok backend URL from environment
    return ngrokApiUrl || 'http://localhost:3000/api';
  }
  
  // Check if we're in a Shopify context (has shop parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const shop = urlParams.get('shop');
  if (shop && shop !== 'test-shop.myshopify.com') {
    // If we have a real shop parameter, use ngrok for API calls
    return ngrokApiUrl || 'http://localhost:3000/api';
  }
  
  // For local development, use environment variable or default
  return process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Debug log to see which API URL is being used (development only)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('🌐 Current hostname:', window.location.hostname);
  console.log('🛍️ Shop parameter:', new URLSearchParams(window.location.search).get('shop'));
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Add shop parameter to all requests
apiClient.interceptors.request.use((config) => {
  const urlParams = new URLSearchParams(window.location.search);
  const shop = urlParams.get('shop');
  
  // In development mode, use a default shop if none provided
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shopParam = shop || (isDevelopment ? 'jaynorthcode.myshopify.com' : null);
  
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

  getAllProducts: async (limit = 100) => {
    const response = await apiClient.get('/discounts/products', {
      params: { limit }
    });
    return response.data;
  },

  searchProducts: async (query, limit = 50) => {
    const response = await apiClient.get('/discounts/search/products', {
      params: { query, limit }
    });
    return response.data;
  },

  getAllCollections: async (limit = 100) => {
    const response = await apiClient.get('/discounts/collections', {
      params: { limit }
    });
    return response.data;
  },

  searchCollections: async (query, limit = 50) => {
    const response = await apiClient.get('/discounts/search/collections', {
      params: { query, limit }
    });
    return response.data;
  },

  getAllVariants: async (limit = 100) => {
    const response = await apiClient.get('/discounts/variants', {
      params: { limit }
    });
    return response.data;
  },

  searchVariants: async (query, limit = 50) => {
    const response = await apiClient.get('/discounts/search/variants', {
      params: { query, limit }
    });
    return response.data;
  },

  getFilterMetadata: async () => {
    const response = await apiClient.get('/discounts/filters');
    return response.data;
  },
};

export default apiClient;