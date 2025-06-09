/**
 * Report controller for handling API requests related to reports
 */

const reportService = require('../services/report.service');

/**
 * Create a new report from an analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createReport = async (req, res) => {
  try {
    const { analysisId, title, description, isPublic, expiryDays } = req.body;
    const userId = req.user.id;
    
    // Validate required parameters
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Analysis ID is required'
        }
      });
    }
    
    // Create options object from request body
    const options = {
      title,
      description,
      isPublic,
      expiryDays
    };
    
    // Create the report
    const report = await reportService.createReport(userId, analysisId, options);
    
    // Return the created report
    return res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error(`Error creating report: ${error.message}`);
    
    // Handle specific errors
    if (error.message.includes('Error fetching analysis data')) {
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
        message: 'An error occurred while creating the report'
      }
    });
  }
};

/**
 * Get report by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { accessCode } = req.query;
    
    // Get report by ID
    const report = await reportService.getReportById(id, userId, accessCode);
    
    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error(`Error retrieving report: ${error.message}`);
    
    // Handle specific errors
    if (error.message.includes('Report not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'The specified report was not found'
        }
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this report'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the report'
      }
    });
  }
};

/**
 * Get all reports for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all reports for the user
    const reports = await reportService.getUserReports(userId);
    
    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error(`Error retrieving user reports: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving reports'
      }
    });
  }
};

/**
 * Download report file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { accessCode } = req.query;
    
    // Get report file
    const reportFile = await reportService.getReportFile(id, userId, accessCode);
    
    // Set headers for file download
    res.setHeader('Content-Type', reportFile.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportFile.fileName}"`);
    
    // Stream the file to the response
    reportFile.stream.pipe(res);
  } catch (error) {
    console.error(`Error downloading report: ${error.message}`);
    
    // Handle specific errors
    if (error.message.includes('Report not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'The specified report was not found'
        }
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this report'
        }
      });
    }
    
    if (error.message.includes('Report file not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'The report file could not be found'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while downloading the report'
      }
    });
  }
};

/**
 * Update report sharing settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateReportSharing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { isPublic, accessCode, expiryDays } = req.body;
    
    // Update report sharing settings
    const updatedReport = await reportService.updateReportSharing(id, userId, {
      isPublic,
      accessCode,
      expiryDays
    });
    
    return res.status(200).json({
      success: true,
      data: updatedReport
    });
  } catch (error) {
    console.error(`Error updating report sharing: ${error.message}`);
    
    // Handle specific errors
    if (error.message.includes('Report not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'The specified report was not found'
        }
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to modify this report'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating report sharing settings'
      }
    });
  }
};

/**
 * Delete a report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Delete the report
    await reportService.deleteReport(id, userId);
    
    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error(`Error deleting report: ${error.message}`);
    
    // Handle specific errors
    if (error.message.includes('Report not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'The specified report was not found'
        }
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this report'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while deleting the report'
      }
    });
  }
};

module.exports = {
  createReport,
  getReport,
  getUserReports,
  downloadReport,
  updateReportSharing,
  deleteReport
};
