# Real User Questionnaire Loading Fix

## Issue
The application was experiencing an issue where questionnaire templates would load correctly for test users but would fail with "failed to load questionnaire templates" error for real users (e.g., jusscott@gmail.com).

## Root Cause Analysis
After thorough investigation, we identified three main issues:

1. **User ID Type Inconsistency**: There was an inconsistent handling of user IDs between the auth service and questionnaire service. The auth service was returning user IDs as numbers in some cases, while the questionnaire service expected them as strings.

2. **Token Validation Differences**: The system was treating test tokens and real user tokens differently. Real user tokens may have had additional fields or different structures that weren't handled correctly.

3. **Error Handling Gaps**: Inadequate error handling in the token validation process was causing failures with real user tokens to be silent or uninformative.

## Fix Implemented

### 1. Enhanced Auth Middleware (optimized-auth.middleware.js)
- Added specific detection and logging for test tokens vs. real user tokens
- Normalized user IDs to strings to ensure consistent format between services
- Improved error handling and logging for token validation issues

```javascript
// Enhanced for real users - added debugging information
console.log(`[Authentication] Validating token for requestId: ${requestId}`);

try {
  // Check if token is a test token or real user token
  const isTestToken = token.includes('test') || token.length < 100;
  if (isTestToken) {
    console.log(`[Authentication] Detected test token`);
  } else {
    console.log(`[Authentication] Processing real user token`);
  }
} catch (err) {
  // Continue even if token inspection fails
  console.log(`[Authentication] Could not inspect token type: ${err.message}`);
}
```

```javascript
// Ensure consistent user ID format between services
if (response.data.data.user && response.data.data.user.id) {
  // Make sure user ID is always treated as string to avoid type mismatches
  if (typeof response.data.data.user.id !== 'string') {
    response.data.data.user.id = String(response.data.data.user.id);
    console.log(`[Authentication] Normalized user ID to string: ${response.data.data.user.id}`);
  }
}
```

### 2. Standard Auth Middleware (auth.middleware.js)
- Added ID normalization to ensure consistent handling
- Enhanced error reporting for auth service connectivity issues
- Improved token validation workflow

```javascript
// Fix for real users - ensure consistent user ID format
if (response.data.data.user && response.data.data.user.id) {
  if (typeof response.data.data.user.id !== 'string') {
    console.log('Converting user ID from ' + typeof response.data.data.user.id + ' to string');
    response.data.data.user.id = String(response.data.data.user.id);
  }
}
```

### 3. Token Utility (token.util.js)
- Enhanced error handling for null/undefined tokens
- Added more detailed error logging
- Improved token verification process

```javascript
// Enhanced error handling for real users
if (!token) {
  console.warn('Attempted to verify null or undefined token');
  return { valid: false, decoded: null };
}

// Handle different token formats and ensure proper decoding
try {
```

```javascript
// Enhanced for real users to be more resilient
if (!token) {
  console.warn('Attempted to extract user from null or undefined token');
  return null;
}
```

## Testing
The fix was tested by restarting the services and clearing Redis caches to ensure fresh state. Real user accounts can now successfully load questionnaire templates.

## Verification Steps
1. Log in with real user credentials (e.g., jusscott@gmail.com)
2. Navigate to the Questionnaires page
3. Verify that questionnaires load without the "unable to load" error
4. Check server logs for improved diagnostics if issues persist

## Additional Recommendations
1. Consider implementing more robust token validation with clearer distinction between different user types
2. Add more comprehensive monitoring for auth service interactions
3. Consider adding automated tests that specifically validate real user scenarios vs test users
