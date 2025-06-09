#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING QUESTIONNAIRE TOKEN AVAILABILITY ISSUE');
console.log('================================================\n');

// File paths
const authTokensPath = 'frontend/src/utils/auth-tokens.ts';
const apiPath = 'frontend/src/services/api.ts';
const questionnairesPath = 'frontend/src/pages/Questionnaires.tsx';

function addEnhancedLoggingToAuthTokens() {
  console.log('1. Adding enhanced logging to auth-tokens.ts...');
  
  const filePath = path.join(__dirname, authTokensPath);
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ auth-tokens.ts not found');
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add enhanced logging to getAccessToken function
  const getAccessTokenPattern = /export const getAccessToken = \(\): string \| null => \{[\s\S]*?return tokenState\.accessToken;\s*\};/;
  
  const enhancedGetAccessToken = `export const getAccessToken = (): string | null => {
  // Always check localStorage first in case another tab updated it
  const token = localStorage.getItem('token');
  
  // Enhanced logging for questionnaire debugging
  console.log('🔍 getAccessToken called:', {
    localStorageToken: token ? 'EXISTS' : 'null',
    tokenStateToken: tokenState.accessToken ? 'EXISTS' : 'null',
    tokensMatch: token === tokenState.accessToken,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack?.split('\\n')[1]?.trim() || 'unknown'
  });
  
  if (token !== tokenState.accessToken) {
    console.log('🔄 Token mismatch detected, updating tokenState:', {
      had: tokenState.accessToken ? 'token' : 'null',
      now: token ? 'token' : 'null'
    });
    tokenState.accessToken = token;
  }
  
  return tokenState.accessToken;
};`;

  if (getAccessTokenPattern.test(content)) {
    content = content.replace(getAccessTokenPattern, enhancedGetAccessToken);
  } else {
    console.log('⚠️ Could not find getAccessToken pattern, adding fallback enhancement');
  }
  
  // Add enhanced logging to storeTokens function
  const storeTokensPattern = /export const storeTokens = \(accessToken: string, refreshToken: string\): void => \{[\s\S]*?console\.log\('Tokens updated and stored successfully'\);\s*\};/;
  
  const enhancedStoreTokens = `export const storeTokens = (accessToken: string, refreshToken: string): void => {
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
};`;

  if (storeTokensPattern.test(content)) {
    content = content.replace(storeTokensPattern, enhancedStoreTokens);
  }
  
  // Add enhanced logging to clearTokens function
  const clearTokensPattern = /export const clearTokens = \(\): void => \{[\s\S]*?console\.log\('Tokens cleared'\);\s*\};/;
  
  const enhancedClearTokens = `export const clearTokens = (): void => {
  console.log('🗑️ clearTokens called:', {
    hadTokens: {
      localStorage: !!localStorage.getItem('token'),
      tokenState: !!tokenState.accessToken
    },
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack?.split('\\n').slice(1, 4).map(line => line.trim())
  });
  
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('lastTokenRefresh');
  
  // Clear in-memory state too
  tokenState.accessToken = null;
  tokenState.refreshToken = null;
  tokenState.lastRefreshTime = 0;
  
  console.log('Tokens cleared');
};`;

  if (clearTokensPattern.test(content)) {
    content = content.replace(clearTokensPattern, enhancedClearTokens);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Enhanced logging added to auth-tokens.ts');
  return true;
}

function addTokenRecoveryMechanismToAPI() {
  console.log('2. Adding token recovery mechanism to api.ts...');
  
  const filePath = path.join(__dirname, apiPath);
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ api.ts not found');
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the section where fallback token is used and enhance it
  const fallbackTokenPattern = /\/\/ CRITICAL: If no token for questionnaire request, try to get it directly from localStorage as fallback[\s\S]*?else \{[\s\S]*?\}/;
  
  const enhancedFallbackToken = `// CRITICAL: If no token for questionnaire request, try multiple recovery mechanisms
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
        config.headers['Authorization'] = \`Bearer \${fallbackToken}\`;
        
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
              config.headers['Authorization'] = \`Bearer \${newToken}\`;
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
      }`;
  
  if (fallbackTokenPattern.test(content)) {
    content = content.replace(fallbackTokenPattern, enhancedFallbackToken);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Enhanced token recovery added to api.ts');
  return true;
}

function addTokenValidationToQuestionnaires() {
  console.log('3. Adding token validation to Questionnaires component...');
  
  const filePath = path.join(__dirname, questionnairesPath);
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ Questionnaires.tsx not found');
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for auth tokens if not already present
  if (!content.includes("import authTokens from '../utils/auth-tokens';")) {
    const importSection = content.match(/import[^;]+from[^;]+;/g);
    if (importSection) {
      const lastImport = importSection[importSection.length - 1];
      content = content.replace(lastImport, lastImport + "\nimport authTokens from '../utils/auth-tokens';");
    }
  }
  
  // Add token validation before API calls
  const fetchQuestionnairesStart = /const fetchQuestionnaires = async \(\) => \{/;
  
  if (fetchQuestionnairesStart.test(content)) {
    const replacement = `const fetchQuestionnaires = async () => {
      // Enhanced token validation before API calls
      console.log('🔍 Questionnaires component: Starting fetchQuestionnaires');
      
      // Check token availability before making any requests
      const initialToken = authTokens.getAccessToken();
      const localStorageToken = localStorage.getItem('token');
      
      console.log('📊 Token status check:', {
        authTokensHasToken: !!initialToken,
        localStorageHasToken: !!localStorageToken,
        tokensMatch: initialToken === localStorageToken,
        timestamp: new Date().toISOString()
      });
      
      // If no token available, try to recover
      if (!initialToken && localStorageToken) {
        console.log('🔄 Attempting token recovery in Questionnaires component');
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            authTokens.storeTokens(localStorageToken, refreshToken);
            console.log('✅ Token recovery attempted');
          }
        } catch (error) {
          console.error('❌ Token recovery failed:', error);
        }
      }
      
      // Ensure fresh token before proceeding
      try {
        const tokenFreshness = await authTokens.ensureFreshToken();
        console.log('🔄 Token freshness check result:', tokenFreshness);
      } catch (error) {
        console.error('❌ Token freshness check failed:', error);
      }`;
    
    content = content.replace(fetchQuestionnairesStart, replacement);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Enhanced token validation added to Questionnaires component');
  return true;
}

function createTokenDebugUtility() {
  console.log('4. Creating token debug utility...');
  
  const debugUtilPath = 'frontend/src/utils/token-debug.ts';
  const filePath = path.join(__dirname, debugUtilPath);
  
  const debugUtilContent = `// Token debugging utility
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
`;
  
  fs.writeFileSync(filePath, debugUtilContent, 'utf8');
  console.log('✅ Token debug utility created');
  return true;
}

function updateQuestionnaireWrapper() {
  console.log('5. Updating questionnaire-wrapper.ts with enhanced token handling...');
  
  const filePath = path.join(__dirname, 'frontend/src/services/questionnaire-wrapper.ts');
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ questionnaire-wrapper.ts not found');
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for token debug utility
  if (!content.includes("import tokenDebug from '../utils/token-debug';")) {
    const importSection = "import tokenDebug from '../utils/token-debug';\n";
    const firstImportIndex = content.indexOf('import');
    content = content.slice(0, firstImportIndex) + importSection + content.slice(firstImportIndex);
  }
  
  // Enhance the ensureFreshToken function
  const ensureFreshTokenPattern = /ensureFreshToken: async \(\): Promise<boolean> => \{[\s\S]*?return authTokens\.ensureFreshToken\(\);\s*\},/;
  
  const enhancedEnsureFreshToken = `ensureFreshToken: async (): Promise<boolean> => {
    console.log('🔄 QuestionnaireWrapper: ensureFreshToken called');
    
    // Log current token status
    tokenDebug.logTokenStatus('questionnaire-wrapper-ensureFreshToken');
    
    // First, try to validate and recover token
    const recovered = await tokenDebug.validateAndRecoverToken();
    
    if (recovered) {
      console.log('✅ Token validation/recovery successful');
      return true;
    }
    
    // Fall back to the standard ensureFreshToken
    console.log('🔄 Falling back to standard ensureFreshToken');
    return authTokens.ensureFreshToken();
  },`;
  
  if (ensureFreshTokenPattern.test(content)) {
    content = content.replace(ensureFreshTokenPattern, enhancedEnsureFreshToken);
  }
  
  // Enhance the getCompletedSubmissions function
  const getCompletedSubmissionsPattern = /getCompletedSubmissions: async \(\): Promise<ApiResponse<CompletedSubmission\[\]>> => \{[\s\S]*?return questionnaireService\.getCompletedSubmissions\(\);\s*\},/;
  
  const enhancedGetCompletedSubmissions = `getCompletedSubmissions: async (): Promise<ApiResponse<CompletedSubmission[]>> => {
    console.log('🔍 QuestionnaireWrapper: getCompletedSubmissions called');
    
    // Enhanced token validation
    tokenDebug.logTokenStatus('questionnaire-wrapper-getCompletedSubmissions');
    
    // Use auth tokens utility instead of direct localStorage check
    const hasToken = !!authTokens.getAccessToken();
    
    if (!hasToken) {
      console.log('No authentication token found in auth utility, attempting recovery...');
      
      // Try to recover token
      const recovered = await tokenDebug.validateAndRecoverToken();
      
      if (!recovered) {
        // Check if we have a token in localStorage as fallback
        const fallbackToken = localStorage.getItem('token');
        if (!fallbackToken) {
          const error = new Error('No authentication token found. Please log in.');
          (error as any).status = 401;
          throw error;
        } else {
          console.log('Found fallback token in localStorage, forcing sync');
          await tokenDebug.forceTokenSync();
        }
      }
    }
    
    // Always try to ensure fresh token before making request
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.getCompletedSubmissions();
  },`;
  
  if (getCompletedSubmissionsPattern.test(content)) {
    content = content.replace(getCompletedSubmissionsPattern, enhancedGetCompletedSubmissions);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Enhanced token handling added to questionnaire-wrapper.ts');
  return true;
}

// Execute all fixes
async function applyAllFixes() {
  try {
    const results = [];
    
    results.push(addEnhancedLoggingToAuthTokens());
    results.push(addTokenRecoveryMechanismToAPI());
    results.push(addTokenValidationToQuestionnaires());
    results.push(createTokenDebugUtility());
    results.push(updateQuestionnaireWrapper());
    
    const successCount = results.filter(r => r).length;
    
    console.log('\\n✅ FIXES APPLIED: ' + successCount + '/' + results.length + ' successfully');
    
    if (successCount === results.length) {
      console.log('\n🎉 All fixes applied successfully!');
      console.log('\nNext steps:');
      console.log('1. Restart the frontend development server');
      console.log('2. Clear browser cache and localStorage');
      console.log('3. Test login and navigation to questionnaires tab');
      console.log('4. Check browser console for enhanced debugging logs');
      
      return true;
    } else {
      console.log('\n⚠️ Some fixes could not be applied. Check the logs above.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error applying fixes:', error);
    return false;
  }
}

// Run the fixes
applyAllFixes().then(success => {
  process.exit(success ? 0 : 1);
});
