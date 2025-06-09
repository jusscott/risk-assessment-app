/**
* Service URL configuration utility
 * Provides standardized handling of service URLs
 */

/**
 * Simple logger for testing purposes
 * Can be replaced with winston in production code
 */
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

/**
 * Get standardized service URL with proper path handling
 * @param {string} serviceName - Name of the service
 * @param {string} defaultUrl - Default URL if environment variable not set
 * @returns {string} Properly formatted service URL
 */
function getServiceUrl(serviceName, defaultUrl) {
  const envVarName = `${serviceName.toUpperCase()}_SERVICE_URL`;
  const url = process.env[envVarName] || defaultUrl;

  logger.info(`Configuring ${serviceName} service URL: ${url}`);
  return url;
}

module.exports = {
  getServiceUrl,
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5003/api',
  plans: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5003/api'};
