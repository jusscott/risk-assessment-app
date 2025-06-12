#!/usr/bin/env node

/**
 * Fix Script: Analysis-Service WebSocket Integration Issue
 * 
 * This script fixes the continuous 404 errors by disabling the WebSocket integration
 * in analysis-service and configuring it to use HTTP-only communication with report-service.
 */

const fs = require('fs').promises;
const path = require('path');

async function fixAnalysisServiceWebSocketIssue() {
  console.log('🔧 FIXING ANALYSIS-SERVICE WEBSOCKET INTEGRATION ISSUE');
  console.log('=' .repeat(80));
  
  try {
    // Step 1: Update analysis-service index.js to disable WebSocket integration
    console.log('\n📝 Step 1: Updating analysis-service index.js...');
    const indexPath = path.join(__dirname, 'backend/analysis-service/src/index.js');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    
    // Remove WebSocket integration imports and initialization
    const updatedIndexContent = indexContent
      .replace(/const { initSocketTimeoutFix, shutdownSocketTimeoutFix } = require\('\.\/utils\/socket-timeout-fix'\);?\s*/g, '')
      .replace(/const { initReportServiceConnection } = require\('\.\/utils\/webhook-socket-integration'\);?\s*/g, '')
      .replace(/\/\/ Initialize socket timeout fix\s*\n\s*initSocketTimeoutFix\(\);\s*\n\s*logger\.info\('WebSocket timeout handling initialized'\);\s*/g, '')
      .replace(/\/\/ Initialize report service connection\s*\n\s*initReportServiceConnection\(\);\s*\n\s*logger\.info\('Report service WebSocket connection initialized'\);\s*/g, '')
      .replace(/\/\/ Shutdown socket timeout fix components\s*\n\s*shutdownSocketTimeoutFix\(\);\s*\n\s*logger\.info\('WebSocket timeout handling shutdown'\);\s*/g, '')
      .replace(/\/\/ WebSocket Recovery Logic[\s\S]*?logger\.info\('WebSocket recovery monitoring started'\);\s*/g, '');
    
    await fs.writeFile(indexPath, updatedIndexContent);
    console.log('✅ Updated analysis-service index.js - removed WebSocket integration');
    
    // Step 2: Update webhook-socket-integration.js to use HTTP-only communication
    console.log('\n📝 Step 2: Converting webhook-socket-integration.js to HTTP-only...');
    const webhookPath = path.join(__dirname, 'backend/analysis-service/src/utils/webhook-socket-integration.js');
    
    const httpOnlyWebhookContent = `/**
 * HTTP-Only Report Service Integration - Analysis Service
 * 
 * Provides HTTP-based communication with the report service instead of WebSocket.
 * This fixes the 404 errors caused by trying to connect to non-existent WebSocket endpoints.
 */

const axios = require('axios');
const analysisService = require('../services/analysis.service');
const config = require('../config/config');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: config.logging.level || 'info',
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

// Analysis task queue
const analysisQueue = [];
let isProcessingQueue = false;

// Report service HTTP client configuration
const reportServiceClient = axios.create({
  baseURL: config.services.reportService.httpUrl || 'http://report-service:5005',
  timeout: config.connection.httpTimeout || 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Initialize HTTP-based report service communication
 * This replaces the WebSocket connection that was causing 404 errors
 */
function initReportServiceConnection() {
  logger.info('Initialized HTTP-based report service communication');
  logger.info(\`Report service URL: \${reportServiceClient.defaults.baseURL}\`);
  
  // Test connectivity to report service
  testReportServiceConnectivity();
}

/**
 * Test connectivity to report service
 */
async function testReportServiceConnectivity() {
  try {
    const response = await reportServiceClient.get('/health');
    logger.info('✅ Report service HTTP connectivity verified');
  } catch (error) {
    logger.warn(\`⚠️  Report service connectivity test failed: \${error.message}\`);
  }
}

/**
 * Queue an analysis task for processing
 * This prevents timeout issues during heavy processing
 * 
 * @param {string} submissionId - Questionnaire submission ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Analysis result
 */
async function queueAnalysisTask(submissionId, userId) {
  return new Promise((resolve, reject) => {
    // Add task to queue with callback for completion
    analysisQueue.push({
      submissionId,
      userId,
      resolve,
      reject,
      attempts: 0,
      maxAttempts: 3,
      timestamp: Date.now()
    });
    
    logger.info(\`Queued analysis task for submission \${submissionId}, queue size: \${analysisQueue.length}\`);
    
    // Start processing the queue if not already running
    if (!isProcessingQueue) {
      processAnalysisQueue();
    }
  });
}

/**
 * Process the analysis queue
 */
async function processAnalysisQueue() {
  // Exit if already processing
  if (isProcessingQueue) {
    return;
  }
  
  isProcessingQueue = true;
  
  try {
    while (analysisQueue.length > 0) {
      // Get the next task
      const task = analysisQueue.shift();
      
      // Process the task
      try {
        logger.info(\`Processing analysis task for submission \${task.submissionId} (attempt \${task.attempts + 1})\`);
        
        const analysis = await analysisService.analyzeQuestionnaire(task.submissionId, task.userId);
        
        // Task completed successfully
        logger.info(\`Analysis completed for submission \${task.submissionId}\`);
        task.resolve(analysis);
      } catch (error) {
        // Handle task failure
        logger.error(\`Error processing analysis task for submission \${task.submissionId}: \${error.message}\`);
        
        task.attempts++;
        
        if (task.attempts < task.maxAttempts) {
          // Re-queue the task with backoff
          const backoffTime = Math.min(5000 * Math.pow(2, task.attempts - 1), 60000);
          logger.info(\`Requeuing analysis task for submission \${task.submissionId} with backoff \${backoffTime}ms\`);
          
          setTimeout(() => {
            analysisQueue.push(task);
            
            // Restart queue processing if needed
            if (!isProcessingQueue) {
              processAnalysisQueue();
            }
          }, backoffTime);
        } else {
          // Max attempts reached, reject the task
          logger.error(\`Max attempts reached for submission \${task.submissionId}, giving up\`);
          task.reject(new Error(\`Failed to process analysis after \${task.maxAttempts} attempts: \${error.message}\`));
        }
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Notify report service about completed analysis using HTTP instead of WebSocket
 * This fixes the 404 WebSocket errors
 * 
 * @param {string} analysisId - Analysis ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Notification result
 */
async function notifyReportServiceWithTimeout(analysisId, userId) {
  logger.info(\`Notifying report service about completed analysis \${analysisId} via HTTP\`);
  
  const notification = {
    type: 'analysis_complete',
    analysisId,
    userId,
    timestamp: Date.now()
  };
  
  try {
    // Use HTTP POST instead of WebSocket message
    const response = await reportServiceClient.post('/api/reports/notifications', notification);
    
    logger.info(\`✅ Successfully notified report service via HTTP: \${response.status}\`);
    return { success: true, status: response.status };
    
  } catch (error) {
    // Handle different types of errors gracefully
    if (error.response) {
      // HTTP error response (404, 500, etc.)
      logger.warn(\`Report service notification failed with HTTP \${error.response.status}: \${error.response.statusText}\`);
      return { success: false, error: \`HTTP \${error.response.status}\`, details: error.response.statusText };
    } else if (error.code === 'ECONNREFUSED') {
      // Service unavailable
      logger.warn('Report service is currently unavailable for notifications');
      return { success: false, error: 'SERVICE_UNAVAILABLE', details: 'Report service connection refused' };
    } else {
      // Other network/timeout errors
      logger.warn(\`Report service notification failed: \${error.message}\`);
      return { success: false, error: 'NETWORK_ERROR', details: error.message };
    }
  }
}

/**
 * Get the status of the analysis queue and HTTP connectivity
 * 
 * @returns {Object} Status information
 */
function getQueueStatus() {
  return {
    queueSize: analysisQueue.length,
    isProcessing: isProcessingQueue,
    reportServiceUrl: reportServiceClient.defaults.baseURL,
    connectionType: 'HTTP',
    lastConnectivityCheck: new Date().toISOString()
  };
}

// Export the functions
module.exports = {
  queueAnalysisTask,
  notifyReportServiceWithTimeout,
  getQueueStatus,
  initReportServiceConnection
};
`;
    
    await fs.writeFile(webhookPath, httpOnlyWebhookContent);
    console.log('✅ Converted webhook-socket-integration.js to HTTP-only communication');
    
    // Step 3: Update analysis-service configuration to remove WebSocket URLs
    console.log('\n📝 Step 3: Updating analysis-service configuration...');
    const configPath = path.join(__dirname, 'backend/analysis-service/src/config/config.js');
    const configContent = await fs.readFile(configPath, 'utf8');
    
    const updatedConfigContent = configContent
      .replace(/wsUrl: process\.env\.REPORT_SERVICE_WS_URL \|\| 'ws:\/\/report-service:5005\/ws',?\s*/g, '')
      .replace(/\/\/ WebSocket connection configuration[\s\S]*?highPriorityBufferSize: parseInt\(process\.env\.WS_HIGH_PRIORITY_BUFFER_SIZE \|\| '50', 10\)\s*}\s*/g, '');
    
    await fs.writeFile(configPath, updatedConfigContent);
    console.log('✅ Updated analysis-service configuration - removed WebSocket settings');
    
    // Step 4: Create a simplified index.js without WebSocket integration
    console.log('\n📝 Step 4: Creating clean analysis-service index.js...');
    const cleanIndexContent = `const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
const config = require('./config/config');
const analysisRoutes = require('./routes/analysis.routes');
const healthRoutes = require('./routes/health.routes');
const benchmarkRoutes = require('./routes/benchmark.routes');
const rulesRoutes = require('./routes/rules.routes');
const webhookRoutes = require('./routes/webhook.routes');
const { initReportServiceConnection } = require('./utils/webhook-socket-integration');

// Create Express app
const app = express();
const port = config.port;
const prisma = new PrismaClient();

// Configure logger
const logger = winston.createLogger({
  level: config.logging.level,
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

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(\`Unhandled error: \${err.message}\`);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'Internal server error'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Analysis service is running' });
});

// API routes
app.use(\`\${config.api.prefix}/analysis\`, analysisRoutes);
app.use(\`\${config.api.prefix}/health\`, healthRoutes);
app.use(\`\${config.api.prefix}/benchmarks\`, benchmarkRoutes);
app.use(\`\${config.api.prefix}/rules\`, rulesRoutes);
app.use(\`\${config.api.prefix}/webhooks\`, webhookRoutes);

// Catch 404 errors
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
});

// Start the server
const server = app.listen(port, () => {
  logger.info(\`Analysis service listening on port \${port}\`);
  logger.info(\`Environment: \${config.nodeEnv}\`);
  
  // Initialize HTTP-based report service communication
  initReportServiceConnection();
  logger.info('HTTP-based report service communication initialized');
  
  // Report service health monitoring (HTTP-based)
  const serviceHealthMonitor = {
    reportServiceHealthy: false,
    
    async checkReportServiceHealth() {
      try {
        const axios = require('axios');
        const response = await axios.get(\`\${config.services.reportService.httpUrl}/health\`, { timeout: 5000 });
        this.reportServiceHealthy = response.status === 200;
        return this.reportServiceHealthy;
      } catch (error) {
        logger.debug(\`Report service health check: \${error.message}\`);
        this.reportServiceHealthy = false;
        return false;
      }
    },

    startMonitoring() {
      setInterval(async () => {
        const wasHealthy = this.reportServiceHealthy;
        const isHealthy = await this.checkReportServiceHealth();
        
        if (!wasHealthy && isHealthy) {
          logger.info('✅ Report service recovered and available via HTTP');
        } else if (wasHealthy && !isHealthy) {
          logger.warn('⚠️  Report service health check failed');
        }
      }, 30000); // Check every 30 seconds (less frequent than before)
    }
  };

  // Start monitoring after server setup
  serviceHealthMonitor.startMonitoring();
  logger.info('HTTP-based service health monitoring started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  // Close database connection
  await prisma.$disconnect();
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  
  // Close database connection
  await prisma.$disconnect();
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app; // Export for testing
`;
    
    await fs.writeFile(indexPath, cleanIndexContent);
    console.log('✅ Created clean analysis-service index.js without WebSocket integration');
    
    // Step 5: Restart the analysis service to apply changes
    console.log('\n📝 Step 5: Restarting analysis-service to apply changes...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      console.log('🔄 Restarting analysis-service container...');
      await execAsync('cd risk-assessment-app && docker-compose restart analysis-service');
      console.log('✅ Analysis-service restarted successfully');
      
      // Wait a moment for service to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.log(`⚠️  Could not restart analysis-service automatically: ${error.message}`);
      console.log('Please run: cd risk-assessment-app && docker-compose restart analysis-service');
    }
    
    console.log('\n🎉 ANALYSIS-SERVICE WEBSOCKET ISSUE FIX COMPLETED!');
    console.log('=' .repeat(80));
    
    console.log('\n✅ CHANGES APPLIED:');
    console.log('1. ✅ Removed WebSocket integration from analysis-service');
    console.log('2. ✅ Converted to HTTP-only communication with report-service');
    console.log('3. ✅ Updated configuration to remove WebSocket settings');
    console.log('4. ✅ Implemented graceful error handling for report service communication');
    console.log('5. ✅ Reduced health check frequency to avoid log spam');
    
    console.log('\n🔧 EXPECTED RESULTS:');
    console.log('• No more 404 WebSocket connection errors');
    console.log('• Analysis-service logs should be clean');
    console.log('• HTTP-based communication with report-service');
    console.log('• Graceful handling when report service is unavailable');
    
    console.log('\n📋 VERIFICATION STEPS:');
    console.log('1. Check analysis-service logs: docker-compose logs analysis-service --tail=20');
    console.log('2. Verify no more WebSocket 404 errors');
    console.log('3. Test analysis service health: curl http://localhost:5004/health');
    
  } catch (error) {
    console.error('\n❌ Error applying fixes:', error.message);
    throw error;
  }
}

// Run the fix
fixAnalysisServiceWebSocketIssue()
  .then(() => {
    console.log('\n✅ Fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });
