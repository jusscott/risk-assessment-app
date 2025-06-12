/**
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
  logger.info(`Report service URL: ${reportServiceClient.defaults.baseURL}`);
  
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
    logger.warn(`⚠️  Report service connectivity test failed: ${error.message}`);
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
    
    logger.info(`Queued analysis task for submission ${submissionId}, queue size: ${analysisQueue.length}`);
    
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
        logger.info(`Processing analysis task for submission ${task.submissionId} (attempt ${task.attempts + 1})`);
        
        const analysis = await analysisService.analyzeQuestionnaire(task.submissionId, task.userId);
        
        // Task completed successfully
        logger.info(`Analysis completed for submission ${task.submissionId}`);
        task.resolve(analysis);
      } catch (error) {
        // Handle task failure
        logger.error(`Error processing analysis task for submission ${task.submissionId}: ${error.message}`);
        
        task.attempts++;
        
        if (task.attempts < task.maxAttempts) {
          // Re-queue the task with backoff
          const backoffTime = Math.min(5000 * Math.pow(2, task.attempts - 1), 60000);
          logger.info(`Requeuing analysis task for submission ${task.submissionId} with backoff ${backoffTime}ms`);
          
          setTimeout(() => {
            analysisQueue.push(task);
            
            // Restart queue processing if needed
            if (!isProcessingQueue) {
              processAnalysisQueue();
            }
          }, backoffTime);
        } else {
          // Max attempts reached, reject the task
          logger.error(`Max attempts reached for submission ${task.submissionId}, giving up`);
          task.reject(new Error(`Failed to process analysis after ${task.maxAttempts} attempts: ${error.message}`));
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
  logger.info(`Notifying report service about completed analysis ${analysisId} via HTTP`);
  
  const notification = {
    type: 'analysis_complete',
    analysisId,
    userId,
    timestamp: Date.now()
  };
  
  try {
    // Use HTTP POST instead of WebSocket message
    const response = await reportServiceClient.post('/api/reports/notifications', notification);
    
    logger.info(`✅ Successfully notified report service via HTTP: ${response.status}`);
    return { success: true, status: response.status };
    
  } catch (error) {
    // Handle different types of errors gracefully
    if (error.response) {
      // HTTP error response (404, 500, etc.)
      logger.warn(`Report service notification failed with HTTP ${error.response.status}: ${error.response.statusText}`);
      return { success: false, error: `HTTP ${error.response.status}`, details: error.response.statusText };
    } else if (error.code === 'ECONNREFUSED') {
      // Service unavailable
      logger.warn('Report service is currently unavailable for notifications');
      return { success: false, error: 'SERVICE_UNAVAILABLE', details: 'Report service connection refused' };
    } else {
      // Other network/timeout errors
      logger.warn(`Report service notification failed: ${error.message}`);
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
