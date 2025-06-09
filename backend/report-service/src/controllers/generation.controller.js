/**
 * Report generation controller
 * Automatically generates reports from completed analyses
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const winston = require('winston');
const config = require('../config/config');
const pdfService = require('../services/pdf.service');

const prisma = new PrismaClient();

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
 * Automatically generate a report from a completed analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateReport = async (req, res) => {
  try {
    const { analysisId, userId } = req.body;
    
    logger.info(`Received request to generate report for analysis ID ${analysisId} (User: ${userId})`);
    
    // First check if a report already exists for this analysis
    const existingReport = await prisma.report.findFirst({
      where: {
        analysisId: analysisId
      }
    });
    
    if (existingReport) {
      logger.info(`Report already exists for analysis ${analysisId}, returning existing report ID ${existingReport.id}`);
      return res.status(200).json({
        success: true,
        data: {
          reportId: existingReport.id,
          message: 'Report already exists for this analysis'
        }
      });
    }
    
    // Fetch the analysis data from the analysis service
    logger.info(`Fetching analysis data for ID ${analysisId}`);
    const analysisData = await fetchAnalysisData(analysisId);
    
    if (!analysisData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: 'The analysis data could not be retrieved'
        }
      });
    }
    
    logger.info(`Successfully fetched analysis data for ID ${analysisId}`);
    
    // Generate a report
    const reportData = {
      title: `${analysisData.framework} Risk Assessment Report`,
      userId: userId,
      analysisId: analysisId,
      status: 'completed',
      score: analysisData.score,
      summary: analysisData.summary || 'Risk assessment analysis summary not available',
      recommendations: analysisData.recommendations || [],
      criticalIssues: analysisData.criticalIssuesCount || 0,
      highIssues: analysisData.highIssuesCount || 0,
      mediumIssues: analysisData.mediumIssuesCount || 0,
      framework: analysisData.framework,
      createdAt: new Date(),
      completedAt: new Date()
    };
    
    // Create the report in the database
    logger.info(`Creating report in database for analysis ${analysisId}`);
    const report = await prisma.report.create({
      data: reportData
    });
    
    // Store issues if they're provided
    if (analysisData.issues && analysisData.issues.length > 0) {
      const issuePromises = analysisData.issues.map(issue => {
        return prisma.reportIssue.create({
          data: {
            reportId: report.id,
            title: issue.title,
            description: issue.description,
            severity: issue.severity,
            framework: issue.framework,
            control: issue.control
          }
        });
      });
      
      await Promise.all(issuePromises);
      logger.info(`Created ${analysisData.issues.length} issues for report ${report.id}`);
    }
    
    // Generate PDF asynchronously (don't wait for it to complete)
    pdfService.generateReportPdf(report.id)
      .then(() => {
        logger.info(`PDF generated successfully for report ${report.id}`);
      })
      .catch(error => {
        logger.error(`Error generating PDF for report ${report.id}: ${error.message}`);
      });
    
    res.status(201).json({
      success: true,
      data: {
        reportId: report.id,
        message: 'Report generated successfully'
      }
    });
    
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while generating the report'
      }
    });
  }
};

/**
 * Fetch analysis data from the analysis service
 * @param {number} analysisId - ID of the analysis to fetch
 * @returns {Promise<Object>} - Analysis data
 */
const fetchAnalysisData = async (analysisId) => {
  try {
    const response = await axios.get(
      `${config.services.analysis}/api/analysis/${analysisId}`,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      }
    );
    
    if (response.status === 200 && response.data.success) {
      return response.data.data;
    }
    
    logger.error(`Failed to fetch analysis data: Status ${response.status}`);
    return null;
  } catch (error) {
    logger.error(`Error fetching analysis data: ${error.message}`);
    return null;
  }
};

module.exports = {
  generateReport
};
