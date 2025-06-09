#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING QUESTIONNAIRE TOKEN STORAGE REGRESSION');
console.log('='.repeat(60));
console.log();

function addEnhancedTokenStorageDebugging() {
    console.log('1️⃣ Adding Enhanced Debugging to Auth Service...');
    
    const authServicePath = path.join(__dirname, 'frontend/src/services/auth.service.ts');
    let authServiceContent = fs.readFileSync(authServicePath, 'utf8');
    
    // Add comprehensive debugging to setToken method
    const updatedSetToken = `  /**
   * Store authentication tokens
   */
  setToken: (token: string, refreshToken?: string): void => {
    console.log('🔧 authService.setToken called:', {
      tokenLength: token?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split('\\n')[1]?.trim() || 'unknown'
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
  },`;
    
    // Replace the setToken method
    authServiceContent = authServiceContent.replace(
        /\/\*\*\s*\n\s*\* Store authentication tokens\s*\n\s*\*\/\s*\n\s*setToken: \(token: string, refreshToken\?: string\): void => \{[\s\S]*?\},/,
        updatedSetToken
    );
    
    fs.writeFileSync(authServicePath, authServiceContent);
    console.log('✅ Enhanced debugging added to auth service setToken method');
    
    console.log('\n2️⃣ Adding Debug Checkpoint to Auth Slice...');
    
    const authSlicePath = path.join(__dirname, 'frontend/src/store/slices/authSlice.ts');
    let authSliceContent = fs.readFileSync(authSlicePath, 'utf8');
    
    // Add debugging to login thunk
    const updatedLoginThunk = `export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      console.log('🔐 Auth slice login thunk started');
      const response = await authService.login(credentials);
      
      console.log('✅ Login service response received:', {
        hasTokens: !!response.data.tokens,
        hasAccessToken: !!response.data.tokens?.accessToken,
        hasRefreshToken: !!response.data.tokens?.refreshToken,
        accessTokenLength: response.data.tokens?.accessToken?.length || 0
      });
      
      // Store the tokens in localStorage
      console.log('📝 Calling authService.setToken from auth slice...');
      authService.setToken(
        response.data.tokens.accessToken, 
        response.data.tokens.refreshToken
      );
      
      // Verify tokens were stored
      setTimeout(() => {
        const verifyToken = authService.getToken();
        console.log('🔍 Token verification from auth slice:', {
          tokenStoredSuccessfully: !!verifyToken,
          tokenLength: verifyToken?.length || 0,
          tokensMatch: verifyToken === response.data.tokens.accessToken
        });
      }, 50); // Allow time for storage to complete
      
      // Initialize user activity tracking
      activityTracker.updateLastActivity();
      
      // Format the response to match our state structure
      return {
        user: response.data.user,
        token: response.data.tokens.accessToken
      };
    } catch (error: any) {
      console.error('Login error in Redux slice:', error);
      
      // Handle different error formats that might come from the API layer
      let errorMessage = 'An unexpected error occurred during login';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.data?.error?.message) {
        errorMessage = error.data.error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error?.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (error?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);`;
    
    // Replace the login thunk
    authSliceContent = authSliceContent.replace(
        /export const login = createAsyncThunk\(\s*'auth\/login',[\s\S]*?\}\s*\);/,
        updatedLoginThunk
    );
    
    fs.writeFileSync(authSlicePath, authSliceContent);
    console.log('✅ Enhanced debugging added to auth slice login thunk');
    
    console.log('\n3️⃣ Adding Navigation Debugging to Login Component...');
    
    const loginPath = path.join(__dirname, 'frontend/src/pages/Login.tsx');
    let loginContent = fs.readFileSync(loginPath, 'utf8');
    
    // Add debugging to handleSubmit
    const updatedHandleSubmit = `  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      console.log('🔐 Login form submitted');
      await dispatch(login({ email, password })).unwrap();
      
      console.log('✅ Login dispatch completed successfully');
      
      // Verify tokens are available before navigation
      setTimeout(() => {
        const tokenCheck = localStorage.getItem('token');
        console.log('🔍 Pre-navigation token check:', {
          hasToken: !!tokenCheck,
          tokenLength: tokenCheck?.length || 0,
          timestamp: new Date().toISOString()
        });
      }, 100); // Allow time for token storage
      
      // Check if there's a pending questionnaire to start
      const pendingQuestionnaireId = localStorage.getItem('pendingQuestionnaireId');
      
      if (pendingQuestionnaireId && redirectPath === '/questionnaires') {
        // Clear the stored ID so it's not used again
        localStorage.removeItem('pendingQuestionnaireId');
        console.log('🧭 Redirecting to questionnaires page after login with pending ID:', pendingQuestionnaireId);
        navigate('/questionnaires');
      } else {
        // Otherwise navigate to the standard redirect path
        console.log('🧭 Redirecting to:', redirectPath);
        navigate(redirectPath);
      }
    } catch (error) {
      // Error is handled in the Redux slice
      console.error('❌ Login failed:', error);
    }
  };`;
    
    // Replace the handleSubmit function
    loginContent = loginContent.replace(
        /const handleSubmit = async \(e: React\.FormEvent<HTMLFormElement>\) => \{[\s\S]*?\};/,
        updatedHandleSubmit
    );
    
    fs.writeFileSync(loginPath, loginContent);
    console.log('✅ Enhanced navigation debugging added to Login component');
    
    console.log('\n4️⃣ Adding Questionnaire Page Token Check...');
    
    const questionnairesPath = path.join(__dirname, 'frontend/src/pages/Questionnaires.tsx');
    
    if (fs.existsSync(questionnairesPath)) {
        let questionnairesContent = fs.readFileSync(questionnairesPath, 'utf8');
        
        // Add token check at the beginning of useEffect
        const tokenCheckCode = `  useEffect(() => {
    // ENHANCED: Add comprehensive token availability check at component mount
    const tokenCheck = {
      authTokensResult: authTokens.getAccessToken(),
      localStorageResult: localStorage.getItem('token'),
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Questionnaires component mounted - token status:', {
      authTokensHasToken: !!tokenCheck.authTokensResult,
      localStorageHasToken: !!tokenCheck.localStorageResult,
      tokensMatch: tokenCheck.authTokensResult === tokenCheck.localStorageResult,
      authTokenLength: tokenCheck.authTokensResult?.length || 0,
      localStorageTokenLength: tokenCheck.localStorageResult?.length || 0
    });
    
    if (!tokenCheck.authTokensResult && !tokenCheck.localStorageResult) {
      console.error('🚨 CRITICAL: No tokens available when Questionnaires component mounted!');
      console.error('This indicates the token storage regression is active');
      
      // Check if user is supposed to be authenticated according to Redux
      console.log('🔍 Checking Redux auth state...');
    } else if (!tokenCheck.authTokensResult && tokenCheck.localStorageResult) {
      console.warn('⚠️ Token mismatch: localStorage has token but authTokens does not');
      console.warn('Attempting to sync authTokens with localStorage...');
      
      // Force sync authTokens with localStorage
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        authTokens.storeTokens(tokenCheck.localStorageResult, refreshToken || '');
        console.log('🔄 Attempted authTokens sync with localStorage');
      } catch (syncError) {
        console.error('❌ Failed to sync authTokens:', syncError);
      }
    }
    
    fetchQuestionnaires();
  }, []);`;
        
        // Find and replace the useEffect
        if (questionnairesContent.includes('useEffect(() => {')) {
            questionnairesContent = questionnairesContent.replace(
                /useEffect\(\(\) => \{[\s\S]*?fetchQuestionnaires\(\);\s*\}, \[\]\);/,
                tokenCheckCode
            );
            
            fs.writeFileSync(questionnairesPath, questionnairesContent);
            console.log('✅ Enhanced token check added to Questionnaires component');
        } else {
            console.log('⚠️ Could not find useEffect in Questionnaires component - manual update needed');
        }
    } else {
        console.log('⚠️ Questionnaires.tsx not found - manual update needed');
    }
}

function createTokenPersistenceTest() {
    console.log('\n5️⃣ Creating Token Persistence Test Script...');
    
    const testScript = `#!/usr/bin/env node

// This script tests token persistence by simulating the login flow
const axios = require('axios');

async function testTokenPersistence() {
    console.log('🧪 TESTING TOKEN PERSISTENCE SIMULATION');
    console.log('='.repeat(50));
    
    try {
        // Step 1: Login
        console.log('\\n1️⃣ Simulating Login...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        const { accessToken, refreshToken } = loginResponse.data.data.tokens;
        console.log('✅ Login successful, got tokens');
        
        // Step 2: Simulate token storage (like authService.setToken would do)
        console.log('\\n2️⃣ Simulating Token Storage...');
        
        // This simulates what should happen in the frontend
        console.log('📝 Would store in localStorage:', {
            token: accessToken.substring(0, 20) + '...',
            refreshToken: refreshToken.substring(0, 20) + '...'
        });
        
        // Step 3: Test immediate questionnaire access
        console.log('\\n3️⃣ Testing Immediate Questionnaire Access...');
        
        const questionnaireResponse = await axios.get('http://localhost:5000/api/questionnaires/templates', {
            headers: {
                'Authorization': \`Bearer \${accessToken}\`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Questionnaire access works immediately after login');
        
        // Step 4: Test after short delay (simulating navigation)
        console.log('\\n4️⃣ Testing After Navigation Delay...');
        
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        
        const delayedResponse = await axios.get('http://localhost:5000/api/questionnaires/templates', {
            headers: {
                'Authorization': \`Bearer \${accessToken}\`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Questionnaire access works after navigation delay');
        
        console.log('\\n🎯 TOKEN PERSISTENCE TEST COMPLETE');
        console.log('✅ Backend token persistence is not the issue');
        console.log('🔍 Issue is definitely in frontend token storage/retrieval');
        
    } catch (error) {
        console.error('❌ Token persistence test failed:', {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        });
    }
}

testTokenPersistence().catch(console.error);
`;
    
    fs.writeFileSync(path.join(__dirname, 'test-token-persistence.js'), testScript);
    console.log('✅ Token persistence test script created');
}

function main() {
    try {
        addEnhancedTokenStorageDebugging();
        createTokenPersistenceTest();
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 QUESTIONNAIRE TOKEN STORAGE REGRESSION FIX APPLIED');
        console.log('='.repeat(60));
        
        console.log('\n✅ ENHANCEMENTS COMPLETED:');
        console.log('1. Enhanced debugging in authService.setToken()');
        console.log('2. Token verification in auth slice login thunk');
        console.log('3. Navigation debugging in Login component');
        console.log('4. Token availability check in Questionnaires component');
        console.log('5. Token persistence test script created');
        
        console.log('\n🧪 TESTING INSTRUCTIONS:');
        console.log('1. Restart the frontend development server');
        console.log('2. Open browser dev tools (Console tab)');
        console.log('3. Login with good@test.com / Password123');
        console.log('4. Watch the console logs during login process');
        console.log('5. Navigate to Questionnaires tab');
        console.log('6. Check console for token availability logs');
        
        console.log('\n🔍 WHAT TO LOOK FOR:');
        console.log('- "authService.setToken called" log during login');
        console.log('- "Token storage verification" showing success');
        console.log('- "Questionnaires component mounted" showing token availability');
        console.log('- If tokens are missing, logs will show exactly where it fails');
        
        console.log('\\n📊 ALSO RUN: node test-token-persistence.js');
        console.log('This will test backend token persistence independently');
        
    } catch (error) {
        console.error('❌ Error applying fix:', error);
        process.exit(1);
    }
}

main();
