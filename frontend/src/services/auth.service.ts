import api, { ApiResponse } from './api';
import authTokens from '../utils/auth-tokens';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName: string;
  jobTitle?: string;
  phone?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'ADMIN' | 'USER' | 'VIEWER';
    organization?: {
      id: string;
      name: string;
      industry?: string;
      size?: string;
    };
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// Auth service functions
const authService = {
  /**
   * Login user with email and password
   */
  login: (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> => {
    return api.post<AuthResponse>('/auth/login', credentials);
  },

  /**
   * Register a new user
   */
  register: (userData: RegistrationData): Promise<ApiResponse<AuthResponse>> => {
    return api.post<AuthResponse>('/auth/register', userData);
  },

  /**
   * Logout the current user
   */
  logout: (): Promise<ApiResponse<void>> => {
    const refreshToken = authTokens.getRefreshToken();
    return api.post<void>('/auth/logout', { refreshToken });
  },

  /**
   * Get the current authenticated user
   */
  getCurrentUser: (): Promise<ApiResponse<AuthResponse['user']>> => {
    return api.get<AuthResponse['user']>('/auth/me');
  },

  /**
   * Request password reset
   */
  requestPasswordReset: (email: string): Promise<ApiResponse<{ message: string }>> => {
    return api.post<{ message: string }>('/auth/password-reset-request', { email });
  },

  /**
   * Reset password with token
   */
  resetPassword: (token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    return api.post<{ message: string }>('/auth/password-reset', {
      token,
      newPassword,
    });
  },

    /**
   * Store authentication tokens
   */
  setToken: (token: string, refreshToken?: string): void => {
    console.log('🔧 authService.setToken called:', {
      tokenLength: token?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split('\n')[1]?.trim() || 'unknown'
    });
    
    if (refreshToken) {
      console.log('📝 Calling authTokens.storeTokens with both tokens');
      authTokens.storeTokens(token, refreshToken);
    } else {
      // Fall back to only updating access token if refresh token not provided
      const currentRefreshToken = authTokens.getRefreshToken();
      console.log('📝 Calling authTokens.storeTokens with current refresh token:', {
        hasCurrentRefreshToken: !!currentRefreshToken
      });
      
      if (currentRefreshToken) {
        authTokens.storeTokens(token, currentRefreshToken);
      } else {
        // Edge case - we only have an access token
        console.log('⚠️ Edge case: storing only access token in localStorage');
        localStorage.setItem('token', token);
      }
    }
    
    // Verify storage immediately
    setTimeout(() => {
      const storedToken = authTokens.getAccessToken();
      const localStorageToken = localStorage.getItem('token');
      console.log('✅ Token storage verification (after setToken):', {
        authTokensReturns: !!storedToken,
        localStorageHas: !!localStorageToken,
        tokensMatch: storedToken === localStorageToken,
        originalTokenMatches: storedToken === token
      });
    }, 10); // Small delay to ensure async storage completes
  },

  /**
   * Remove authentication tokens
   */
  removeToken: (): void => {
    authTokens.clearTokens();
  },

  /**
   * Get authentication token
   */
  getToken: (): string | null => {
    return authTokens.getAccessToken();
  },

  /**
   * Get refresh token
   */
  getRefreshToken: (): string | null => {
    return authTokens.getRefreshToken();
  },

  /**
   * Check if user is authenticated (token exists and is valid)
   */
  isAuthenticated: (): boolean => {
    return authTokens.isAuthenticated();
  },
};

export default authService;
