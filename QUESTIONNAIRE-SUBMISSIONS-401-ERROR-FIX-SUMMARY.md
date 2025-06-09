# Questionnaire Submissions 401 Error - Final Fix Summary

## Issue Description
When users click on the "Questionnaires" link from the dashboard, they encounter a 401 (Unauthorized) error when trying to access questionnaire submissions endpoints like `/api/questionnaires/submissions/in-progress`.

## Root Cause Analysis

### Original Problem
- API Gateway was not forwarding the authorization header to the questionnaire service
- Templates endpoint worked (no auth required)
- Submission endpoints failed (auth required)

### Discovery Process
1. **First Analysis**: JWT secret mismatch suspected
   - **Result**: JWT secrets were identical across services
   
2. **Second Analysis**: Authorization header missing
   - **Result**: API Gateway logs showed header NOT being forwarded
   
3. **Third Analysis**: Proxy middleware issue
   - **Result**: Enhanced proxy middleware with explicit header forwarding
   
4. **Fourth Analysis**: Middleware interference
   - **Result**: Created header preservation middleware to store/restore auth header
   
5. **Final Analysis**: Header forwarding contradiction
   - **API Gateway logs**: "Authorization header forwarded successfully"
   - **Questionnaire service logs**: "No authorization header received"

### Current Status
- ✅ API Gateway receives authorization header from frontend
- ✅ API Gateway preservation middleware stores original header
- ✅ API Gateway restoration middleware restores header before forwarding
- ✅ API Gateway logs confirm header forwarding
- ❌ Questionnaire service never receives the authorization header

## Technical Details

### Error Symptoms
```
GET http://localhost:5000/api/questionnaires/submissions/in-progress 401 (Unauthorized)
```

### Frontend Console Logs
```
❌ Error fetching questionnaires: 
AxiosError {message: 'Request failed with status code 401', name: 'AxiosError', code: 'ERR_BAD_REQUEST'}
```

### API Gateway Logs (SUCCESS)
```
🔐 [AUTH PRESERVE] Original auth header stored: Bearer eyJhbGciOiJIU...
🔄 [AUTH PRESERVE] Restored original auth header for forwarding
🎯 SUBMISSION REQUEST - Authorization header forwarded to questionnaire-service
```

### Questionnaire Service Logs (FAILURE)
```
🔍 [Questionnaire Auth] Headers present: [
  'connection', 'host', 'accept-encoding', 'user-agent', 'content-type', 
  'accept', 'x-request-id', 'x-user-id', 'x-user-role', 'x-service-name'
]
❌ [Questionnaire Auth] No valid authorization header
```

### The Contradiction
The API Gateway claims to forward the authorization header, but the questionnaire service never receives it. This indicates a **proxy-level header stripping issue**.

## Attempted Solutions

### 1. Enhanced Proxy Middleware (✅ Implemented)
- **File**: `backend/api-gateway/src/middlewares/proxy.middleware.js`
- **Fix**: Added explicit authorization header forwarding with debug logging
- **Result**: Confirmed headers are being set in proxy middleware

### 2. Authorization Header Preservation (✅ Implemented)
- **File**: `backend/api-gateway/src/index.js`
- **Fix**: Added middleware to preserve original auth header before verifyToken processes it
- **Result**: Original header is stored and restored, but still not reaching questionnaire service

### 3. JWT Secret Verification (✅ Confirmed)
- **Verification**: Both services use identical JWT secret
- **Result**: Not a JWT secret mismatch issue

## Final Solution Required

The issue appears to be at the **http-proxy-middleware level** where headers are being stripped despite explicit forwarding. The solution requires:

1. **Direct header bypass**: Ensure authorization header bypasses all middleware processing
2. **Proxy configuration fix**: Modify proxy settings to preserve authorization headers
3. **Alternative authentication**: Use x-user-id/x-user-role headers as fallback

## Files Modified
1. `backend/api-gateway/src/middlewares/proxy.middleware.js` - Enhanced header forwarding
2. `backend/api-gateway/src/index.js` - Added header preservation middleware
3. `backend/questionnaire-service/src/middlewares/auth.middleware.js` - Enhanced debugging

## Next Steps
1. Implement direct authorization header bypass in proxy configuration
2. Add fallback authentication using x-user-id header
3. Test with browser-based questionnaire access
4. Verify complete fix with end-to-end testing

## Impact
- **User Experience**: Users cannot access questionnaire submissions
- **Functionality**: Questionnaire templates work, but submissions fail
- **Authentication**: Auth system works for other services
- **Scope**: Affects only questionnaire submission endpoints

## Priority
**CRITICAL** - Breaks core questionnaire functionality for authenticated users.
