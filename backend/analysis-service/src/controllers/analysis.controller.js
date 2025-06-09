/**
 * Analysis controller for handling API requests related to risk analysis
 */

const analysisService = require('../services/analysis.service');

/**
 * Create a new analysis from a questionnaire submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createAnalysis = async (req, res) => {
  try {
    const { submissionId } = req.body;
    const userId = req.user.id;
    
    // Validate required parameters
    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Submission ID is required'
        }
      });
    }
    
    // Process the submission and create analysis
    const analysis = await analysisService.analyzeSubmission(submissionId, userId);
    
    // Return the created analysis
    return res.status(201).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error(`Error creating analysis: ${error.message}`);
    
    // Handle specific errors
    if (error.message.includes('Submission not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBMISSION_NOT_FOUND',
          message: 'The specified questionnaire submission was not found'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating the analysis'
      }
    });
  }
};

/**
 * Get analysis by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get analysis by ID
    const analysis = await analysisService.getAnalysisById(id);
    
    // Check if user has access to this analysis
    if (analysis.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this analysis'
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error(`Error retrieving analysis: ${error.message}`);
    
    // Handle specific errors
    if (error.message.includes('Analysis not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: 'The specified analysis was not found'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the analysis'
      }
    });
  }
};

/**
 * Get all analyses for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserAnalyses = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all analyses for the user
    const analyses = await analysisService.getUserAnalyses(userId);
    
    return res.status(200).json({
      success: true,
      data: analyses
    });
  } catch (error) {
    console.error(`Error retrieving user analyses: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving analyses'
      }
    });
  }
};

module.exports = {
  createAnalysis,
  getAnalysis,
  getUserAnalyses
};
