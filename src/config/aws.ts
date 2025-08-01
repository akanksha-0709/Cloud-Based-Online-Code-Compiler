// AWS Configuration
export const AWS_CONFIG = {
  // This will be updated by the deployment script
  API_ENDPOINT: import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001/api',
  REGION: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  
  // For development, you can override these
  IS_DEVELOPMENT: import.meta.env.DEV || false,
  LOCAL_API_URL: 'http://localhost:3001/api'
};

// Environment detection
export const getApiEndpoint = () => {
  if (AWS_CONFIG.IS_DEVELOPMENT) {
    return AWS_CONFIG.LOCAL_API_URL;
  }
  return AWS_CONFIG.API_ENDPOINT;
};
