/**
 * Webhook controller for handling external service events
 */

const analysisService = require('../services/analysis.service');
const { 
  queueAnalysisTask, 
  notifyReportServiceWithTimeout, 
  getQueueStatus 
} = require('../utils/webhook-socket-integration');
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

/**
 * Process a completed questionnaire from the webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processCompletedQuestionnaire = async (req, res) => {
  try {
    const { submissionId, userId } = req.body;
    
    logger.info(`Received webhook for completed questionnaire ${submissionId} from user ${userId}`);
    
    // Validate parameters
    if (!submissionId || !userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Submission ID and User ID are required'
        }
      });
    }
    
    // Process the submission asynchronously using the queuing system
    // This prevents WebSocket timeouts during heavy processing
    queueAnalysisTask(submissionId, userId)
      .then(analysis => {
        logger.info(`Analysis ${analysis.id} completed for submission ${submissionId}`);
        
        // Trigger webhook to notify report service of completed analysis with timeout protection
        return notifyReportServiceWithTimeout(analysis.id, userId);
      })
      .catch(error => {
        logger.error(`Error processing questionnaire ${submissionId}: ${error.message}`);
        // Retry logic is now handled by the queue system
      });
    
    // Return success immediately (don't await the analysis)
    res.status(202).json({
      success: true,
      message: 'Questionnaire submission accepted for processing'
    });
    
  } catch (error) {
    logger.error(`Webhook error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while processing the webhook'
      }
    });
  }
};

/**
 * Process a completed analysis and notify report service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processCompletedAnalysis = async (req, res) => {
  try {
    const { analysisId } = req.body;
    
    logger.info(`Processing completed analysis ${analysisId}`);
    
    // Get the analysis data
    const analysis = await analysisService.getAnalysisById(analysisId);
    
    // Notify the report service to generate a report with timeout protection
    await notifyReportServiceWithTimeout(analysisId, analysis.userId);
    
    res.status(200).json({
      success: true,
      message: 'Report generation triggered successfully'
    });
    
  } catch (error) {
    logger.error(`Error processing completed analysis: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while processing the completed analysis'
      }
    });
  }
};


module.exports = {
  processCompletedQuestionnaire,
  processCompletedAnalysis
};
