import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { authEvents } from './auth-events';
import authTokens from '../utils/auth-tokens';
import { activityTracker } from './activity-tracker';

// Base API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding token to requests
// Add session validation interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Check if session is still valid before making request
    if (activityTracker.checkSessionTimeout()) {
      console.log('API request blocked - session expired');
      return Promise.reject({
        status: 401,
        message: 'Session expired',
        data: { sessionExpired: true }
      });
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Original request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // ENHANCED: Use our auth tokens utility to get the token with extra debugging
    const token = authTokens.getAccessToken();
    
    // DEBUG: Always log token retrieval for questionnaire requests
    if (config.url?.includes('/questionnaires')) {
      console.log('🔍 Questionnaire Request Debug:', {
        url: config.url,
        method: config.method,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
        localStorageToken: localStorage.getItem('token') ? 'EXISTS' : 'MISSING',
        localStorageTokenMatch: token === localStorage.getItem('token')
      });
    }
    
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
      
      // ENHANCED: Verify the header was set for questionnaire requests
      if (config.url?.includes('/questionnaires')) {
        console.log('✅ Authorization header set for questionnaire request:', 
          config.headers['Authorization'] ? 'YES' : 'NO');
      }
    } else if (config.url?.includes('/questionnaires')) {
      // CRITICAL: If no token for questionnaire request, try multiple recovery mechanisms
      const fallbackToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      console.log('🚨 Token recovery attempt for questionnaire request:', {
        authTokensResult: !!token,
        localStorageToken: !!fallbackToken,
        hasRefreshToken: !!refreshToken,
        url: config.url,
        tokensMatch: token === fallbackToken
      });
      
      if (fallbackToken && config.headers) {
        console.warn('⚠️ Using fallback token from localStorage for questionnaire request');
        config.headers['Authorization'] = `Bearer ${fallbackToken}`;
        
        // Try to sync the auth-tokens state with localStorage
        try {
          // Force update the tokenState
          const authTokensModule = await import('../utils/auth-tokens');
          authTokensModule.default.storeTokens(fallbackToken, refreshToken || '');
          console.log('🔄 Attempted to sync auth-tokens state with localStorage');
        } catch (syncError) {
          console.warn('⚠️ Could not sync auth-tokens state:', syncError);
        }
      } else if (refreshToken && config.headers) {
        console.warn('🔄 Attempting token refresh for questionnaire request');
        // Try to refresh the token before making the request
        try {
          const authTokensModule = await import('../utils/auth-tokens');
          const refreshSuccess = await authTokensModule.default.ensureFreshToken();
          
          if (refreshSuccess) {
            const newToken = authTokensModule.default.getAccessToken();
            if (newToken && config.headers) {
              config.headers['Authorization'] = `Bearer ${newToken}`;
              console.log('✅ Token refreshed successfully for questionnaire request');
            }
          }
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
        }
      } else {
        console.error('❌ No token available for questionnaire request:', {
          authTokensToken: !!token,
          localStorageToken: !!fallbackToken,
          hasRefreshToken: !!refreshToken,
          url: config.url
        });
      }
    }
    
    if (token && config.headers) {
      // This was already done above, but keeping for non-questionnaire requests
      if (!config.url?.includes('/questionnaires')) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Add request ID for tracing across services
      config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Add client info for debugging
      config.headers['X-Client-Info'] = navigator.userAgent.substring(0, 100);
      
      // Add last activity timestamp for session inactivity tracking
      config.headers['X-Last-Activity'] = activityTracker.getLastActivity().toString();
      
      // Check if token needs refresh soon and notify (but don't block the request)
      if (authTokens.isTokenExpired(token, 300)) { // 5 minutes buffer
        console.warn('Token will expire soon - a refresh will be needed');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple concurrent token refresh attempts
let isRefreshing = false;
// Queue of requests to retry after token refresh
let refreshQueue: Array<(token: string) => void> = [];
// Last token refresh timestamp to prevent refresh storms
let lastTokenRefresh = 0;
// Minimal interval between token refreshes (ms)
const MIN_REFRESH_INTERVAL = 5000;

// Function to process the queue with a new token
const processRefreshQueue = (token: string): void => {
  refreshQueue.forEach(callback => callback(token));
  refreshQueue = [];
};

// Store failed requests to retry after successful service recovery
const serviceRecoveryQueue: Record<string, Array<() => void>> = {
  'questionnaire': [],
  'payment': [],
  'report': [],
  'auth': []
};

// Function to retry requests for a specific service after recovery
const retryServiceRequests = (serviceName: string): void => {
  if (serviceRecoveryQueue[serviceName] && serviceRecoveryQueue[serviceName].length > 0) {
    console.log(`Service ${serviceName} recovered. Retrying ${serviceRecoveryQueue[serviceName].length} queued requests`);
    serviceRecoveryQueue[serviceName].forEach(retryFn => setTimeout(retryFn, 500));
    serviceRecoveryQueue[serviceName] = [];
  }
};

// Singleton token refresh promise to ensure we only have one refresh in flight
let refreshTokenPromise: Promise<any> | null = null;

// Handle user logout by triggering event instead of direct store import
const handleLogout = () => {
  console.log('API service triggering logout');
  
  // Clear tokens using our utility
  authTokens.clearTokens();
  
  // Clear activity tracker
  activityTracker.cleanup();
  
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Trigger logout event - any subscribers will be notified
  authEvents.triggerLogout();
  
  // Force navigation to login
  setTimeout(() => {
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }, 100);
};

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => {
    // For successful responses to service endpoints, mark service as recovered
    const url = response.config.url || '';
    if (url.includes('/questionnaires') || url.includes('/submissions')) {
      retryServiceRequests('questionnaire');
    } else if (url.includes('/payment')) {
      retryServiceRequests('payment');  
    } else if (url.includes('/reports')) {
      retryServiceRequests('report');
    } else if (url.includes('/auth')) {
      retryServiceRequests('auth');
    }
    
    // Log successful responses for debugging jwt-decode issues
    if (url.includes('/questionnaires') || url.includes('/submissions')) {
      console.log('Successful questionnaire request:', url);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const { response, config } = error;
    
    // Handle network errors (server unreachable)
    if (!response) {
      console.error('Network Error:', error.message);
      
      // Try to identify which service is down based on the URL
      const url = config?.url || '';
      let serviceName = 'unknown';
      
      if (url.includes('/questionnaires') || url.includes('/submissions')) {
        serviceName = 'questionnaire';
      } else if (url.includes('/payment')) {
        serviceName = 'payment';  
      } else if (url.includes('/reports')) {
        serviceName = 'report';
      } else if (url.includes('/auth')) {
        serviceName = 'auth';
      }
      
      // If we have a config, we can retry this request later
      if (config && serviceName !== 'unknown') {
        return new Promise((resolve, reject) => {
          // Store this request to retry when service recovers
          serviceRecoveryQueue[serviceName].push(() => {
            apiClient(config).then(resolve).catch(reject);
          });
          
          // But also reject now to not keep the UI waiting
          reject({
            status: 0,
            message: `Unable to connect to the ${serviceName} service. The request will automatically retry when the service is available.`,
            data: { originalError: error.message, serviceName }
          });
        });
      }
      
      return Promise.reject({
        status: 0,
        message: 'Unable to connect to the server. Please check if the backend services are running.',
        data: { originalError: error.message }
      });
    }
    
    // Create a unique request identifier for logging and tracking
    const requestId = Math.random().toString(36).substring(7);
    const requestUrl = config?.url || 'unknown';
    
    // Handle unauthorized errors (401)
    if (response?.status === 401) {
      // Flag to identify questionnaire-related endpoints (which might have special handling)
      const isQuestionnaireEndpoint = config?.url?.includes('/questionnaires');
      
      console.log(`[${requestId}] 401 received for: ${requestUrl}`);
      
      // Skip if we're already trying to refresh the token or this is the refresh token endpoint
      if (config?.url?.includes('auth/refresh-token')) {
        console.log(`[${requestId}] Refresh token request failed, logging out...`);
        handleLogout();
        return Promise.reject({
          status: 401,
          message: 'Unable to refresh authentication. Please log in again.',
          data: response?.data || {}
        });
      }
      
      // If no config, we can't retry the request
      if (!config) {
        console.error(`[${requestId}] No request config available, cannot retry request`);
        return Promise.reject({
          status: 401,
          message: 'Authentication error',
          data: response?.data || {}
        });
      }
      
      // Store original request config for retry
      const originalRequest = { ...config };
      const refreshToken = authTokens.getRefreshToken();
      
      if (!refreshToken) {
        console.log(`[${requestId}] No refresh token available`);
        // Special handling for questionnaire endpoints
        if (isQuestionnaireEndpoint) {
          return Promise.reject({
            status: 401,
            message: 'Authentication required',
            data: response?.data || {},
            isQuestionnaireEndpoint: true
          });
        }
        handleLogout();
        return Promise.reject({
          status: 401,
          message: 'Authentication session expired. Please log in again.',
          data: response?.data || {}
        });
      }
      
      // Check if we should attempt a refresh based on our utility rules  
      if (!authTokens.shouldAttemptRefresh()) {
        console.log(`[${requestId}] Token refresh throttled, using latest token`);
        // Use the newest token without refreshing again
        const latestToken = authTokens.getAccessToken();
        if (latestToken) {
          // Create a new axios instance for the retry
          const retryRequest = axios.create();
          
          // Add the latest token to the request
          retryRequest.defaults.headers.common['Authorization'] = `Bearer ${latestToken}`;
          retryRequest.defaults.headers.common['X-Request-ID'] = `${requestId}-retry-latest`;
          
          return retryRequest(originalRequest);
        }
      }
            
      // If already refreshing, add request to queue
      if (isRefreshing) {
        console.log(`[${requestId}] Token refresh in progress, adding request to queue`);
        return new Promise<AxiosResponse>((resolve, reject) => {
          refreshQueue.push((newToken: string) => {
            try {
              // Preserve original request but update token
              const newConfig: AxiosRequestConfig = { ...originalRequest };
              
              // Create new Axios request with updated authorization
              const retryRequest = axios.create();
              
              console.log(`[${requestId}] Retrying queued request to: ${newConfig.url}`);
              
              // Add the new token to the request
              retryRequest.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              retryRequest.defaults.headers.common['X-Request-ID'] = `${requestId}-retry`;
              
              resolve(retryRequest(newConfig));
            } catch (error) {
              console.error(`[${requestId}] Error retrying queued request:`, error);
              reject(error);
            }
          });
        });
      }
      
      // Use the singleton token refresh promise pattern to ensure we only have one refresh in flight
      if (!refreshTokenPromise) {
        // Start token refresh process
        isRefreshing = true;
        console.log(`[${requestId}] Starting token refresh...`);
        
        // Create the refresh token promise
        refreshTokenPromise = axios.post(
          `${API_URL}/api/auth/refresh-token`, 
          { refreshToken },
          { 
            timeout: 15000,  // 15 second timeout
            headers: { 'X-Request-ID': `${requestId}-refresh` }
          }
        ).then(refreshResponse => {
          if (refreshResponse.data?.success && refreshResponse.data?.data?.tokens) {
            const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data.tokens;
            
            // Store tokens using our utility (handles both localStorage and memory state)
            authTokens.storeTokens(accessToken, newRefreshToken);
            
            // Track refresh success in our in-memory state
            authTokens.resetRefreshFailures();
            
            // Update timestamp of last successful refresh
            lastTokenRefresh = Date.now();
            
            // Process any queued requests
            processRefreshQueue(accessToken);
            
            return { success: true, accessToken };
          }
          return { success: false };
        }).catch(error => {
          console.error(`[${requestId}] Token refresh error:`, error);
          return { success: false, error };
        }).finally(() => {
          isRefreshing = false;
          refreshTokenPromise = null;
        });
      }
      
      try {
        // Wait for the refresh token promise to resolve
        const result = await refreshTokenPromise;
        
        if (result.success) {
          // Create config based on original request
          const newConfig: AxiosRequestConfig = { ...originalRequest };
          
          // Create new Axios instance for retrying the original request
          const retryRequest = axios.create();
          
          // Set auth header for the original request
          retryRequest.defaults.headers.common['Authorization'] = `Bearer ${result.accessToken}`;
          retryRequest.defaults.headers.common['X-Request-ID'] = `${requestId}-original-retry`;
          
          console.log(`[${requestId}] Retrying original request to: ${newConfig.url}`);
          // Retry the original request
          return retryRequest(newConfig);
        } else {
          console.log(`[${requestId}] Token refresh failed, server returned unsuccessful response`);
          refreshQueue = [];
          
          // Special handling for questionnaire endpoints
          if (isQuestionnaireEndpoint) {
            return Promise.reject({
              status: 401,
              message: 'Authentication required',
              data: response?.data || {},
              isQuestionnaireEndpoint: true,
              tokenRefreshFailed: true
            });
          }
          
          handleLogout();
          return Promise.reject({
            status: 401,
            message: 'Authentication session expired. Please log in again.',
            data: response?.data || {}
          });
        }
      } catch (refreshError) {
        console.error(`[${requestId}] Token refresh error:`, refreshError);
        refreshQueue = [];
        
        // Special handling for questionnaire endpoints even on error
        if (isQuestionnaireEndpoint) {
          return Promise.reject({
            status: 401,
            message: 'Authentication required',
            data: response?.data || {},
            isQuestionnaireEndpoint: true,
            tokenRefreshFailed: true
          });
        }
        
        handleLogout();
        return Promise.reject({
          status: 401,
          message: 'Authentication session expired. Please log in again.',
          data: response?.data || {}
        });
      }
    }
    
    // Handle other errors for questionnaire endpoints (including save progress)
    if ((config?.url?.includes('/questionnaires') || config?.url?.includes('/submissions')) && response?.status !== 401) {
      console.log(`Questionnaire endpoint returned ${response?.status} - passing through to component`);
      // Handle message extraction with proper type checking
      let errorMessage = 'Error processing questionnaire';
      
      if (response?.data && typeof response?.data === 'object') {
        // Check if data.message exists
        if ('message' in response.data && typeof response.data.message === 'string') {
          errorMessage = response.data.message;
        } 
        // Check for error.message pattern
        else if ('error' in response.data && 
                typeof response.data.error === 'object' && 
                response.data.error !== null &&
                'message' in response.data.error &&
                typeof response.data.error.message === 'string') {
          errorMessage = response.data.error.message;
        }
      }
      
      console.log(`Questionnaire error details:`, {
        status: response?.status,
        message: errorMessage,
        url: config?.url,
        method: config?.method
      });
      
      return Promise.reject({
        status: response?.status || 500,
        message: errorMessage,
        data: response?.data || {},
        isQuestionnaireEndpoint: true // Flag to help components identify this is from questionnaire service
      });
    }
    
    // Log error details for debugging
    console.error('API Error Response:', {
      status: response?.status,
      data: response?.data,
      headers: response?.headers,
      url: config?.url
    });
    
    // Create standardized error object
    const errorResponse = {
      status: response?.status || 500,
      message: (() => {
        if (response?.data && typeof response.data === 'object' && response.data !== null) {
          const data = response.data as Record<string, any>;
          
          console.log('Error data structure:', data);
          
          // Check for validation errors array
          if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
            return data.errors[0]?.msg || 'Validation error';
          }
          
          // Check for error object with message
          if (data.error && typeof data.error === 'object' && data.error.message) {
            return data.error.message;
          }
          
          // Check for direct message property
          if (data.message && typeof data.message === 'string') {
            return data.message;
          }
          
          // Check for success:false with error message pattern
          if (data.success === false && data.error?.message) {
            return data.error.message;
          }
          
          // Check for nested error messages
          if (data.error?.code) {
            return `Error ${data.error.code}: ${data.error.message || 'Unknown error'}`;
          }
        }
        
        // Default error message
        return 'An unexpected error occurred';
      })(),
      data: response?.data || {}
    };
    
    return Promise.reject(errorResponse);
  }
);

// Type for API response
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// Type for API error
export interface ApiError {
  status: number;
  message: string;
  data: any;
}

// Generic request method with proper typing
const request = async <T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse<ApiResponse<T>> = await apiClient(config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Export specific methods for cleaner usage
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    request<T>({ ...config, method: 'GET', url }),
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    request<T>({ ...config, method: 'POST', url, data }),
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    request<T>({ ...config, method: 'PUT', url, data }),
  
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    request<T>({ ...config, method: 'PATCH', url, data }),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    request<T>({ ...config, method: 'DELETE', url }),
};

// Export default for backward compatibility
export default api;
