/**
 * Report service for managing risk assessment reports
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const config = require('../config/config');
const axios = require('axios');
const pdfService = require('./pdf.service');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

/**
 * Create a new report from an analysis
 * @param {string} userId - User ID of the report owner
 * @param {number} analysisId - ID of the analysis to generate the report from
 * @param {object} options - Additional options for report generation
 * @returns {Object} - Created report record
 */
const createReport = async (userId, analysisId, options = {}) => {
  try {
    // Fetch analysis data from analysis service
    const analysisData = await fetchAnalysisData(analysisId);
    
    // Generate PDF report
    const pdfResult = await pdfService.generatePDFReport(analysisData, options);
    
    // Generate an access code for sharing (if not in options)
    const accessCode = options.accessCode || generateAccessCode();
    
    // Calculate expiry date (default or from options)
    const expiryDays = options.expiryDays || config.reports.share.defaultExpiryDays;
    const expiryDate = moment().add(expiryDays, 'days').toDate();
    
    // Create report record in the database
    const report = await prisma.report.create({
      data: {
        userId,
        analysisId: parseInt(analysisId),
        title: options.title || `Security Assessment Report - ${moment().format('MMMM D, YYYY')}`,
        description: options.description || 'Security risk assessment report based on questionnaire responses',
        filePath: pdfResult.filePath,
        fileName: pdfResult.fileName,
        accessCode,
        expiresAt: expiryDate,
        isPublic: options.isPublic || false
      }
    });
    
    return report;
  } catch (error) {
    throw new Error(`Error creating report: ${error.message}`);
  }
};

/**
 * Fetch analysis data from the analysis service
 * @param {number} analysisId - ID of the analysis to fetch
 * @returns {Object} - Analysis data
 */
const fetchAnalysisData = async (analysisId) => {
  try {
    // Add timeout and retry logic for more robust inter-service communication
    const MAX_RETRIES = 3;
    const TIMEOUT = 10000; // 10 seconds
    let retries = 0;
    let lastError = null;
    
    while (retries < MAX_RETRIES) {
      try {
        const response = await axios.get(
          `${config.services.analysis}/api/analysis/${analysisId}`,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: TIMEOUT
          }
        );

        if (!response.data.success) {
          throw new Error(`Failed to fetch analysis data: ${response.data.error?.message || 'Unknown error'}`);
        }

        return response.data.data;
      } catch (error) {
        lastError = error;
        retries++;
        
        // Only retry on network errors or 5xx server errors
        if (!error.response || (error.response.status >= 500 && error.response.status < 600)) {
          console.warn(`Retry ${retries}/${MAX_RETRIES} for analysis ID ${analysisId}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
          continue;
        }
        
        // Don't retry on client errors (4xx)
        break;
      }
    }
    
    // If we get here, all retries failed
    const errorMessage = lastError.response?.data?.error?.message || lastError.message;
    throw new Error(`Error fetching analysis data after ${MAX_RETRIES} attempts: ${errorMessage}`);
  } catch (error) {
    console.error(`Failed to fetch analysis ${analysisId}:`, error);
    throw new Error(`Error fetching analysis data: ${error.message}`);
  }
};

/**
 * Get report by ID
 * @param {number} reportId - ID of the report to fetch
 * @param {string} userId - User ID (for permission check)
 * @param {string} accessCode - Report access code (optional, for public access)
 * @returns {Object} - Report record
 */
const getReportById = async (reportId, userId, accessCode) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) }
    });
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    // Check if user has access to this report
    const hasAccess = 
      // Owner of the report
      report.userId === userId || 
      // Public report with correct access code
      (report.isPublic && report.accessCode === accessCode) ||
      // Not expired
      (report.expiresAt && new Date() <= report.expiresAt);
    
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    
    return report;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all reports for a user
 * @param {string} userId - ID of the user
 * @returns {Array} - List of report records
 */
const getUserReports = async (userId) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return reports;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a report file as a readable stream
 * @param {number} reportId - ID of the report
 * @param {string} userId - User ID (for permission check)
 * @param {string} accessCode - Report access code (optional, for public access)
 * @returns {Stream} - PDF file as a readable stream
 */
const getReportFile = async (reportId, userId, accessCode) => {
  try {
    // Get report record
    const report = await getReportById(reportId, userId, accessCode);
    
    // Check if file exists
    if (!fs.existsSync(report.filePath)) {
      throw new Error('Report file not found');
    }
    
    // Create a read stream of the file
    const fileStream = fs.createReadStream(report.filePath);
    
    return {
      stream: fileStream,
      fileName: report.fileName,
      contentType: 'application/pdf'
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update report sharing settings
 * @param {number} reportId - ID of the report to update
 * @param {string} userId - User ID (for permission check)
 * @param {Object} updateData - New sharing settings
 * @returns {Object} - Updated report record
 */
const updateReportSharing = async (reportId, userId, updateData) => {
  try {
    // Check if report exists and user has access
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) }
    });
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    if (report.userId !== userId) {
      throw new Error('Access denied');
    }
    
    // Update sharing settings
    const updatedReport = await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        isPublic: updateData.isPublic !== undefined ? updateData.isPublic : report.isPublic,
        accessCode: updateData.accessCode || report.accessCode,
        expiresAt: updateData.expiryDays ? moment().add(updateData.expiryDays, 'days').toDate() : report.expiresAt
      }
    });
    
    return updatedReport;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a report
 * @param {number} reportId - ID of the report to delete
 * @param {string} userId - User ID (for permission check)
 * @returns {boolean} - Success indicator
 */
const deleteReport = async (reportId, userId) => {
  try {
    // Check if report exists and user has access
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) }
    });
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    if (report.userId !== userId) {
      throw new Error('Access denied');
    }
    
    // Delete report record
    await prisma.report.delete({
      where: { id: parseInt(reportId) }
    });
    
    // Delete file if exists
    if (fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate a random access code for report sharing
 * @returns {String} - Random access code
 */
const generateAccessCode = () => {
  const length = config.reports.share.accessCodeLength || 8;
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
};

module.exports = {
  createReport,
  getReportById,
  getUserReports,
  getReportFile,
  updateReportSharing,
  deleteReport
};
