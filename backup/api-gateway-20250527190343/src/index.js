const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { expressjwt } = require('express-jwt');
const { v4: uuidv4 } = require('uuid');

// Import middleware modules
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { verifyToken } = require('./middlewares/auth.middleware');
const { validateJsonBody } = require('./middlewares/validation.middleware');
const { requestContextMiddleware, requestLogger, responseLogger, logger } = require('./middlewares/logging.middleware');
const { createServiceProxy } = require('./middlewares/proxy.middleware');
const { checkSessionInactivity } = require('./middlewares/session-inactivity.middleware');
const { 
  apiLimiter, 
  authLimiter, 
  reportLimiter, 
  analysisLimiter, 
  healthLimiter 
} = require('./middlewares/rate-limit.middleware');
const { 
  shortCache, 
  mediumCache, 
  longCache, 
  templateCache, 
  reportsListCache, 
  analysisCache 
} = require('./middlewares/cache.middleware');

// Import service URL configuration utility
const serviceUrlConfig = require('./config/service-url.config');

// Create Express app
const app = express();
const port = process.env.PORT || 5050;

// Basic middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(requestContextMiddleware); // Add request ID and context
app.use(express.json({ limit: '2mb' })); // Parse JSON requests with size limit
app.use(express.urlencoded({ extended: true, limit: '2mb' })); // URL-encoded parsing
app.use(validateJsonBody); // Handle JSON parsing errors
app.use(requestLogger); // Log incoming requests
app.use(responseLogger); // Log outgoing responses

// Import routes
const healthRoutes = require('./routes/health.routes');
const securityRoutes = require('./routes/security.routes');
const authRoutes = require('./routes/auth.routes');

// Register health routes with rate limiting - available at both /health and /api/health for compatibility
app.use('/health', healthLimiter, healthRoutes);
app.use('/api/health', healthLimiter, healthRoutes);
app.use('/api/auth/health', healthLimiter, healthRoutes);
app.use('/api/questionnaires/health', healthLimiter, healthRoutes);
app.use('/api/payments/health', healthLimiter, healthRoutes);
app.use('/api/analysis/health', healthLimiter, healthRoutes);
app.use('/api/reports/health', healthLimiter, healthRoutes);

// Get the service URL function from config
const { getServiceUrl } = serviceUrlConfig;

// Service URLs from environment with standardized resolution
const serviceUrls = {
  auth: getServiceUrl('AUTH', 'http://auth-service:5001'),
  questionnaire: getServiceUrl('QUESTIONNAIRE', 'http://questionnaire-service:5002'),
  payment: getServiceUrl('PAYMENT', 'http://payment-service:5003/api'),
  analysis: getServiceUrl('ANALYSIS', 'http://analysis-service:5004/api'),
  report: getServiceUrl('REPORT', 'http://report-service:5005/api'),
  plans: serviceUrlConfig.plans || 'http://localhost:5055/api'
};

// Log service URLs for debugging
logger.info('Configured service URLs:', {
  auth: serviceUrls.auth,
  questionnaire: serviceUrls.questionnaire,
  payment: serviceUrls.payment,
  analysis: serviceUrls.analysis,
  report: serviceUrls.report
});

// Create service proxies with enhanced error handling and standardized path rewrites
const authServiceProxy = createServiceProxy({
  serviceName: 'auth-service',
  serviceUrl: serviceUrls.auth,
  pathRewrite: 'auth', // Use standardized path rewrite rules
  timeout: 120000 // Increased timeout for auth operations (2 minutes)
});

const questionnaireServiceProxy = createServiceProxy({
  serviceName: 'questionnaire-service',
  serviceUrl: serviceUrls.questionnaire,
  pathRewrite: 'questionnaire', // Use standardized path rewrite rules
  timeout: 30000
});

const paymentServiceProxy = createServiceProxy({
  serviceName: 'payment-service',
  serviceUrl: serviceUrls.payment,
  pathRewrite: 'payment', // Use standardized path rewrite rules
  timeout: 30000 // Payment operations might take longer
});

// Dedicated proxy for plans endpoint with specific path rewriting
const plansServiceProxy = createServiceProxy({
  serviceName: 'plans-service',
  serviceUrl: serviceUrls.plans, // Using dedicated plans service URL
  pathRewrite: 'plans', // Use standardized path rewrite rules
  timeout: 30000
});

const analysisServiceProxy = createServiceProxy({
  serviceName: 'analysis-service',
  serviceUrl: serviceUrls.analysis,
  pathRewrite: 'analysis', // Use standardized path rewrite rules
  timeout: 60000 // Analysis operations might take longer
});

const reportServiceProxy = createServiceProxy({
  serviceName: 'report-service',
  serviceUrl: serviceUrls.report,
  pathRewrite: 'report', // Use standardized path rewrite rules
  timeout: 60000 // Report generation might take longer
});

// API routes with rate limiting and caching
app.use('/api/auth', authLimiter, authRoutes); // Use auth routes with validation

// Special handling for diagnostic endpoints - needs to be registered BEFORE other questionnaire routes
// No auth check for diagnostics to allow proper health monitoring
app.use('/api/questionnaires/diagnostic', apiLimiter, (req, res, next) => {
  // Debug logging for diagnostic requests
  logger.info(`Diagnostic request: ${req.method} ${req.originalUrl}`);
  
  try {
    // Get just the path part after /api/questionnaires/diagnostic
    let targetPath = req.path;
    
    // If it's empty, make it a root slash
    if (!targetPath || targetPath === '/') targetPath = '/';
    
    // Rewrite the URL to point directly to the questionnaire service diagnostic endpoint
    req.url = targetPath;
    
    logger.info(`Rewriting diagnostic URL: ${req.originalUrl} -> ${req.url}`);
    
    // Forward to the proxy
    questionnaireServiceProxy(req, res, next);
  } catch (error) {
    logger.error('Error rewriting diagnostic URL:', error);
    next(error);
  }
});

// Specific questionnaire templates route with appropriate caching for public access
app.use('/api/questionnaires/templates', apiLimiter, templateCache, questionnaireServiceProxy);

// Specific questionnaire submissions route
app.use('/api/questionnaires/submissions', checkSessionInactivity, verifyToken, apiLimiter, questionnaireServiceProxy);

// General questionnaire routes - must be registered last to avoid catching more specific routes
app.use('/api/questionnaires', checkSessionInactivity, verifyToken, apiLimiter, questionnaireServiceProxy);

// Payment service routes with rate limiting
app.use('/api/payments/plans', apiLimiter, mediumCache, paymentServiceProxy); // Public plans access
app.use('/api/plans', apiLimiter, mediumCache, plansServiceProxy); // Alternative public plans access using dedicated proxy
app.use('/api/payments', checkSessionInactivity, verifyToken, apiLimiter, paymentServiceProxy);
app.use('/api/invoices', checkSessionInactivity, verifyToken, apiLimiter, shortCache, paymentServiceProxy);

// Usage-based billing routes - handled by the payment service
const usageServiceProxy = createServiceProxy({
  serviceName: 'usage-service',
  serviceUrl: serviceUrls.payment, // Using payment service URL since it handles usage billing
  pathRewrite: 'usage', // Use standardized path rewrite rules
  timeout: 30000
});

app.use('/api/usage', checkSessionInactivity, verifyToken, apiLimiter, usageServiceProxy);

// Analysis routes with specific rate limiting for resource-intensive operations
app.use('/api/analysis', checkSessionInactivity, verifyToken, analysisLimiter, analysisCache, analysisServiceProxy);

// Benchmark routes - part of the analysis service
const benchmarkServiceProxy = createServiceProxy({
  serviceName: 'benchmark-service',
  serviceUrl: serviceUrls.analysis,
  pathRewrite: 'benchmark', // Use standardized path rewrite rules
  timeout: 60000 // Benchmark operations might take longer
});

app.use('/api/benchmarks', checkSessionInactivity, verifyToken, analysisLimiter, analysisCache, benchmarkServiceProxy);

// Rules routes - part of the analysis service
const rulesServiceProxy = createServiceProxy({
  serviceName: 'rules-service',
  serviceUrl: serviceUrls.analysis,
  pathRewrite: 'rules', // Use standardized path rewrite rules
  timeout: 60000 // Rules operations might take longer
});

app.use('/api/rules', checkSessionInactivity, verifyToken, analysisLimiter, analysisCache, rulesServiceProxy);

// Report routes with specific rate limiting for resource-intensive operations
app.use('/api/reports/generate', checkSessionInactivity, verifyToken, reportLimiter, reportServiceProxy);
app.use('/api/reports', checkSessionInactivity, verifyToken, apiLimiter, reportsListCache, reportServiceProxy);

// Apply session inactivity check to any other authenticated routes for consistent timeout enforcement
app.use('/api/profiles', checkSessionInactivity, verifyToken, apiLimiter, shortCache, authServiceProxy);
app.use('/api/users', checkSessionInactivity, verifyToken, apiLimiter, shortCache, authServiceProxy);
app.use('/api/organizations', checkSessionInactivity, verifyToken, apiLimiter, shortCache, authServiceProxy);

// Security routes with admin access control
app.use('/api/security', securityRoutes);

// API Documentation route with long-lived cache
app.get('/api-docs', longCache, (req, res) => {
  res.status(200).json({
    success: true, 
    data: { 
      message: 'API Documentation will be available here',
      version: process.env.API_VERSION || '1.0.0'
    }
  });
});

// Handle 404 errors for undefined routes
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

// Start the server
app.listen(port, () => {
  logger.info(`API Gateway listening on port ${port}`, {
    port,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || '1.0.0'
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // Perform graceful shutdown
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise });
  // Perform graceful shutdown
  process.exit(1);
});

module.exports = app; // Export for testing
