# Questionnaire Service Container Restart Issue Fix

## Problem
The questionnaire-service container was stuck in a restart loop and failing to reach a healthy state. The container logs showed a JavaScript syntax error in the `/app/src/utils/token.util.js` file:

```
SyntaxError: Missing catch or finally after try
    at Object.compileFunction (node:vm:360:18)
```

## Root Cause
The `token.util.js` file had an incomplete try-catch block structure. Specifically, there was an outer `try` statement without a corresponding `catch` or `finally` block. This is a syntax error in JavaScript that prevents the file from being parsed correctly.

Location of the issue:
```javascript
// Handle different token formats and ensure proper decoding
try {
if (!token) {
  return { valid: false, decoded: null };
}

try {
  // Get the JWT secret from environment or config
  const jwtSecret = process.env.JWT_SECRET || config.jwt.secret || 'shared-security-risk-assessment-secret-key';
  
  // ...rest of the code...
} catch (error) {
  // ...error handling code...
}
```

## Solution
The issue was fixed by removing the unnecessary outer `try` block, keeping only the inner try-catch block which was properly structured:

```javascript
// Handle different token formats and ensure proper decoding
if (!token) {
  return { valid: false, decoded: null };
}

try {
  // Get the JWT secret from environment or config
  const jwtSecret = process.env.JWT_SECRET || config.jwt.secret || 'shared-security-risk-assessment-secret-key';
  
  // ...rest of the code...
} catch (error) {
  // ...error handling code...
}
```

## Fix Implementation
1. Created a script `fix-token-util-syntax.js` to modify the file
2. Used a regular expression to identify and replace the problematic pattern
3. Restarted the questionnaire-service container after applying the fix

## Verification
The fix was successful, and the container is now running in a healthy state.

## Preventive Measures
- Consider adding a linting step in the CI/CD pipeline to catch JavaScript syntax errors before deployment
- Implement more comprehensive testing for utility functions
- Review other similar utility files for proper try-catch block structure
