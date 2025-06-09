# Questionnaire New Assessment 401 Error Fix Summary

## Issue Description
When clicking "Start New Assessment" on the dashboard, users were getting a 401 error:
```
api.ts:277 [b3h3vj] 401 received for: /questionnaires/templates/1?page=1&pageSize=50&loadQuestions=true
[ENHANCED-CLIENT] Request failed for service undefined: Unknown service: undefined
Token verification failed: invalid signature
```

## Root Cause Analysis
The issue was in the `optimized-auth.middleware.js` file used by the questionnaire service routes. Two specific problems:

1. **Missing Service Parameter**: The enhanced client call was missing the required `service` parameter
2. **Invalid URL Format**: The enhanced client was receiving a full URL instead of just a path

## Fix Applied

### 1. Added Missing Service Parameter
**File**: `backend/questionnaire-service/src/middlewares/optimized-auth.middleware.js`

**Before**:
```javascript
const response = await enhancedClient.request({
  method: 'post',
  url: `${config.authService.url}/validate-token`,
  // Missing service parameter
```

**After**:
```javascript
const response = await enhancedClient.request({
  service: 'auth',  // Added missing service parameter
  method: 'post',
  url: '/validate-token',  // Use path only, not full URL
```

### 2. Fixed URL Format
The enhanced client expects a path (e.g., `/validate-token`) rather than a full URL (e.g., `http://auth-service:5001/validate-token`).

## Test Results

### Before Fix
```
❌ Questionnaire endpoint failed: {
  status: 401,
  error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' }
}
```

### After Fix
```
✅ Questionnaire endpoint success: 200
📊 Response data preview: { keys: [ 'success', 'data', 'message' ], dataLength: 8055 }
```

## Error Log Analysis

### Before Fix
```
[ENHANCED-CLIENT] Request failed for service undefined: Unknown service: undefined
[req-xxx] Error during token validation: Unknown service: undefined
Token verification failed: invalid signature
```

### After Fix
```
[ENHANCED-CLIENT] Making auth service request to: http://auth-service:5001/validate-token
[Authentication] Validating token for requestId: req-xxx
[Authentication] Processing real user token
✅ Token validation successful
```

## Impact
- ✅ "Start New Assessment" functionality now works
- ✅ Dashboard quick actions are functional
- ✅ Users can successfully access questionnaire templates
- ✅ Authentication flow between frontend and questionnaire service is stable

## Services Verified
- ✅ API Gateway: 200 - healthy
- ✅ Auth Service: 200 - healthy  
- ✅ Questionnaire Service: 200 - healthy

## Technical Details

### Enhanced Client Configuration
The enhanced client requires specific parameters for service-to-service communication:
- `service`: Identifies the target service (e.g., 'auth')
- `url`: Path only, not full URL (e.g., '/validate-token')
- Proper error handling and circuit breaker patterns

### Environment Configuration
Ensured both required environment variables are present:
- `BYPASS_AUTH=true` (for development)
- `JWT_SECRET=shared-security-risk-assessment-secret-key` (for token validation)

## Files Modified
1. `backend/questionnaire-service/src/middlewares/optimized-auth.middleware.js`
   - Added missing `service: 'auth'` parameter
   - Fixed URL format from full URL to path only

## Verification Steps
1. ✅ Service health checks pass
2. ✅ Login flow works correctly  
3. ✅ Auth /me endpoint responds successfully
4. ✅ Questionnaire template endpoint responds successfully (was failing before)
5. ✅ No more "Unknown service: undefined" errors
6. ✅ No more "Invalid URL" errors

This fix resolves the 401 authentication error that was preventing users from starting new assessments through the dashboard.
