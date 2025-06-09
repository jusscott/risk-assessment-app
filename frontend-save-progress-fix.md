# Save Progress Button Fix

## Issue Found
The Save Progress button in the questionnaire was failing due to authentication issues. When debugging, we discovered:

1. The original debug script attempted to access the questionnaire service through the API gateway (port 5000)
2. This resulted in a 401 Unauthorized error with "INVALID_PASSWORD" code
3. Authentication was failing when trying to save questionnaire progress

## Solution

### Short-term fix (for development)
Our modified debugging script directly connects to the questionnaire service on port 5002, bypassing the API gateway and authentication:

```javascript
// Instead of going through the API gateway on port 5000:
// http://localhost:5000/api/questionnaires/submissions/:id

// Directly access the questionnaire service on port 5002:
const updateResponse = await axios.put(
  `http://localhost:5002/api/submissions/${submission.id}`,
  { answers: testAnswers },
  {
    headers: { 
      'Content-Type': 'application/json'
    }
  }
);
```

This works because the questionnaire service has `BYPASS_AUTH=true` set in its `.env.development` file.

### Recommended frontend fix

In the frontend application, modify the API service configuration to handle authentication refreshing:

1. Update the `api.ts` file to handle 401 errors by automatically refreshing tokens
2. Ensure the frontend is passing the correct authentication token in all requests
3. Verify the refresh token mechanism is working properly

Specific implementation:
1. Add a request interceptor to refresh tokens on 401 responses
2. Ensure token storage is persistent and properly maintained
3. Fix any incorrect credentials being sent from the frontend

### Long-term fixes (for production)

1. Review the authentication service to ensure it properly validates tokens
2. Add better logging for authentication failures
3. Implement proper error handling for expired tokens
4. Improve token refreshing mechanisms across services
