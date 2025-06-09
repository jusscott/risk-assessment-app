// Token debugging utility
export const tokenDebug = {
  /**
   * Log comprehensive token status
   */
  logTokenStatus: (context = 'unknown') => {
    const localStorageToken = localStorage.getItem('token');
    const localStorageRefreshToken = localStorage.getItem('refreshToken');
    const lastRefresh = localStorage.getItem('lastTokenRefresh');
    
    console.log('🔍 Token Debug [' + context + ']:', {
      timestamp: new Date().toISOString(),
      localStorage: {
        hasToken: !!localStorageToken,
        tokenLength: localStorageToken?.length || 0,
        hasRefreshToken: !!localStorageRefreshToken,
        lastRefresh: lastRefresh ? new Date(parseInt(lastRefresh)).toISOString() : 'never'
      },
      context
    });
    
    return {
      hasToken: !!localStorageToken,
      hasRefreshToken: !!localStorageRefreshToken
    };
  },
  
  /**
   * Force token sync between localStorage and auth-tokens state
   */
  forceTokenSync: async () => {
    console.log('🔄 Forcing token sync...');
    
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (token && refreshToken) {
      try {
        const authTokens = await import('./auth-tokens').then(module => module.default);
        authTokens.storeTokens(token, refreshToken);
        console.log('✅ Token sync completed');
        return true;
      } catch (error) {
        console.error('❌ Token sync failed:', error);
        return false;
      }
    } else {
      console.log('❌ No tokens available to sync');
      return false;
    }
  },
  
  /**
   * Validate token and attempt recovery if needed
   */
  validateAndRecoverToken: async () => {
    console.log('🔧 Validating and recovering token...');
    
    try {
      const authTokens = await import('./auth-tokens').then(module => module.default);
      
      // Check if token is available
      let token = authTokens.getAccessToken();
      
      if (!token) {
        console.log('🔄 No token in auth-tokens, checking localStorage...');
        const fallbackToken = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (fallbackToken && refreshToken) {
          authTokens.storeTokens(fallbackToken, refreshToken);
          token = authTokens.getAccessToken();
          console.log('✅ Token recovered from localStorage');
        } else {
          console.log('❌ No fallback tokens available');
          return false;
        }
      }
      
      // Ensure token is fresh
      const isFresh = await authTokens.ensureFreshToken();
      console.log('🔄 Token freshness check:', isFresh);
      
      return isFresh;
    } catch (error) {
      console.error('❌ Token validation and recovery failed:', error);
      return false;
    }
  }
};

export default tokenDebug;
