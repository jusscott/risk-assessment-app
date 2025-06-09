import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  id: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
  lastRefreshTime: number;
  lastValidationTime: number;
  refreshFailCount: number;
}

// In-memory storage for token state that persists across page refreshes
const tokenState: TokenStorage = {
  accessToken: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  lastRefreshTime: parseInt(localStorage.getItem('lastTokenRefresh') || '0', 10),
  lastValidationTime: 0,
  refreshFailCount: 0
};

// Token cache lifetime in milliseconds (5 minutes)
const TOKEN_CACHE_TTL = 5 * 60 * 1000;

/**
 * Get stored access token
 */
export const getAccessToken = (): string | null => {
  // Always check localStorage first in case another tab updated it
  const token = localStorage.getItem('token');
  
  // Enhanced logging for questionnaire debugging
  console.log('🔍 getAccessToken called:', {
    localStorageToken: token ? 'EXISTS' : 'null',
    tokenStateToken: tokenState.accessToken ? 'EXISTS' : 'null',
    tokensMatch: token === tokenState.accessToken,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack?.split('\n')[1]?.trim() || 'unknown'
  });
  
  if (token !== tokenState.accessToken) {
    console.log('🔄 Token mismatch detected, updating tokenState:', {
      had: tokenState.accessToken ? 'token' : 'null',
      now: token ? 'token' : 'null'
    });
    tokenState.accessToken = token;
  }
  
  return tokenState.accessToken;
};

/**
 * Get stored refresh token
 */
export const getRefreshToken = (): string | null => {
  // Always check localStorage first in case another tab updated it
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken !== tokenState.refreshToken) {
    tokenState.refreshToken = refreshToken;
  }
  return tokenState.refreshToken;
};

/**
 * Store tokens in both localStorage and memory
 */
export const storeTokens = (accessToken: string, refreshToken: string): void => {
  console.log('📝 storeTokens called:', {
    accessTokenLength: accessToken?.length || 0,
    refreshTokenLength: refreshToken?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem('token', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  
  // Also update in-memory state
  tokenState.accessToken = accessToken;
  tokenState.refreshToken = refreshToken;
  
  // Track refresh timestamp
  const now = Date.now();
  localStorage.setItem('lastTokenRefresh', now.toString());
  tokenState.lastRefreshTime = now;
  tokenState.refreshFailCount = 0;
  
  // Verify storage immediately
  const verifyToken = localStorage.getItem('token');
  console.log('✅ Token storage verification:', {
    stored: !!verifyToken,
    matches: verifyToken === accessToken,
    tokenStateUpdated: tokenState.accessToken === accessToken
  });
  
  console.log('Tokens updated and stored successfully');
};

/**
 * Clear all tokens from storage
 */
export const clearTokens = (): void => {
  console.log('🗑️ clearTokens called:', {
    hadTokens: {
      localStorage: !!localStorage.getItem('token'),
      tokenState: !!tokenState.accessToken
    },
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack?.split('\n').slice(1, 4).map(line => line.trim())
  });
  
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('lastTokenRefresh');
  
  // Clear in-memory state too
  tokenState.accessToken = null;
  tokenState.refreshToken = null;
  tokenState.lastRefreshTime = 0;
  
  console.log('Tokens cleared');
};

/**
 * Decode token without verification
 */
export const decodeToken = (token: string | null): DecodedToken | null => {
  if (!token) return null;
  
  try {
    // In jwt-decode v4.0.0, the second parameter for options is used differently
    // The header option means to decode the header part of the JWT instead of the payload
    // For our use case, we want the payload which is the default
    console.log('Decoding token...');
    const decoded = jwtDecode<DecodedToken>(token);
    console.log('Token decoded successfully');
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is expired or will expire soon
 * @param token JWT token
 * @param bufferSeconds Time buffer in seconds before actual expiry
 */
export const isTokenExpired = (token: string | null, bufferSeconds = 0): boolean => {
  if (!token) return true;
  
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    // JWT exp is in seconds, Date.now() is in milliseconds
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp <= currentTime + bufferSeconds;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Get the remaining lifetime of a token in seconds
 */
export const getTokenRemainingTime = (token: string | null): number => {
  if (!token) return 0;
  
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return 0;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - currentTime);
  } catch (error) {
    console.error('Error calculating token remaining time:', error);
    return 0;
  }
};

/**
 * Get user information from token
 */
export const getUserFromToken = (token: string | null): { id: string; email: string; role: string } | null => {
  if (!token) return null;
  
  try {
    const decoded = decodeToken(token);
    if (!decoded) return null;
    
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
};

/**
 * Check if a token refresh is needed
 * @param bufferSeconds Amount of time before expiration to trigger refresh
 */
export const isRefreshNeeded = (bufferSeconds = 300): boolean => {
  const accessToken = getAccessToken();
  
  // If no token or refresh token, a refresh won't help
  if (!accessToken || !getRefreshToken()) return false;
  
  // Check if token is expired or expiring soon
  return isTokenExpired(accessToken, bufferSeconds);
};

/**
 * Check if a token refresh should be attempted based on various factors
 * - Avoids refresh storms by respecting minimum interval
 * - Tracks and limits failed refresh attempts
 */
export const shouldAttemptRefresh = (): boolean => {
  const refreshToken = getRefreshToken();
  
  // No refresh token, can't attempt refresh
  if (!refreshToken) return false;
  
  // Token has been refreshed recently, avoid refresh storm
  const now = Date.now();
  const minRefreshInterval = 5000; // 5 seconds between refresh attempts
  
  if (now - tokenState.lastRefreshTime < minRefreshInterval) {
    console.log('Token refresh attempted too soon after previous refresh');
    return false;
  }
  
  // Too many consecutive failures, back off
  const maxConsecutiveFailures = 3;
  if (tokenState.refreshFailCount >= maxConsecutiveFailures) {
    console.warn(`Too many refresh failures (${tokenState.refreshFailCount}), waiting longer before retry`);
    
    // Exponential backoff for repeated failures
    const backoff = Math.pow(2, tokenState.refreshFailCount) * 5000;
    if (now - tokenState.lastRefreshTime < backoff) {
      return false;
    }
  }
  
  return true;
};

/**
 * Track refresh failure to implement backoff
 */
export const trackRefreshFailure = (): void => {
  tokenState.refreshFailCount++;
  console.warn(`Token refresh attempt failed. Failure count: ${tokenState.refreshFailCount}`);
};

/**
 * Reset refresh failure counter
 */
export const resetRefreshFailures = (): void => {
  if (tokenState.refreshFailCount > 0) {
    tokenState.refreshFailCount = 0;
    console.log('Reset token refresh failure counter');
  }
};

/**
 * Get time since last successful refresh in milliseconds
 */
export const getTimeSinceLastRefresh = (): number => {
  return Date.now() - tokenState.lastRefreshTime;
};

/**
 * Check if user is currently authenticated
 * @param validateExpiry Whether to check if the token is expired
 */
export const isAuthenticated = (validateExpiry = true): boolean => {
  const token = getAccessToken();
  
  if (!token) return false;
  
  if (validateExpiry) {
    return !isTokenExpired(token);
  }
  
  return true;
};

/**
 * Check if the current user has a specific role
 */
export const hasRole = (role: string): boolean => {
  const token = getAccessToken();
  if (!token) return false;
  
  const user = getUserFromToken(token);
  if (!user) return false;
  
  return user.role === role;
};

/**
 * Check if refresh token is valid and not expired
 */
export const isRefreshTokenValid = (): boolean => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  
  return !isTokenExpired(refreshToken);
};

/**
 * Ensures a token is fresh before proceeding with an operation
 * Attempts to refresh the token if necessary
 * @returns Promise resolving to true if token is valid, false if not
 */
export const ensureFreshToken = async (): Promise<boolean> => {
  // If no token at all, we can't help
  const accessToken = getAccessToken();
  if (!accessToken) {
    console.log('No access token available');
    return false;
  }

  // Check if token needs refresh (5 min buffer)
  if (!isTokenExpired(accessToken, 300)) {
    // Token is still valid
    return true;
  }
  
  // Token needs refresh, check if refresh token is available and valid
  const refreshToken = getRefreshToken();
  if (!refreshToken || isTokenExpired(refreshToken)) {
    console.log('No valid refresh token available');
    return false;
  }
  
  // Don't attempt refresh if we're in a backoff period
  if (!shouldAttemptRefresh()) {
    console.log('Refresh attempt throttled, using current token');
    return !isTokenExpired(accessToken);
  }
  
  try {
    // Import API to avoid circular dependency
    const { default: api } = await import('../services/api');
    
    // Perform token refresh
    console.log('Refreshing token...');
    const response = await api.post<{
      tokens: { accessToken: string; refreshToken: string }
    }>('/auth/refresh-token', { refreshToken });
    
    if (response.success && response.data?.tokens) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;
      
      // Store the new tokens
      storeTokens(accessToken, newRefreshToken);
      resetRefreshFailures();
      
      console.log('Token refreshed successfully');
      return true;
    } else {
      console.error('Token refresh failed: Unexpected response format');
      trackRefreshFailure();
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    trackRefreshFailure();
    
    // Check if current token is completely expired or still usable
    return !isTokenExpired(accessToken);
  }
};

// Create named export object to satisfy ESLint
const authTokenExports = {
  getAccessToken,
  getRefreshToken,
  storeTokens,
  clearTokens,
  decodeToken,
  isTokenExpired,
  getTokenRemainingTime,
  getUserFromToken,
  isRefreshNeeded,
  shouldAttemptRefresh,
  trackRefreshFailure,
  resetRefreshFailures,
  getTimeSinceLastRefresh,
  isAuthenticated,
  hasRole,
  isRefreshTokenValid,
  ensureFreshToken
};

export default authTokenExports;
