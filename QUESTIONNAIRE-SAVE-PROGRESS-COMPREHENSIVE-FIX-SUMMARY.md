# Questionnaire Save Progress Comprehensive Fix Summary

## Issue Description
User reported persistent "Save Progress failed - please try again" errors when trying to save questionnaire progress. Browser console showed 502 Bad Gateway errors, indicating the questionnaire service was unavailable.

## Root Cause Analysis

### Primary Issue: Docker Health Check Failure
- **Problem**: Questionnaire service marked as "unhealthy" by Docker despite being functional
- **Impact**: API Gateway cannot reach questionnaire service, causing 502 Bad Gateway errors
- **Evidence**: Service responds correctly to direct calls (200 OK) but Docker shows "(unhealthy)"

### Secondary Issue: Token Parsing Structure
- **Problem**: Frontend not correctly extracting tokens from new auth response structure
- **Impact**: Authentication failures in some edge cases
- **Evidence**: Login returns `data.tokens.accessToken` but code expected `data.token`

### Related Issue: User ID Consistency
- **Problem**: Potential mismatch between authenticated user ID and submission ownership
- **Impact**: 403 FORBIDDEN errors when legitimate users try to save progress
- **Evidence**: `submission.userId !== userId` check in updateSubmission function

## Investigation Summary

### Services Health Check
✅ **All individual services healthy**:
- API Gateway: 200 OK
- Auth Service: 200 OK  
- Questionnaire Service: 200 OK

❌ **Docker health check failing**:
- Service responds correctly to direct calls
- Docker marks service as "unhealthy"
- This prevents API Gateway from routing requests properly

### Authentication Flow
✅ **Login working**: Successfully authenticates users
✅ **Token generation**: Creates valid JWT tokens
❌ **Token extraction**: Frontend needed update for new response structure

### Complete Flow Testing
- Login: ✅ Working
- Token extraction: ✅ Fixed
- Token validation: ✅ Working
- Submission access: ⚠️ Depends on user ID consistency
- Save progress: ❌ Fails due to 502 errors from unhealthy service

## Fixes Applied

### 1. Token Parsing Fix ✅
**File**: `frontend/src/services/api.ts`
**Change**: Updated token extraction to handle both old and new response formats
```javascript
// Before: data.token
// After: data.tokens?.accessToken || data.token
```

### 2. Docker Health Check Analysis ⚠️
**Issue**: Health check configuration couldn't be automatically updated
**Current**: Questionnaire service still marked unhealthy
**Manual Fix Required**: See solution below

## Direct Solution for Immediate Fix

### Option 1: Force Docker Health Reset (Recommended)
```bash
cd risk-assessment-app
docker-compose stop questionnaire-service
docker-compose start questionnaire-service
# Wait 60 seconds for health check to stabilize
docker-compose ps questionnaire-service
```

### Option 2: Bypass Health Check Temporarily
Update `docker-compose.yml` questionnaire-service section to remove or disable health check:
```yaml
questionnaire-service:
  # ... existing config ...
  # Comment out or remove the healthcheck section temporarily
  # healthcheck:
  #   test: [...]
```

### Option 3: Fix Health Check URL (If Different)
Verify the health check URL in `docker-compose.yml` matches the actual endpoint:
- Current service responds at: `/health`
- Ensure Docker health check uses: `http://localhost:5002/health`

## Verification Steps

### 1. Check Service Health
```bash
# Verify questionnaire service is healthy
docker-compose ps questionnaire-service
# Should show: "Up X minutes (healthy)"
```

### 2. Test Save Progress Flow
```bash
# Test direct service access
curl http://localhost:5002/health
# Should return: {"status":"ok",...}

# Test through API Gateway
curl http://localhost:5000/api/questionnaires/submissions/in-progress \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should NOT return 502 error
```

### 3. Browser Testing
1. **Refresh browser completely** (Ctrl+F5)
2. **Login again** to get fresh tokens with correct parsing
3. **Navigate to in-progress questionnaire**
4. **Try saving progress** - should work without 502 errors
5. **Log out and back in** to test progress restoration

## Expected Outcome

After applying the fixes:
- ✅ Docker health check passes
- ✅ 502 Bad Gateway errors eliminated
- ✅ Token parsing handles both response formats
- ✅ Save progress functionality works reliably
- ✅ Users can log out/in and resume where they left off

## Monitoring

### Key Indicators of Success
1. **Docker Status**: `docker-compose ps` shows questionnaire-service as "(healthy)"
2. **API Responses**: No more 502 errors in browser console
3. **Save Function**: "Progress saved successfully" messages in UI
4. **Persistence**: Users can log out/in and continue from last question

### If Issues Persist
1. **Check logs**: `docker-compose logs questionnaire-service`
2. **Verify health endpoint**: `curl http://localhost:5002/health`
3. **Test user ID consistency**: Ensure authenticated user owns the submissions they're trying to update
4. **Run diagnostics**: `node diagnose-save-progress-comprehensive.js`

## Technical Details

### Complete Questionnaire Save Flow
1. **User clicks "Save Progress"** → Frontend calls `handleSave()`
2. **Token validation** → `questionnaireWrapper.ensureFreshToken()`
3. **API call** → `PUT /api/questionnaires/submissions/{id}`
4. **API Gateway routing** → Proxies to questionnaire-service
5. **Health check** → Gateway verifies service is healthy
6. **Authentication** → Service validates JWT token
7. **Authorization** → Service checks `submission.userId === user.id`
8. **Database update** → Service saves answers to database
9. **Response** → Success/failure returned to frontend

### Critical Points of Failure
- **Step 5**: Health check failure → 502 Bad Gateway
- **Step 6**: Token parsing issues → Authentication failure
- **Step 7**: User ID mismatch → 403 FORBIDDEN

## Status: PARTIALLY RESOLVED

### ✅ Completed
- Token parsing fixed in frontend
- Root cause identified (Docker health check)
- Comprehensive diagnostic tools created

### ⚠️ Requires Manual Intervention
- Docker health check needs manual reset or configuration fix
- User should apply Option 1 (service restart) or Option 2 (health check bypass)

### 🎯 Expected Result
Once Docker health issue is resolved, save progress functionality should work reliably without 502 errors, and users should be able to resume questionnaires after logging out and back in.
