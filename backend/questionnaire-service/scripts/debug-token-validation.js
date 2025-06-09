/**
 * Debug script to analyze token validation issues in the questionnaire service
 * This will help diagnose why questionnaires are not loading properly
 */

// Load environment configuration
require('dotenv').config();
const jwt = require('jsonwebtoken');
const config = require('../src/config/config');
const tokenUtil = require('../src/utils/token.util');

// Mock token for testing - this simulates a user token
const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNjE2MTUyMzkyLCJleHAiOjIyNDcyMTkxOTJ9";

// Main diagnosis function
async function diagnoseTokenIssues() {
  console.log('======= Token Validation Diagnostics =======');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  // 1. Check JWT configuration
  console.log('\n1. JWT Configuration:');
  console.log('   JWT Secret:', maskSecret(config.jwt.secret));
  console.log('   JWT Expires In:', config.jwt.accessExpiresIn);
  
  // 2. Test token utilities
  console.log('\n2. Testing Token Utilities:');
  
  // Test decoding token with local decoder
  console.log('   Attempting to decode test token...');
  const decodedToken = tokenUtil.decodeToken(TEST_TOKEN);
  if (decodedToken) {
    console.log('   ✅ Token decoded successfully');
    console.log('   Token payload:', {
      id: decodedToken.id,
      email: decodedToken.email,
      role: decodedToken.role,
      exp: decodedToken.exp ? new Date(decodedToken.exp * 1000).toISOString() : 'undefined'
    });
  } else {
    console.error('   ❌ Failed to decode token');
  }
  
  // Test token verification
  console.log('\n   Verifying token signature...');
  try {
    const { valid, decoded, error } = tokenUtil.verifyToken(TEST_TOKEN);
    if (valid) {
      console.log('   ✅ Token signature verified successfully');
    } else {
      console.error('   ❌ Token signature verification failed:', error);
      
      // If verification failed, try with default key
      console.log('\n   Attempting verification with standard key...');
      try {
        const standardResult = jwt.verify(
          TEST_TOKEN, 
          'shared-security-risk-assessment-secret-key'
        );
        console.log('   ✅ Token verified with standard key:', standardResult.id);
      } catch (err) {
        console.error('   ❌ Standard key verification also failed:', err.message);
      }
    }
  } catch (error) {
    console.error('   ❌ Token verification threw an exception:', error.message);
  }
  
  // 3. Check expiration
  console.log('\n3. Checking Token Expiration:');
  const isExpired = tokenUtil.isTokenExpired(TEST_TOKEN);
  console.log('   Is token expired?', isExpired ? '❌ Yes' : '✅ No');
  
  if (!isExpired) {
    const remainingTime = tokenUtil.getTokenRemainingTime(TEST_TOKEN);
    console.log('   Remaining time:', formatDuration(remainingTime));
  }
  
  // 4. Check for auth service connectivity
  console.log('\n4. Auth Service Configuration:');
  console.log('   Auth Service URL:', config.authService ? config.authService.url : 'Not configured');
  
  // 5. Check environment variables
  console.log('\n5. Environment Variables:');
  console.log('   BYPASS_AUTH:', process.env.BYPASS_AUTH || 'Not set');
  console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '(Set)' : 'Not set');

  // 6. Check auth middleware bypass settings
  console.log('\n6. Auth Middleware Settings:');
  console.log('   bypassAuth Config:', config.bypassAuth === true ? 'Enabled' : 'Disabled');
  
  console.log('\n====== End of Diagnostics ======');
}

// Helper function to mask secrets
function maskSecret(secret) {
  if (!secret) return 'Not provided';
  return secret.substring(0, 3) + '...' + secret.substring(secret.length - 3);
}

// Helper to format duration in seconds
function formatDuration(seconds) {
  if (seconds <= 0) return '0 seconds';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`);
  
  return parts.join(', ');
}

// Run the diagnosis
diagnoseTokenIssues()
  .then(() => {
    console.log('Diagnostic complete.');
  })
  .catch((error) => {
    console.error('Diagnostic failed:', error);
  });
