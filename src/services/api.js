import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, ERROR_MESSAGES } from '../utils/constants';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data; // Return only the data part
  },
  (error) => {
    console.error('API Error:', error);
    
    let errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout. Please try again.';
    } else if (error.response) {
      // Handle HTTP errors
      if (error.response.status >= 500) {
        errorMessage = ERROR_MESSAGES.SERVER_ERROR;
      } else if (error.response.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
    }
    
    const enhancedError = new Error(errorMessage);
    enhancedError.response = error.response;
    return Promise.reject(enhancedError);
  }
);

export const apiService = {
  // Get initial data (lenders, products, regions)
  async getInitialData() {
    try {
      return await api.get(API_ENDPOINTS.DATA);
    } catch (error) {
      throw error;
    }
  },

  // Get products for a lender
  async getProductsForLender(lender) {
    try {
      const encodedLender = encodeURIComponent(lender);
      return await api.get(`${API_ENDPOINTS.PRODUCTS}/${encodedLender}/`);
    } catch (error) {
      throw error;
    }
  },

  // Get regions for a lender-product combination
  async getRegionsForProduct(lender, product) {
    try {
      const encodedLender = encodeURIComponent(lender);
      const encodedProduct = encodeURIComponent(product);
      return await api.get(`${API_ENDPOINTS.REGIONS}/${encodedLender}/${encodedProduct}/`);
    } catch (error) {
      throw error;
    }
  },

  // Calculate payin
  async calculatePayin(calculationData) {
    try {
      return await api.post(API_ENDPOINTS.CALCULATE, calculationData);
    } catch (error) {
      throw error;
    }
  },

  // Health check
  async healthCheck() {
    try {
      return await api.get(API_ENDPOINTS.HEALTH);
    } catch (error) {
      throw error;
    }
  }
};

export default api;