/**
 * WebSocket Timeout Fix - Analysis Service Integration
 * 
 * Integrates the generic WebSocket timeout fix with Analysis Service-specific
 * functions for handling analysis tasks and report service notifications.
 */

const { 
  createConnection, 
  sendMessage, 
  closeConnection,
  getStatus
} = require('./socket-timeout-fix');
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

// Report service WebSocket connection
const REPORT_SERVICE_CONN_ID = 'report-service';
let reportServiceConnected = false;

/**
 * Initialize connection to report service
 */
function initReportServiceConnection() {
  const reportServiceUrl = config.services.reportService.wsUrl || 
    `ws://${config.services.reportService.host}:${config.services.reportService.port}/ws`;

  // Create connection with automatic reconnect
  createConnection(REPORT_SERVICE_CONN_ID, reportServiceUrl, {
    onOpen: () => {
      logger.info('Connected to report service WebSocket');
      reportServiceConnected = true;
    },
    onClose: () => {
      logger.info('Disconnected from report service WebSocket');
      reportServiceConnected = false;
    },
    onError: (error) => {
      logger.error(`Report service WebSocket error: ${error.message}`);
      reportServiceConnected = false;
    },
    onMessage: (data) => {
      logger.debug('Received message from report service:', data);
      // Handle any responses from report service if needed
    }
  });
}

/**
 * Queue an analysis task for processing
 * This prevents WebSocket timeouts during heavy processing
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
 * Notify report service about completed analysis with timeout protection
 * 
 * @param {string} analysisId - Analysis ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function notifyReportServiceWithTimeout(analysisId, userId) {
  // Ensure connection to report service
  if (!reportServiceConnected) {
    initReportServiceConnection();
    
    // Wait for connection to establish
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (reportServiceConnected) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!reportServiceConnected) {
          logger.warn('Timed out waiting for report service connection');
          resolve();
        }
      }, 10000);
    });
  }
  
  // Send the notification with high priority
  logger.info(`Notifying report service about completed analysis ${analysisId}`);
  
  const message = {
    type: 'analysis_complete',
    analysisId,
    userId,
    timestamp: Date.now()
  };
  
  // Use the WebSocket timeout fix to send the message with high priority
  sendMessage(REPORT_SERVICE_CONN_ID, message, { priority: 'high' });
  
  // Log connection status
  const status = getStatus(REPORT_SERVICE_CONN_ID);
  logger.debug(`Report service connection status:`, status);
  
  return { success: true };
}

/**
 * Get the status of the analysis queue and WebSocket connections
 * 
 * @returns {Object} Status information
 */
function getQueueStatus() {
  return {
    queueSize: analysisQueue.length,
    isProcessing: isProcessingQueue,
    reportServiceConnected,
    webSocketStatus: getStatus()
  };
}

// Export the functions
module.exports = {
  queueAnalysisTask,
  notifyReportServiceWithTimeout,
  getQueueStatus,
  initReportServiceConnection
};
