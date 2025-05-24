export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  DATA: '/data',
  CALCULATE: '/calculate',
  HEALTH: '/',
  PRODUCTS: '/products',
  REGIONS: '/regions'
};
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please fill in all required fields.',
  NO_DATA: 'No data found for the selected combination.',
  GENERIC_ERROR: 'An unexpected error occurred.'
};
