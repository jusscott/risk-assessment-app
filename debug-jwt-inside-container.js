#!/usr/bin/env node

/**
 * Debug JWT validation inside the questionnaire service container
 * This will run inside the container to check the actual JWT_SECRET being used
 */

const jwt = require('jsonwebtoken');

// Test tokens from our diagnostic (the actual failing token)
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIxMTZmNWM2LWY2YzYtNDFlMC04OWMyLWFkNTczMDZiZDM4ZCIsImVtYWlsIjoiZ29vZEB0ZXN0LmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzQ5NDM4MTQ0LCJleHAiOjE3NDk0MzkwNDR9.5AmPuhGQTpxr6z_3Pm8idOI-mrao-pdxmFjWYIgR81U';

console.log('🔍 JWT DEBUG INSIDE QUESTIONNAIRE CONTAINER');
console.log('=' .repeat(60));

// Check environment variables
console.log('📊 Environment Variables:');
console.log('BYPASS_AUTH:', process.env.BYPASS_AUTH);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'undefined');
console.log('JWT_SECRET type:', typeof process.env.JWT_SECRET);

// Test with the exact environment variable
console.log('\n🧪 Testing JWT validation...');

if (!process.env.JWT_SECRET) {
  console.log('❌ JWT_SECRET environment variable is not set!');
  process.exit(1);
}

try {
  console.log('🔍 Attempting JWT verification with process.env.JWT_SECRET...');
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
  console.log('✅ JWT verification successful!');
  console.log('👤 Decoded payload:', JSON.stringify(decoded, null, 2));
} catch (error) {
  console.log('❌ JWT verification failed!');
  console.log('Error message:', error.message);
  console.log('Error name:', error.name);
  console.log('Error stack:', error.stack);
  
  // Test with trimmed secret (in case of whitespace issues)
  console.log('\n🔍 Testing with trimmed JWT_SECRET...');
  try {
    const trimmedSecret = process.env.JWT_SECRET.trim();
    console.log('Trimmed secret length:', trimmedSecret.length);
    const decoded = jwt.verify(testToken, trimmedSecret);
    console.log('✅ JWT verification successful with trimmed secret!');
    console.log('⚠️ ISSUE: JWT_SECRET has extra whitespace');
  } catch (trimError) {
    console.log('❌ JWT verification still failed with trimmed secret');
    console.log('Trim error:', trimError.message);
  }
  
  // Test character by character comparison
  console.log('\n🔍 Character-by-character analysis...');
  const expectedSecret = 'shared-security-risk-assessment-secret-key';
  const actualSecret = process.env.JWT_SECRET;
  
  console.log('Expected length:', expectedSecret.length);
  console.log('Actual length:', actualSecret.length);
  console.log('Strings equal:', expectedSecret === actualSecret);
  
  if (expectedSecret !== actualSecret) {
    console.log('🔍 Differences found:');
    for (let i = 0; i < Math.max(expectedSecret.length, actualSecret.length); i++) {
      const expected = expectedSecret.charAt(i);
      const actual = actualSecret.charAt(i);
      if (expected !== actual) {
        console.log(`Position ${i}: expected '${expected}' (${expected.charCodeAt(0)}), got '${actual}' (${actual.charCodeAt(0)})`);
      }
    }
  }
}

console.log('\n🔍 Token analysis:');
console.log('Token length:', testToken.length);
console.log('Token parts:', testToken.split('.').length);

// Decode without verification to see the payload
try {
  const decoded = jwt.decode(testToken, { complete: true });
  console.log('✅ Token structure is valid');
  console.log('Header:', decoded.header);
  console.log('Payload:', decoded.payload);
} catch (decodeError) {
  console.log('❌ Token structure is invalid:', decodeError.message);
}
