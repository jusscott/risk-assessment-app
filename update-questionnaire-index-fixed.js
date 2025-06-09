/**
 * Updates the questionnaire service index.js file to use our enhanced client wrapper
 * for better circuit breaker handling.
 */
const fs = require('fs');
const path = require('path');

// Path to index.js file to update
const indexPath = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'index.js');

// Read the current index.js file
console.log('Reading file: ' + indexPath);
let content = fs.readFileSync(indexPath, 'utf8');

// Add the import for our enhanced client wrapper
let updatedContent = content.replace(
  `const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
const config = require('./config/config');`,
  
  `const express = require('express');
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
}`
);

// Add circuit breaker event listeners after winston configuration
updatedContent = updatedContent.replace(
  `// Configure logger
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
});`,

  `// Configure logger
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
  process.eventEmitter.on('circuit-open', function(data) {
    logger.warn('[ALERT] Circuit breaker opened for service: ' + data.service);
    if (data.service === 'auth-service') {
      process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'true';
      logger.warn('[WARNING] Using fallback token validation mode due to auth service unavailability');
    }
  });
  
  process.eventEmitter.on('circuit-close', function(data) {
    logger.info('[INFO] Circuit breaker closed for service: ' + data.service);
    if (data.service === 'auth-service') {
      process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'false';
      logger.info('[OK] Resuming normal token validation - auth service available');
    }
  });
}`
);

// Add health check endpoint that reports circuit breaker status
updatedContent = updatedContent.replace(
  `// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});`,

  `// Health check endpoint
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
});`
);

// Write the updated content back to the file
console.log('Writing updated index.js to: ' + indexPath);
fs.writeFileSync(indexPath, updatedContent);

console.log('Questionnaire service index.js updated successfully.');
