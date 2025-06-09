#!/usr/bin/env node

/**
 * Debug JWT Secret Mismatch Issue
 * This script will check the JWT secrets in both services
 */

const jwt = require('jsonwebtoken');

// Test tokens from our diagnostic
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIxMTZmNWM2LWY2YzYtNDFlMC04OWMyLWFkNTczMDZiZDM4ZCIsImVtYWlsIjoiZ29vZEB0ZXN0LmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzQ5NDM4MTQ0LCJleHAiOjE3NDk0MzkwNDR9.5AmPuhGQTpxr6z_3Pm8idOI-mrao-pdxmFjWYIgR81U';

// Expected JWT secret from docker-compose.yml
const expectedSecret = 'shared-security-risk-assessment-secret-key';

console.log('🔍 JWT SECRET MISMATCH DIAGNOSTIC');
console.log('=' .repeat(60));

console.log('🔍 Testing token validation with expected secret...');

try {
  const decoded = jwt.verify(testToken, expectedSecret);
  console.log('✅ Token validates successfully with expected secret');
  console.log('👤 Decoded user:', decoded);
} catch (error) {
  console.log('❌ Token validation failed with expected secret');
  console.log('Error:', error.message);
  console.log('Error type:', error.name);
}

console.log('\n📋 ANALYSIS:');
console.log('Expected JWT_SECRET:', expectedSecret);
console.log('Token (first 50 chars):', testToken.substring(0, 50) + '...');

console.log('\n🔍 POSSIBLE CAUSES:');
console.log('1. Questionnaire service using different JWT_SECRET');
console.log('2. Environment variable not properly loaded');
console.log('3. Service restart didn\'t pick up new environment');
console.log('4. Docker-compose environment variable issue');

console.log('\n🛠️ SOLUTION:');
console.log('The questionnaire service needs to use the same JWT_SECRET as the auth service');
console.log('Both should use: shared-security-risk-assessment-secret-key');
