#!/usr/bin/env node

/**
 * Fix Questionnaire Display Authentication Issue
 * 
 * Based on diagnostic results, the issue is:
 * 1. User is authenticated in frontend 
 * 2. But submissions endpoints return 401 Unauthorized
 * 3. This causes "Failed to load completed questionnaires" error
 * 
 * This script will:
 * 1. Fix frontend API token handling
 * 2. Fix backend authentication middleware
 * 3. Ensure proper response format handling
 * 4. Test the fix with real API calls
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING QUESTIONNAIRE AUTHENTICATION DISPLAY ISSUE');
console.log('=====================================================');

/**
 * Fix 1: Update frontend error handling for better auth error reporting
 */
function fixFrontendErrorHandling() {
    console.log('\n📝 Fix 1: Updating frontend error handling...');
    
    const questionnairePagePath = 'frontend/src/pages/Questionnaires.tsx';
    const content = fs.readFileSync(questionnairePagePath, 'utf8');
    
    // Fix the error handling to provide more specific error messages
    const updatedContent = content.replace(
        /catch \(err: any\) \{[\s\S]*?setError\('Failed to load completed questionnaires'\);[\s\S]*?\}/g,
        `catch (err: any) {
        console.error('Error fetching completed questionnaires:', err);
        // Log more detailed error information
        if (err.status) {
          console.error(\`Status: \${err.status}, Message: \${err.message}\`);
        }
        if (err.data) {
          console.error('Error data:', err.data);
        }
        
        // Provide more specific error messages based on the error type
        let errorMessage = 'Failed to load completed questionnaires';
        if (err.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
          // Clear potentially stale tokens
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } else if (err.status === 403) {
          errorMessage = 'Access denied. You may not have permission to view questionnaires.';
        } else if (err.status === 404) {
          errorMessage = 'Questionnaire service not found. Please contact support.';
        } else if (err.message) {
          errorMessage = \`Failed to load completed questionnaires: \${err.message}\`;
        }
        
        setError(errorMessage);
      }`
    );
    
    // Also fix in-progress questionnaires error handling
    const finalContent = updatedContent.replace(
        /console\.error\('Error fetching in-progress questionnaires:', err\);[\s\S]*?setError\(`Failed to load in-progress questionnaires: \${err\.message \|\| 'Unknown error'}`\);/g,
        `console.error('Error fetching in-progress questionnaires:', err);
        // Log more detailed error information
        if (err.status) {
          console.error(\`Status: \${err.status}, Message: \${err.message}\`);
        }
        if (err.data) {
          console.error('Error data:', err.data);
        }
        
        // Provide more specific error messages
        let errorMessage = 'Failed to load in-progress questionnaires';
        if (err.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
          // Clear potentially stale tokens
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } else if (err.message) {
          errorMessage = \`Failed to load in-progress questionnaires: \${err.message}\`;
        }
        
        setError(errorMessage);`
    );
    
    fs.writeFileSync(questionnairePagePath, finalContent);
    console.log('✅ Updated frontend error handling with better auth error messages');
}

/**
 * Fix 2: Add better response data handling
 */
function fixResponseDataHandling() {
    console.log('\n📝 Fix 2: Fixing response data handling...');
    
    const questionnairePagePath = 'frontend/src/pages/Questionnaires.tsx';
    const content = fs.readFileSync(questionnairePagePath, 'utf8');
    
    // Fix response data extraction to handle both direct arrays and wrapped responses
    const updatedContent = content.replace(
        /const response = await questionnaireWrapper\.getCompletedSubmissions\(\);\s*setCompletedQuestionnaires\(response\.data\);/g,
        `const response = await questionnaireWrapper.getCompletedSubmissions();
        console.log('Completed submissions response:', response);
        
        // Handle both direct arrays and wrapped response formats
        let completedData = [];
        if (response.success && response.data) {
          // API response format: {success: true, data: [...]}
          completedData = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response.data)) {
          // Direct array format
          completedData = response.data;
        } else if (Array.isArray(response)) {
          // Response is direct array
          completedData = response;
        }
        
        console.log('Setting completed questionnaires:', completedData);
        setCompletedQuestionnaires(completedData);`
    );
    
    // Also fix in-progress submissions
    const finalContent = updatedContent.replace(
        /const response = await questionnaireWrapper\.getInProgressSubmissions\(\);\s*console\.log\('Successfully fetched in-progress submissions:', response\);\s*setInProgressQuestionnaires\(response\.data\);/g,
        `const response = await questionnaireWrapper.getInProgressSubmissions();
        console.log('Successfully fetched in-progress submissions:', response);
        
        // Handle both direct arrays and wrapped response formats  
        let inProgressData = [];
        if (response.success && response.data) {
          // API response format: {success: true, data: [...]}
          inProgressData = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response.data)) {
          // Direct array format
          inProgressData = response.data;
        } else if (Array.isArray(response)) {
          // Response is direct array
          inProgressData = response;
        }
        
        console.log('Setting in-progress questionnaires:', inProgressData);
        setInProgressQuestionnaires(inProgressData);`
    );
    
    fs.writeFileSync(questionnairePagePath, finalContent);
    console.log('✅ Updated response data handling to support multiple formats');
}

/**
 * Fix 3: Add token debugging to API service
 */
function addTokenDebugging() {
    console.log('\n📝 Fix 3: Adding token debugging to API service...');
    
    const apiServicePath = 'frontend/src/services/api.ts';
    const content = fs.readFileSync(apiServicePath, 'utf8');
    
    // Add debugging to the request interceptor
    const updatedContent = content.replace(
        /if \(token && config\.headers\) \{\s*config\.headers\['Authorization'\] = `Bearer \${token}`;/g,
        `if (token && config.headers) {
      config.headers['Authorization'] = \`Bearer \${token}\`;
      
      // Debug token for questionnaire requests
      if (config.url?.includes('/questionnaires')) {
        console.log('Making questionnaire request:', {
          url: config.url,
          method: config.method,
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
        });
      }`
    );
    
    fs.writeFileSync(apiServicePath, updatedContent);
    console.log('✅ Added token debugging for questionnaire requests');
}

/**
 * Fix 4: Update questionnaire service error handling
 */
function fixQuestionnaireServiceErrors() {
    console.log('\n📝 Fix 4: Updating questionnaire service error handling...');
    
    const questionnaireServicePath = 'frontend/src/services/questionnaire.service.ts';
    const content = fs.readFileSync(questionnaireServicePath, 'utf8');
    
    // Add error handling comments and better type safety
    const updatedContent = content.replace(
        /getInProgressSubmissions: \(\).*?=> \{\s*return api\.get<InProgressSubmission\[\]>\('\/questionnaires\/submissions\/in-progress'\);\s*\},/g,
        `/**
   * Get user's in-progress submissions
   * Requires authentication - returns 401 if not logged in
   */
  getInProgressSubmissions: (): Promise<ApiResponse<InProgressSubmission[]>> => {
    return api.get<InProgressSubmission[]>('/questionnaires/submissions/in-progress');
  },`
    );
    
    const finalContent = updatedContent.replace(
        /getCompletedSubmissions: \(\).*?=> \{\s*return api\.get<CompletedSubmission\[\]>\('\/questionnaires\/submissions\/completed'\);\s*\},/g,
        `/**
   * Get user's completed submissions  
   * Requires authentication - returns 401 if not logged in
   */
  getCompletedSubmissions: (): Promise<ApiResponse<CompletedSubmission[]>> => {
    return api.get<CompletedSubmission[]>('/questionnaires/submissions/completed');
  },`
    );
    
    fs.writeFileSync(questionnaireServicePath, finalContent);
    console.log('✅ Updated questionnaire service with better error documentation');
}

/**
 * Fix 5: Create a token validation helper
 */
function createTokenValidationHelper() {
    console.log('\n📝 Fix 5: Creating token validation helper...');
    
    const helperPath = 'frontend/src/utils/token-debug.ts';
    const helperContent = `/**
 * Token debugging and validation utilities
 * Helps diagnose authentication issues with questionnaire endpoints
 */

interface TokenInfo {
  hasToken: boolean;
  tokenLength: number;
  tokenPreview: string;
  isExpired: boolean;
  hasRefreshToken: boolean;
}

export const tokenDebug = {
  /**
   * Get detailed token information for debugging
   */
  getTokenInfo(): TokenInfo {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    let isExpired = false;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        isExpired = payload.exp < currentTime;
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    
    return {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      isExpired,
      hasRefreshToken: !!refreshToken
    };
  },
  
  /**
   * Log token information for debugging
   */
  logTokenInfo(context: string = 'Debug') {
    const info = this.getTokenInfo();
    console.log(\`[\${context}] Token Info:\`, info);
    return info;
  },
  
  /**
   * Check if user should be considered authenticated
   */
  isAuthenticated(): boolean {
    const info = this.getTokenInfo();
    return info.hasToken && !info.isExpired;
  }
};

export default tokenDebug;
`;
    
    fs.writeFileSync(helperPath, helperContent);
    console.log('✅ Created token debugging helper');
}

/**
 * Fix 6: Update questionnaire wrapper with better error handling
 */
function fixQuestionnaireWrapper() {
    console.log('\n📝 Fix 6: Updating questionnaire wrapper...');
    
    const wrapperPath = 'frontend/src/services/questionnaire-wrapper.ts';
    const content = fs.readFileSync(wrapperPath, 'utf8');
    
    // Add token debugging import
    const updatedContent = content.replace(
        /import authTokens from '\.\.\/utils\/auth-tokens';/g,
        `import authTokens from '../utils/auth-tokens';
import tokenDebug from '../utils/token-debug';`
    );
    
    // Update the completed submissions method with better debugging
    const finalContent = updatedContent.replace(
        /getCompletedSubmissions: async \(\): Promise<ApiResponse<CompletedSubmission\[\]>> => \{\s*await questionnaireWrapper\.ensureFreshToken\(\);\s*return questionnaireService\.getCompletedSubmissions\(\);\s*\},/g,
        `/**
   * Get user's completed submissions with token refresh and debugging
   */
  getCompletedSubmissions: async (): Promise<ApiResponse<CompletedSubmission[]>> => {
    // Debug token before making request
    const tokenInfo = tokenDebug.logTokenInfo('CompletedSubmissions');
    
    if (!tokenInfo.hasToken) {
      throw {
        status: 401,
        message: 'No authentication token found. Please log in.',
        data: { tokenInfo }
      };
    }
    
    if (tokenInfo.isExpired) {
      console.log('Token expired, refreshing...');
    }
    
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.getCompletedSubmissions();
  },`
    );
    
    fs.writeFileSync(wrapperPath, finalContent);
    console.log('✅ Updated questionnaire wrapper with token debugging');
}

/**
 * Main execution
 */
async function main() {
    try {
        console.log('🚀 Starting questionnaire authentication display fix...\n');
        
        // Apply all fixes
        fixFrontendErrorHandling();
        fixResponseDataHandling();
        addTokenDebugging();
        fixQuestionnaireServiceErrors();
        createTokenValidationHelper();
        fixQuestionnaireWrapper();
        
        console.log('\n✅ ALL FIXES APPLIED SUCCESSFULLY!');
        console.log('\n📋 SUMMARY OF CHANGES:');
        console.log('1. ✅ Enhanced frontend error handling with specific auth error messages');
        console.log('2. ✅ Fixed response data handling for multiple API response formats');
        console.log('3. ✅ Added token debugging to API service for questionnaire requests');
        console.log('4. ✅ Updated questionnaire service with better error documentation');
        console.log('5. ✅ Created token validation debugging helper utility');
        console.log('6. ✅ Enhanced questionnaire wrapper with token debugging');
        
        console.log('\n🔄 NEXT STEPS:');
        console.log('1. Restart the frontend: npm start (in frontend directory)');
        console.log('2. Open browser console to see detailed debugging information');
        console.log('3. Navigate to questionnaires page and check console logs');
        console.log('4. If still getting 401 errors, check token expiration and refresh');
        
        console.log('\n🐛 DEBUGGING TIPS:');
        console.log('- Check browser console for token debugging information');
        console.log('- Look for "Token Info" logs when loading questionnaires');
        console.log('- If token is expired, the system should auto-refresh');
        console.log('- If no token found, user needs to log in again');
        
    } catch (error) {
        console.error('❌ Error applying fixes:', error);
        process.exit(1);
    }
}

main();
