#!/usr/bin/env node
/**
 * Monitor Authentication Issues Script
 * 
 * This script monitors authentication logs in the questionnaire service to detect
 * potential issues with JWT validation, especially during concurrent requests.
 * 
 * It can be run alongside the service to provide real-time monitoring of auth issues.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const readline = require('readline');
const { exec } = require('child_process');
const execAsync = util.promisify(exec);

// Configuration
const CONFIG = {
  logPath: process.env.LOG_PATH || './logs',
  logFile: process.env.LOG_FILE || 'questionnaire-service.log',
  watchIntervalMs: parseInt(process.env.WATCH_INTERVAL_MS, 10) || 1000,
  alertThreshold: parseInt(process.env.ALERT_THRESHOLD, 10) || 3,
  timeWindowMs: parseInt(process.env.TIME_WINDOW_MS, 10) || 60000, // 1 minute
  saveStatsIntervalMs: parseInt(process.env.SAVE_STATS_INTERVAL_MS, 10) || 300000 // 5 minutes
};

// Statistics
const stats = {
  startTime: new Date(),
  totalRequests: 0,
  authErrors: 0,
  concurrentValidations: 0,
  maxConcurrentValidations: 0,
  fallbackValidations: 0,
  serviceUnavailable: 0,
  authErrorsByEndpoint: {},
  recentErrors: [] // Array to track errors within time window
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Ensure logs directory exists
function ensureLogDir() {
  if (!fs.existsSync(CONFIG.logPath)) {
    fs.mkdirSync(CONFIG.logPath, { recursive: true });
    console.log(`${colors.green}Created log directory: ${CONFIG.logPath}${colors.reset}`);
  }
}

// Get full path to log file
function getLogFilePath() {
  return path.join(CONFIG.logPath, CONFIG.logFile);
}

// Log parsing regex patterns
const LOG_PATTERNS = {
  requestId: /\[([a-zA-Z0-9\-]+)\]/,
  authError: /Authentication.*error|Invalid authentication token|auth.*failed/i,
  concurrentValidation: /High concurrent validations: (\d+)/,
  fallbackValidation: /USING FALLBACK LOCAL TOKEN VALIDATION/i,
  serviceUnavailable: /Authentication service unavailable/i,
  endpoint: /^\S+\s+\S+\s+\S+\s+(\S+)/
};

// Process a single log line
function processLogLine(line) {
  // Count total requests
  if (line.includes('Authentication successful')) {
    stats.totalRequests++;
  }

  // Extract request ID if available
  const requestIdMatch = line.match(LOG_PATTERNS.requestId);
  const requestId = requestIdMatch ? requestIdMatch[1] : 'unknown';
  
  // Check for auth errors
  if (LOG_PATTERNS.authError.test(line)) {
    stats.authErrors++;
    
    // Track in time window
    const now = Date.now();
    stats.recentErrors.push(now);
    
    // Clean up old errors outside time window
    stats.recentErrors = stats.recentErrors.filter(time => now - time < CONFIG.timeWindowMs);
    
    // Try to extract endpoint
    const endpointMatch = line.match(LOG_PATTERNS.endpoint);
    if (endpointMatch) {
      const endpoint = endpointMatch[1];
      stats.authErrorsByEndpoint[endpoint] = (stats.authErrorsByEndpoint[endpoint] || 0) + 1;
    }
    
    console.log(`${colors.red}[AUTH ERROR] ${requestId}: ${line}${colors.reset}`);
  }
  
  // Check for concurrent validations
  const concurrentMatch = line.match(LOG_PATTERNS.concurrentValidation);
  if (concurrentMatch) {
    const count = parseInt(concurrentMatch[1], 10);
    stats.concurrentValidations++;
    stats.maxConcurrentValidations = Math.max(stats.maxConcurrentValidations, count);
    console.log(`${colors.yellow}[CONCURRENT] ${count} validations in progress${colors.reset}`);
  }
  
  // Check for fallback validations
  if (LOG_PATTERNS.fallbackValidation.test(line)) {
    stats.fallbackValidations++;
    console.log(`${colors.magenta}[FALLBACK] ${requestId}: Using local validation${colors.reset}`);
  }
  
  // Check for service unavailable
  if (LOG_PATTERNS.serviceUnavailable.test(line)) {
    stats.serviceUnavailable++;
    console.log(`${colors.bright}${colors.red}[SERVICE DOWN] Auth service unavailable!${colors.reset}`);
  }
}

// Check for alert conditions
function checkAlerts() {
  const recentErrorCount = stats.recentErrors.length;
  
  if (recentErrorCount >= CONFIG.alertThreshold) {
    console.log(
      `${colors.bright}${colors.red}ALERT: ${recentErrorCount} auth errors in the last ${
        CONFIG.timeWindowMs / 1000
      } seconds${colors.reset}`
    );
    
    // Display summary of affected endpoints
    console.log(`${colors.bright}Affected endpoints:${colors.reset}`);
    Object.entries(stats.authErrorsByEndpoint)
      .sort((a, b) => b[1] - a[1]) // Sort by count, descending
      .slice(0, 5) // Top 5
      .forEach(([endpoint, count]) => {
        console.log(`  ${endpoint}: ${count} errors`);
      });
  }
}

// Save statistics to file
function saveStatistics() {
  const statsFilePath = path.join(CONFIG.logPath, 'auth-stats.json');
  
  stats.lastUpdate = new Date();
  stats.uptimeSeconds = Math.floor((stats.lastUpdate - stats.startTime) / 1000);
  
  fs.writeFileSync(
    statsFilePath,
    JSON.stringify(stats, null, 2),
    { encoding: 'utf8' }
  );
  
  console.log(`${colors.green}Statistics saved to ${statsFilePath}${colors.reset}`);
}

// Display statistics summary
function displayStatsSummary() {
  const uptimeMinutes = Math.floor((new Date() - stats.startTime) / 60000);
  
  console.clear();
  console.log('==== Authentication Monitor Statistics ====');
  console.log(`Uptime: ${uptimeMinutes} minutes`);
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Auth Errors: ${stats.authErrors}`);
  console.log(`Current Error Rate: ${((stats.authErrors / Math.max(stats.totalRequests, 1)) * 100).toFixed(2)}%`);
  console.log(`Max Concurrent Validations: ${stats.maxConcurrentValidations}`);
  console.log(`Fallback Validations: ${stats.fallbackValidations}`);
  console.log(`Service Unavailable Count: ${stats.serviceUnavailable}`);
  console.log('=========================================');
}

// Main function to monitor log file
async function monitorLogFile() {
  ensureLogDir();
  const logFilePath = getLogFilePath();
  
  // Create empty log file if it doesn't exist
  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '', { encoding: 'utf8' });
    console.log(`${colors.yellow}Created empty log file: ${logFilePath}${colors.reset}`);
  }
  
  console.log(`${colors.green}Starting authentication monitor...${colors.reset}`);
  console.log(`${colors.green}Monitoring log file: ${logFilePath}${colors.reset}`);
  
  // Set up file watcher
  let currentPosition = fs.statSync(logFilePath).size;
  
  // Save stats periodically
  setInterval(saveStatistics, CONFIG.saveStatsIntervalMs);
  
  // Display stats summary periodically
  setInterval(displayStatsSummary, 10000); // Every 10 seconds
  
  // Main monitoring loop
  setInterval(() => {
    try {
      const stats = fs.statSync(logFilePath);
      const newSize = stats.size;
      
      if (newSize > currentPosition) {
        // File has grown, process new content
        const stream = fs.createReadStream(logFilePath, {
          start: currentPosition,
          end: newSize - 1,
          encoding: 'utf8'
        });
        
        const rl = readline.createInterface({
          input: stream,
          crlfDelay: Infinity
        });
        
        rl.on('line', line => {
          processLogLine(line);
        });
        
        rl.on('close', () => {
          currentPosition = newSize;
          checkAlerts();
        });
      } else if (newSize < currentPosition) {
        // File has been truncated/rotated
        console.log(`${colors.yellow}Log file was truncated or rotated${colors.reset}`);
        currentPosition = 0;
      }
    } catch (error) {
      console.error(`${colors.red}Error monitoring log file:${colors.reset}`, error);
    }
  }, CONFIG.watchIntervalMs);
}

// Program entry point
if (require.main === module) {
  monitorLogFile().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = {
  processLogLine, // Export for testing
  checkAlerts,
  saveStatistics,
  stats
};
