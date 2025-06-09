/**
 * Updates the questionnaire service index.js file to use our enhanced client wrapper
 * for better circuit breaker handling.
 */
const fs = require('fs');
const path = require('path');

// Path to index.js file to update
const indexPath = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'index.js');

// Read the current index.js file
console.log(`Reading file: ${indexPath}`);
let content = fs.readFileSync(indexPath, 'utf8');

// Add the import for our enhanced client wrapper
const oldImports = `const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
const config = require('./config/config');`;

const newImports = `const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
const config = require('./config/config');
const { authServiceClient } = require('./utils/enhanced-client-wrapper');
const EventEmitter = require('events');

// Set up global event emitter if it doesn't exist
if (!global.processEventEmitter) {
  global.processEventEmitter = new EventEmitter();
  process.eventEmitter = global.processEventEmitter;
}`;

let updatedContent = content.replace(oldImports, newImports);

// Add circuit breaker event listeners after winston configuration
const oldLogger = `// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});`;

const newLogger = `// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize circuit breaker event handling
if (process.eventEmitter) {
  process.eventEmitter.on('circuit-open', (data) => {
    logger.warn(\`[ALERT] Circuit breaker opened for service: \${data.service}\`);
    if (data.service === 'auth-service') {
      process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'true';
      logger.warn('[WARNING] Using fallback token validation mode due to auth service unavailability');
    }
  });
  
  process.eventEmitter.on('circuit-close', (data) => {
    logger.info(\`[INFO] Circuit breaker closed for service: \${data.service}\`);
    if (data.service === 'auth-service') {
      process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'false';
      logger.info('[OK] Resuming normal token validation - auth service available');
    }
  });
}`;

updatedContent = updatedContent.replace(oldLogger, newLogger);

// Add health check endpoint that reports circuit breaker status
const oldHealthCheck = `// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});`;

const newHealthCheck = `// Health check endpoint
app.get('/health', (req, res) => {
  // Check auth service circuit breaker status
  const authCircuitStatus = authServiceClient.isAuthCircuitOpen ? 
    authServiceClient.isAuthCircuitOpen() : 
    process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED === 'true';
  
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    circuitBreakers: {
      authService: {
        status: authCircuitStatus ? 'open' : 'closed',
        fallbackMode: process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED === 'true'
      }
    }
  });
});`;

updatedContent = updatedContent.replace(oldHealthCheck, newHealthCheck);

// Write the updated content back to the file
console.log(`Writing updated index.js to: ${indexPath}`);
fs.writeFileSync(indexPath, updatedContent);

console.log('Questionnaire service index.js updated successfully.');
