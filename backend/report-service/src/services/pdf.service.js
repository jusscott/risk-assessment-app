/**
 * PDF service for generating risk assessment PDF reports
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const moment = require('moment');

/**
 * Generate a PDF report from analysis data
 * @param {Object} analysisData - Analysis data from the analysis service
 * @param {Object} options - Custom options for PDF generation
 * @returns {Promise<String>} - Path to generated PDF file
 */
const generatePDFReport = async (analysisData, options = {}) => {
  try {
    // Create a unique filename for the report
    const reportId = uuidv4();
    const timestamp = moment().format('YYYYMMDD-HHmmss');
    const fileName = `risk-assessment-${reportId}-${timestamp}.pdf`;
    
    // Determine file storage path
    const filePath = getStoragePath(fileName);
    
    // Create a PDF document
    const doc = createPDFDocument(filePath);
    
    // Generate the report content
    await populatePDFContent(doc, analysisData, options);
    
    // Return the file path and ID
    return {
      reportId,
      filePath,
      fileName
    };
  } catch (error) {
    throw new Error(`Error generating PDF report: ${error.message}`);
  }
};

/**
 * Create a PDF document for the report
 * @param {String} filePath - Path to save the PDF file
 * @returns {PDFDocument} - PDFKit document instance
 */
const createPDFDocument = (filePath) => {
  // Create a PDF document
  const doc = new PDFDocument({
    margins: config.reports.pdf.margin,
    size: 'A4'
  });
  
  // Create a write stream to the file path
  doc.pipe(fs.createWriteStream(filePath));
  
  return doc;
};

/**
 * Get appropriate storage path for the report file
 * @param {String} fileName - Name of the report file
 * @returns {String} - Full path to the report file
 */
const getStoragePath = (fileName) => {
  if (config.reports.storage.type === 'local') {
    // Create local storage directory if it doesn't exist
    const storageDir = path.resolve(config.reports.storage.local.path);
    
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    return path.join(storageDir, fileName);
  } else if (config.reports.storage.type === 's3') {
    // For S3, return temporary local path and will upload later
    const tempDir = path.resolve('./tmp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    return path.join(tempDir, fileName);
  }
};

/**
 * Populate the PDF document with analysis data
 * @param {PDFDocument} doc - PDFKit document instance
 * @param {Object} analysisData - Analysis data from the analysis service
 * @param {Object} options - Custom options for PDF generation
 */
const populatePDFContent = async (doc, analysisData, options) => {
  // Add company logo
  // doc.image('path/to/logo.png', 50, 45, { width: 100 });
  
  // Add report title
  doc.fontSize(config.reports.pdf.titleFontSize)
     .font('Helvetica-Bold')
     .text('Security Risk Assessment Report', { align: 'center' })
     .moveDown(1);
  
  // Add report generation date
  doc.fontSize(config.reports.pdf.defaultFontSize)
     .font('Helvetica')
     .text(`Generated on: ${moment().format('MMMM D, YYYY')}`, { align: 'right' })
     .moveDown(2);
  
  // Add executive summary
  doc.fontSize(config.reports.pdf.subtitleFontSize)
     .font('Helvetica-Bold')
     .text('Executive Summary', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(config.reports.pdf.defaultFontSize)
     .font('Helvetica')
     .text('This report presents the results of a security risk assessment based on the provided questionnaire responses. It outlines the current security posture, identifies areas of risk, and provides recommendations for improvement.')
     .moveDown(1);
  
  // Add overall risk score
  doc.fontSize(config.reports.pdf.subtitleFontSize)
     .font('Helvetica-Bold')
     .text('Overall Security Risk Rating', { underline: true })
     .moveDown(0.5);
  
  const riskScoreColor = getRiskScoreColor(analysisData.riskScore);
  
  doc.fontSize(16)
     .fillColor(riskScoreColor)
     .text(`${analysisData.securityLevel} (${analysisData.riskScore}/10)`, { align: 'center' })
     .fillColor('black')
     .moveDown(2);
  
  // Add risk score breakdown by area
  doc.fontSize(config.reports.pdf.subtitleFontSize)
     .font('Helvetica-Bold')
     .text('Security Area Breakdown', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(config.reports.pdf.defaultFontSize)
     .font('Helvetica');
  
  // Sort area scores from lowest to highest
  const sortedAreaScores = [...analysisData.areaScores].sort((a, b) => a.score - b.score);
  
  sortedAreaScores.forEach(areaScore => {
    const areaColor = getRiskScoreColor(areaScore.score);
    doc.text(`${areaScore.area}: `, { continued: true })
       .fillColor(areaColor)
       .text(`${areaScore.score}/10`)
       .fillColor('black');
  });
  
  doc.moveDown(2);
  
  // Add key recommendations
  doc.fontSize(config.reports.pdf.subtitleFontSize)
     .font('Helvetica-Bold')
     .text('Key Recommendations', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(config.reports.pdf.defaultFontSize)
     .font('Helvetica');
  
  // Get top 5 priority recommendations
  const topRecommendations = analysisData.recommendations
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);
  
  topRecommendations.forEach((rec, index) => {
    doc.text(`${index + 1}. ${rec.description} (${rec.category})`);
    doc.moveDown(0.5);
  });
  
  doc.moveDown(1);
  
  // Add industry benchmarking section if available
  if (analysisData.benchmarkComparisons && analysisData.benchmarkComparisons.length > 0 && analysisData.industry) {
    doc.fontSize(config.reports.pdf.subtitleFontSize)
       .font('Helvetica-Bold')
       .text('Industry Benchmarking', { underline: true })
       .moveDown(0.5);
    
    doc.fontSize(config.reports.pdf.defaultFontSize)
       .font('Helvetica')
       .text(`This section compares your security posture against industry benchmarks for ${analysisData.industry.name}.`)
       .moveDown(1);
    
    // Group benchmarks by area
    const benchmarksByArea = {};
    analysisData.benchmarkComparisons.forEach(comparison => {
      benchmarksByArea[comparison.area] = comparison;
    });
    
    // Display benchmark comparisons
    Object.keys(benchmarksByArea).forEach(area => {
      const comparison = benchmarksByArea[area];
      const benchmark = comparison.benchmark;
      
      doc.font('Helvetica-Bold')
         .text(`${area}:`)
         .font('Helvetica');
         
      // Your score vs industry average  
      doc.text(`Your Score: ${comparison.score.toFixed(1)}/10`, { indent: 20 });
      doc.text(`Industry Average: ${benchmark.averageScore.toFixed(1)}/10`, { indent: 20 });
      
      // Percentile if available
      if (comparison.percentile) {
        const percentileText = `You are in the ${comparison.percentile.toFixed(0)}th percentile`;
        doc.text(percentileText, { indent: 20 });
      }
      
      // Sample size
      doc.text(`Based on data from ${benchmark.sampleSize} organizations`, { indent: 20 });
      
      doc.moveDown(0.5);
    });
    
    doc.moveDown(1);
  }
  
  // Add detailed analysis section
  doc.fontSize(config.reports.pdf.subtitleFontSize)
     .font('Helvetica-Bold')
     .text('Detailed Analysis', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(config.reports.pdf.defaultFontSize)
     .font('Helvetica')
     .text('The following section provides a detailed analysis of each security area assessed in the questionnaire. Areas are sorted by risk level, with the most critical areas listed first.')
     .moveDown(1);
  
  // Add page number
  const totalPages = doc.bufferedPageRange().count;
  doc.on('pageAdded', () => {
    const currentPage = doc.bufferedPageRange().count;
    doc.switchToPage(currentPage - 1);
    doc.fontSize(8)
       .text(`Page ${currentPage} of ${totalPages}`, 0.5 * (doc.page.width - 100), doc.page.height - 50, {
         width: 100,
         align: 'center'
       });
  });
  
  // Finalize the PDF
  doc.end();
};

/**
 * Get color for a risk score (for visual representation)
 * @param {Number} score - Risk score value
 * @returns {String} - Hex color code
 */
const getRiskScoreColor = (score) => {
  // Define risk thresholds since they're not in config
  const riskThresholds = {
    low: 3,     // 0-3: High Risk (Red)
    medium: 6,  // 4-6: Medium Risk (Yellow)
    high: 8     // 7-8: Low Risk (Green), 9-10: Minimal Risk (Blue)
  };
  
  if (score <= riskThresholds.low) {
    return '#d9534f'; // Red - High Risk
  } else if (score <= riskThresholds.medium) {
    return '#f0ad4e'; // Yellow - Medium Risk
  } else if (score <= riskThresholds.high) {
    return '#5cb85c'; // Green - Low Risk
  } else {
    return '#5bc0de'; // Blue - Minimal Risk
  }
};

module.exports = {
  generatePDFReport
};
