/**
 * Service URL configuration utility
 * Handles service discovery and URL resolution for different environments
 */

const logger = require('winston');

/**
 * Get service URL with environment-specific resolution
 * @param {string} envKey - Environment variable key (e.g., 'AUTH_SERVICE_URL')
 * @param {string} defaultUrl - Default URL to use if env var not set
 * @returns {string} Resolved service URL
 */
const getServiceUrl = (envKey, defaultUrl) => {
  // Check for explicit environment variable
  const envUrl = process.env[`${envKey}_SERVICE_URL`] || process.env[envKey];
  
  if (envUrl) {
    logger.info(`Using service URL from environment: ${envKey} = ${envUrl}`);
    return envUrl;
  }
  
  // Use default URL
  logger.info(`Using default service URL: ${envKey} = ${defaultUrl}`);
  return defaultUrl;
};

/**
 * Service URL mappings with Docker-aware defaults
 */
const serviceUrls = {
  auth: getServiceUrl('AUTH', 'http://auth-service:5001'),
  questionnaire: getServiceUrl('QUESTIONNAIRE', 'http://questionnaire-service:5002'),
  payment: getServiceUrl('PAYMENT', 'http://payment-service:5003'),
  analysis: getServiceUrl('ANALYSIS', 'http://analysis-service:5004'),
  report: getServiceUrl('REPORT', 'http://report-service:5005')
};

// Export the configuration
module.exports = {
  getServiceUrl,
  serviceUrls,
  // Legacy support
  auth: serviceUrls.auth,
  questionnaire: serviceUrls.questionnaire,
  payment: serviceUrls.payment,
  analysis: serviceUrls.analysis,
  report: serviceUrls.report,
  plans: serviceUrls.payment // Plans are handled by payment service
};
