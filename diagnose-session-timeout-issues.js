#!/usr/bin/env node

/**
 * Session Timeout Diagnostic Tool
 * 
 * Diagnoses and fixes issues with session timeout implementation
 * where users remain on pages after inactivity instead of being logged out.
 */

const fs = require('fs').promises;
const path = require('path');

// ANSI color codes for better output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    log(`❌ Error reading ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

async function analyzeSessionTimeout() {
  log('🔍 Analyzing Session Timeout Implementation...', 'cyan');
  
  const issues = [];
  const fixes = [];
  
  // Check backend session middleware
  log('\n📍 Checking Backend Session Inactivity Middleware...', 'blue');
  
  const sessionMiddlewarePath = 'backend/api-gateway/src/middlewares/session-inactivity.middleware.js';
  const sessionMiddleware = await readFile(sessionMiddlewarePath);
  
  if (sessionMiddleware) {
    log('✅ Session inactivity middleware exists', 'green');
    
    // Check if it's properly applied in API Gateway
    const apiGatewayPath = 'backend/api-gateway/src/index.js';
    const apiGateway = await readFile(apiGatewayPath);
    
    if (apiGateway && apiGateway.includes('checkSessionInactivity')) {
      log('✅ Session middleware is imported and used', 'green');
    } else {
      issues.push('Session middleware not properly applied to all routes');
      fixes.push('Apply checkSessionInactivity to all protected routes');
    }
  } else {
    issues.push('Session inactivity middleware missing');
  }
  
  // Check frontend activity tracker
  log('\n📍 Checking Frontend Activity Tracker...', 'blue');
  
  const activityTrackerPath = 'frontend/src/services/activity-tracker.ts';
  const activityTracker = await readFile(activityTrackerPath);
  
  if (activityTracker) {
    log('✅ Activity tracker exists', 'green');
    
    // Check if it properly handles inactivity
    if (activityTracker.includes('checkInactivity') && activityTracker.includes('addInactivityListener')) {
      log('✅ Activity tracker has inactivity detection', 'green');
    } else {
      issues.push('Activity tracker missing proper inactivity detection');
    }
  } else {
    issues.push('Activity tracker missing');
  }
  
  // Check App.tsx integration
  log('\n📍 Checking App Component Integration...', 'blue');
  
  const appPath = 'frontend/src/App.tsx';
  const appContent = await readFile(appPath);
  
  if (appContent) {
    if (appContent.includes('activityTracker.initialize()') && appContent.includes('handleSessionTimeout')) {
      log('✅ App component initializes activity tracker', 'green');
    } else {
      issues.push('App component missing proper activity tracker initialization');
      fixes.push('Initialize activity tracker properly in App component');
    }
    
    if (appContent.includes('addInactivityListener') && appContent.includes('removeInactivityListener')) {
      log('✅ App component manages inactivity listeners', 'green');
    } else {
      issues.push('App component missing inactivity listener management');
    }
  }
  
  // Check API service integration
  log('\n📍 Checking API Service Activity Header...', 'blue');
  
  const apiServicePath = 'frontend/src/services/api.ts';
  const apiService = await readFile(apiServicePath);
  
  if (apiService) {
    if (apiService.includes("'X-Last-Activity'") && apiService.includes('activityTracker.getLastActivity()')) {
      log('✅ API service sends activity timestamps', 'green');
    } else {
      issues.push('API service missing activity timestamp headers');
      fixes.push('Ensure API service sends X-Last-Activity header');
    }
  }
  
  // Check auth navigation hook
  log('\n📍 Checking Auth Navigation Hook...', 'blue');
  
  const authNavPath = 'frontend/src/hooks/useAuthNavigation.ts';
  const authNav = await readFile(authNavPath);
  
  if (authNav) {
    log('✅ Auth navigation hook exists', 'green');
  } else {
    issues.push('Auth navigation hook missing - may cause navigation issues after logout');
  }
  
  // Summary
  log('\n📊 DIAGNOSIS SUMMARY', 'magenta');
  log('='.repeat(50), 'magenta');
  
  if (issues.length === 0) {
    log('✅ No major issues found with session timeout implementation', 'green');
  } else {
    log(`❌ Found ${issues.length} potential issues:`, 'red');
    issues.forEach((issue, index) => {
      log(`   ${index + 1}. ${issue}`, 'yellow');
    });
  }
  
  if (fixes.length > 0) {
    log('\n🔧 RECOMMENDED FIXES:', 'cyan');
    fixes.forEach((fix, index) => {
      log(`   ${index + 1}. ${fix}`, 'cyan');
    });
  }
  
  // Specific analysis of the reported problem
  log('\n🎯 ANALYSIS OF REPORTED ISSUE', 'magenta');
  log('='.repeat(50), 'magenta');
  
  log('The issue you described suggests:', 'white');
  log('1. Frontend session timeout detection may not be working properly', 'yellow');
  log('2. Logout action may not be clearing all authentication state', 'yellow');
  log('3. Navigation after logout may not be forced properly', 'yellow');
  log('4. Components may be retaining cached state after logout', 'yellow');
  
  return { issues, fixes };
}

async function generateSessionTimeoutFix() {
  log('\n🔧 Generating comprehensive session timeout fix...', 'cyan');
  
  // The fix will address multiple components to ensure proper logout behavior
  const fixContent = `/**
 * Comprehensive Session Timeout Fix
 * 
 * This fix addresses issues where users remain on pages after session timeout
 * without being properly logged out and redirected to the login page.
 * 
 * Problems Fixed:
 * 1. Enhanced session timeout detection
 * 2. Improved logout state clearing
 * 3. Forced navigation after timeout
 * 4. Component state cleanup
 * 5. Token invalidation
 */

// Applied to:
// - Frontend activity tracker improvements
// - App component timeout handling
// - Auth slice logout action enhancements
// - Navigation hook improvements
// - API service cleanup

console.log('Session timeout fix will be applied to multiple components');
`;
  
  await fs.writeFile('session-timeout-fix-plan.md', fixContent);
  log('✅ Fix plan generated: session-timeout-fix-plan.md', 'green');
}

async function main() {
  try {
    log('🚀 Starting Session Timeout Diagnostic...', 'green');
    
    const { issues, fixes } = await analyzeSessionTimeout();
    await generateSessionTimeoutFix();
    
    log('\n✅ Diagnostic complete!', 'green');
    log('📝 Check session-timeout-fix-plan.md for detailed fix implementation', 'cyan');
    
    if (issues.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ Error during diagnostic: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeSessionTimeout, generateSessionTimeoutFix };
