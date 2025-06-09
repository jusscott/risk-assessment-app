const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
const config = require('./config/config');
const EventEmitter = require('events');

// Safely initialize event emitter system without potential duplication issues
try {
  // Clean up any existing event emitters to prevent memory leaks
  if (global.processEventEmitter) {
    global.processEventEmitter.removeAllListeners();
  }
  
  // Create fresh event emitter
  global.processEventEmitter = new EventEmitter();
  // Set maximum listeners to avoid memory leak warnings
  global.processEventEmitter.setMaxListeners(20);
  process.eventEmitter = global.processEventEmitter;
  
  console.log('Successfully initialized event emitter system');
} catch (err) {
  console.error('Error initializing event emitter:', err);
}

// Import the auth service client after event emitter setup
let authServiceClient;
try {
  const enhancedClientWrapper = require('./utils/enhanced-client-wrapper');
  authServiceClient = enhancedClientWrapper.authServiceClient;
} catch (error) {
  console.error('Error importing enhanced client wrapper:', error);
  // Create fallback auth service client
  authServiceClient = {
    isAuthCircuitOpen: () => false,
    getAuthServiceStatus: () => 'unknown'
  };
}
let authServiceClient;
try {
  const enhancedClientWrapper = require('./utils/enhanced-client-wrapper');
  authServiceClient = enhancedClientWrapper.authServiceClient;
} catch (error) {
  console.error('Error importing enhanced client wrapper:', error);
  // Create fallback auth service client
  authServiceClient = {
    isAuthCircuitOpen: () => false,
    getAuthServiceStatus: () => 'unknown'
  };
}
// Original import replaced with try/catch version above

// Import routes
const templateRoutes = require('./routes/template.routes');
const submissionRoutes = require('./routes/submission.routes');
const healthRoutes = require('./routes/health.routes');
const diagnosticRoutes = require('./routes/diagnostic.routes');
const enhancedDiagnosticRoutes = require('./routes/enhanced-diagnostic.routes');

// Create Express app
const app = express();
const port = config.port;
const prisma = new PrismaClient();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
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

// Initialize circuit breaker event handling
if (process.eventEmitter) {
  process.eventEmitter.on('circuit-open', function(data) {
    logger.warn('[ALERT] Circuit breaker opened for service: ' + data.service);
    if (data.service === 'auth-service') {
      process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'true';
      logger.warn('[WARNING] Using fallback token validation mode due to auth service unavailability');
    }
  });
  
  process.eventEmitter.on('circuit-close', function(data) {
    logger.info('[INFO] Circuit breaker closed for service: ' + data.service);
    if (data.service === 'auth-service') {
      process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED = 'false';
      logger.info('[OK] Resuming normal token validation - auth service available');
    }
  });
}

// Configure global error handling
const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(err.stack);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};

// Configure CORS middleware
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// Middleware
// Health check endpoint
app.get('/health', (req, res) => {
  // Check auth service circuit breaker status using the shared global state
  const authCircuitStatus = authServiceClient && typeof authServiceClient.isAuthCircuitOpen === 'function' ? 
    authServiceClient.isAuthCircuitOpen() : 
    (process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED === 'true');
  
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    circuitBreakers: {
      authService: {
        status: authCircuitStatus ? 'open' : 'closed',
        fallbackMode: process.env.CIRCUIT_BREAKER_FALLBACK_ENABLED === 'true'
      }
    }
  });
});

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Register health routes
app.use('/api/health', healthRoutes);

// API routes - removing the /api prefix to match with API Gateway path rewriting
app.use('/templates', templateRoutes);
app.use('/submissions', submissionRoutes);
app.use('/diagnostic', diagnosticRoutes);
app.use('/diagnostic', enhancedDiagnosticRoutes);

// Register routes with /api prefix for redundancy
app.use('/api/templates', templateRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/diagnostic', enhancedDiagnosticRoutes);

// Log registered routes for debugging
logger.info('Registered routes:');
logger.info('- GET /templates - Get all questionnaire templates');
logger.info('- GET /templates/:id - Get template by ID');
logger.info('- POST /templates - Create new template (admin only)');
logger.info('- GET /submissions - Get user submissions');
logger.info('- GET /diagnostic/status - Get diagnostic information');
logger.info('- POST /diagnostic/reset-database - Reset and reseed database (admin only)');
logger.info('- POST /diagnostic/provision-default-template - Create default template if none exist');
logger.info('- GET /diagnostic/database - Test database connectivity');
logger.info('- GET /diagnostic/templates-count - Get templates count');
logger.info('- GET /diagnostic/submissions-count - Get submissions count');
logger.info('- GET /diagnostic/user-info - Get authenticated user info');
logger.info('- GET /diagnostic/system-health - Comprehensive system health');
logger.info('- GET /diagnostic/full-diagnostic - Full diagnostic report');

// Error handling middleware
app.use(errorHandler);

// Start the server
const server = app.listen(port, () => {
  logger.info(`Questionnaire service listening on port ${port}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app; // Export for testing
