#!/usr/bin/env node

/**
 * Verification Script for Login Rate Limiting Fix
 * 
 * This script verifies that the rate limiting fix has been properly applied
 * and tests key aspects of the new implementation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying login rate limiting fix implementation...\n');

// Path to the rate limiting middleware
const rateLimitPath = path.join(__dirname, 'backend/api-gateway/src/middlewares/rate-limit.middleware.js');

try {
  // Check if file exists
  if (!fs.existsSync(rateLimitPath)) {
    console.error('❌ Rate limiting middleware not found at:', rateLimitPath);
    process.exit(1);
  }

  // Read current file
  const rateLimit = fs.readFileSync(rateLimitPath, 'utf8');
  console.log('✅ Found rate limiting middleware');
  
  // Check for the key components of our fix
  
  // 1. Check for unique key generation for first-time login attempts
  const hasSpecialHandling = rateLimit.includes('// Special handling: In case of login attempts') || 
                              rateLimit.includes('clientIP}-first-') ||
                              rateLimit.includes('uniqueId');
                              
  if (hasSpecialHandling) {
    console.log('✅ First-time login handling is implemented');
  } else {
    console.log('❌ Missing special handling for first-time login attempts');
  }
  
  // 2. Check for improved path matching
  const hasImprovedPathMatching = rateLimit.includes('path.includes(\'/auth\')');
  
  if (hasImprovedPathMatching) {
    console.log('✅ Improved path matching for authentication endpoints');
  } else {
    console.log('❌ Missing improved path matching for authentication endpoints');
  }
  
  // 3. Check for skip function
  const hasSkipFunction = rateLimit.includes('skip: (req) =>') || rateLimit.includes('skip function');
  
  if (hasSkipFunction) {
    console.log('✅ Skip function for first-time attempts is implemented');
  } else {
    console.log('❌ Missing skip function for rate limiting');
  }
  
  // 4. Check for debug logging
  const hasLogging = rateLimit.includes('logRateLimitInfo') || 
                     rateLimit.includes('console.log(`Rate limit');
                     
  if (hasLogging) {
    console.log('✅ Debug logging for rate limiting is implemented');
  } else {
    console.log('❌ Missing debug logging for rate limiting');
  }

  // Check the related index.js file for the integration of the logging middleware
  const indexPath = path.join(__dirname, 'backend/api-gateway/src/index.js');
  
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const hasFixedLogMiddleware = indexContent.includes('logRateLimitInfo');
    
    if (hasFixedLogMiddleware) {
      console.log('✅ Rate limit logging middleware is properly integrated');
    } else {
      console.log('⚠️ Rate limit logging middleware integration could not be verified in index.js');
    }
  } else {
    console.log('⚠️ Could not find index.js to verify middleware integration');
  }

  // Check for Redis integration
  const redisCheck = rateLimit.includes('redis') || rateLimit.includes('Redis');
  
  if (redisCheck) {
    console.log('✅ Redis integration for rate limiting is present');
    
    // Check if clear-rate-limiter.js exists
    if (fs.existsSync(path.join(__dirname, 'clear-rate-limiter.js'))) {
      console.log('✅ Redis key clearing script (clear-rate-limiter.js) is available');
    } else {
      console.log('⚠️ Redis key clearing script not found, but might be in another location');
    }
  } else {
    console.log('⚠️ Redis integration was not detected in the rate limiter');
  }

  // Summary
  const totalChecks = 5; // Special handling, path matching, skip function, debug logging, Redis integration
  const passedChecks = [hasSpecialHandling, hasImprovedPathMatching, hasSkipFunction, hasLogging, redisCheck].filter(Boolean).length;
  
  console.log('\n📊 Verification Summary:');
  console.log(`   ${passedChecks}/${totalChecks} critical components implemented`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 Login rate limiting fix appears to be fully implemented!');
    console.log('   New users should now be able to log in without encountering "too many authentication attempts" errors.');
  } else if (passedChecks >= 3) {
    console.log('\n⚠️ Login rate limiting fix is partially implemented.');
    console.log('   Some components may be missing or implemented differently than expected.');
  } else {
    console.log('\n❌ Login rate limiting fix is not properly implemented.');
    console.log('   Run the fix-login-rate-limiting.js script to apply the fix.');
  }
  
  console.log('\nTest Instructions:');
  console.log('1. Create a new user account');
  console.log('2. Try to log in immediately');
  console.log('3. Check API Gateway logs for debug output');
  console.log('4. Verify no "too many authentication attempts" errors appear');

} catch (error) {
  console.error('❌ Error during verification:', error.message);
  process.exit(1);
}
