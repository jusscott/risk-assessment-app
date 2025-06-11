# Questionnaire Save Progress 502 Error - Final Analysis & Resolution

## Problem Statement

The questionnaire save progress functionality was failing with consistent 502 Bad Gateway errors when users attempted to save their progress on in-progress questionnaires. The frontend `debug-dash-logger.js` was reporting "saving answer status 502" and the API was returning 502 bad gateway errors at `API.ts line 579`.

## Root Cause Analysis

Through comprehensive diagnostic analysis, we identified multiple interconnected issues:

### 1. API Gateway Routing Issues

**Issue**: The API Gateway was missing route handlers for `/api/submissions/*` endpoints.

**Evidence**: 
- Initial diagnostic showed 404 errors for `/api/submissions/in-progress`
- API Gateway `index.js` only handled `/api/questionnaire/submissions` and `/api/questionnaires/submissions`
- No handler for direct `/api/submissions/*` routes

**Root Cause**: Missing route configuration for submission endpoints in API Gateway.

### 2. Path Rewrite Configuration Gap

**Issue**: The path rewrite configuration didn't include submission routes.

**Evidence**:
- `path-rewrite.config.js` only handled questionnaire routes
- No rewrite rules for `/api/submission/` or `/api/submissions/` patterns

### 3. Database Constraint Error in Submission Controller

**Issue**: The `updateSubmission` function was trying to use a non-existent unique constraint for upsert operations.

**Evidence**:
- Prisma schema shows no unique constraint on `submissionId_questionId` combination
- Controller was attempting to use `submissionId_questionId` constraint in upsert
- This caused the service to crash when processing PUT requests

**Root Cause**: Incorrect assumption about database schema constraints.

### 4. Service Health Check Issues

**Issue**: Health check bypass configuration was preventing proper service health monitoring.

**Evidence**:
- Questionnaire service showing as "unhealthy" despite running
- Health check endpoint modifications in previous fixes

## Implemented Fixes

### Fix 1: API Gateway Route Handlers

**File**: `backend/api-gateway/src/index.js`

Added missing submission route handlers:

```javascript
// Direct submissions routes (for backward compatibility and cleaner API)
app.use('/api/submission', 
  preserveAuthHeader,
  checkSessionInactivity, 
  verifyToken, 
  apiLimiter, 
  createPreservingProxy(questionnaireServiceProxy)
);
app.use('/api/submissions', 
  preserveAuthHeader,
  checkSessionInactivity, 
  verifyToken, 
  apiLimiter, 
  createPreservingProxy(questionnaireServiceProxy)
);
```

### Fix 2: Path Rewrite Configuration

**File**: `backend/api-gateway/src/config/path-rewrite.config.js`

Added submission path rewrite rules:

```javascript
// Submission service routes (part of questionnaire service)
'^/api/submission/(.*)': '/$1',
'^/api/submissions/(.*)': '/$1',

// Health endpoints
'^/api/submission/health': '/health',
'^/api/submissions/health': '/health',
```

### Fix 3: Database Operation Fix

**File**: `backend/questionnaire-service/src/controllers/submission.controller.js`

Replaced incorrect upsert with proper find-and-update logic:

```javascript
// Handle each answer with proper find-and-update logic since no unique constraint exists
const answerPromises = answersArray.map(async (answer) => {
  try {
    // Find existing answer for this submission and question
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        submissionId: parseInt(id),
        questionId: answer.questionId
      }
    });

    if (existingAnswer) {
      // Update existing answer
      return await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          value: answer.value,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new answer
      return await prisma.answer.create({
        data: {
          submissionId: parseInt(id),
          questionId: answer.questionId,
          value: answer.value,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error(`Error saving answer for question ${answer.questionId}:`, error);
    throw error;
  }
});
```

### Fix 4: Health Check Configuration

**File**: `backend/questionnaire-service/src/middlewares/health-check-bypass.js`

Applied health check bypass fix to prevent interference with service health monitoring.

## Current Status

### ✅ Resolved Issues

1. **404 Routing Errors**: Fixed - `/api/submissions/in-progress` now returns 200
2. **Path Rewrite Configuration**: Fixed - Proper routing rules in place
3. **Database Upsert Logic**: Fixed - Using proper find-and-update pattern
4. **API Gateway Route Handlers**: Fixed - All submission endpoints properly routed

### ⚠️ Remaining Issues

1. **Service Crash on PUT Requests**: The questionnaire service still crashes when handling PUT requests to save progress
   - Service responds to health checks and GET requests
   - Crashes silently on PUT `/api/submissions/{id}` requests
   - No error logs visible in service output
   - Results in 502 Bad Gateway from API Gateway

## Diagnostic Evidence

### Latest Diagnostic Results:
- ✅ API Gateway Health: 200
- ✅ Auth Service: 200  
- ✅ In-progress submissions GET: 200
- ❌ Submission update PUT: 502 (Service crashes)

### API Gateway Logs Show:
```
warn: Retrying request to questionnaire-service (attempt 1/1): PUT /api/submissions/1 
error: Proxy error from questionnaire-service: connect ECONNREFUSED 172.28.0.10:5002
error: Proxy error for questionnaire-service after 1 retries: connect ECONNREFUSED 172.28.0.10:5002
```

## Next Steps for Complete Resolution

To fully resolve the save progress 502 error, the following steps are recommended:

### 1. Debug Service Crash
- Add comprehensive error logging to the submission controller
- Implement try-catch blocks around all database operations
- Add request/response logging middleware

### 2. Database Transaction Safety
- Wrap the answer update operations in a database transaction
- Add proper rollback handling for failed operations

### 3. Service Stability
- Implement graceful error handling in the submission update endpoint
- Add proper validation for incoming request data
- Consider adding circuit breaker patterns for database calls

### 4. Monitoring & Alerts
- Add detailed health checks that test actual database operations
- Implement proper logging for debugging service crashes
- Add monitoring for service restart frequency

## Impact Assessment

### User Experience Impact
- Users cannot save progress on questionnaires
- All questionnaire data is lost if page is refreshed
- Significant impact on questionnaire completion rates

### System Impact
- Questionnaire service instability
- Potential data loss
- Poor system reliability metrics

## Conclusion

Significant progress has been made in resolving the save progress 502 error. The routing and configuration issues have been completely resolved. However, the core service crash issue when handling PUT requests still requires investigation and resolution to fully restore save progress functionality.

The fixes implemented provide a solid foundation, and the remaining issue appears to be related to the service's internal error handling during database operations.
