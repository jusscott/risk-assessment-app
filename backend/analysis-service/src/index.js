const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
const config = require('./config/config');
const analysisRoutes = require('./routes/analysis.routes');
const healthRoutes = require('./routes/health.routes');
const benchmarkRoutes = require('./routes/benchmark.routes');
const rulesRoutes = require('./routes/rules.routes');
const webhookRoutes = require('./routes/webhook.routes');
const { initSocketTimeoutFix, shutdownSocketTimeoutFix } = require('./utils/socket-timeout-fix');
const { initReportServiceConnection } = require('./utils/webhook-socket-integration');

// Create Express app
const app = express();
const port = config.port;
const prisma = new PrismaClient();

// Configure logger
const logger = winston.createLogger({
  level: config.logging.level,
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

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'Internal server error'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Analysis service is running' });
});

// API routes
app.use(`${config.api.prefix}/analysis`, analysisRoutes);
app.use(`${config.api.prefix}/health`, healthRoutes);
app.use(`${config.api.prefix}/benchmarks`, benchmarkRoutes);
app.use(`${config.api.prefix}/rules`, rulesRoutes);
app.use(`${config.api.prefix}/webhooks`, webhookRoutes);

// Catch 404 errors
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
});

// Start the server
const server = app.listen(port, () => {
  logger.info(`Analysis service listening on port ${port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  
  // Initialize socket timeout fix
  initSocketTimeoutFix();
  logger.info('WebSocket timeout handling initialized');
  
  // Initialize report service connection
  initReportServiceConnection();
  logger.info('Report service WebSocket connection initialized');
  
  // WebSocket Recovery Logic
  const serviceHealthMonitor = {
    reportServiceHealthy: false,
    
    async checkReportServiceHealth() {
      try {
        const response = await fetch(`${process.env.REPORT_SERVICE_URL || 'http://report-service:3005'}/health`);
        this.reportServiceHealthy = response.ok;
        return this.reportServiceHealthy;
      } catch (error) {
        logger.warn('Report service health check failed:', error.message);
        this.reportServiceHealthy = false;
        return false;
      }
    },

    async recoverWebSocketConnections() {
      if (this.reportServiceHealthy && global.io) {
        logger.info('🔄 Recovering WebSocket connections...');
        global.io.emit('service-recovery', {
          service: 'report-service',
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
      }
    },

    startMonitoring() {
      setInterval(async () => {
        const wasHealthy = this.reportServiceHealthy;
        const isHealthy = await this.checkReportServiceHealth();
        
        if (!wasHealthy && isHealthy) {
          logger.info('✅ Report service recovered, triggering WebSocket recovery');
          await this.recoverWebSocketConnections();
        }
      }, 10000); // Check every 10 seconds
    }
  };

  // Start monitoring after server setup
  serviceHealthMonitor.startMonitoring();
  logger.info('WebSocket recovery monitoring started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  // Shutdown socket timeout fix components
  shutdownSocketTimeoutFix();
  logger.info('WebSocket timeout handling shutdown');
  
  // Close database connection
  await prisma.$disconnect();
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  
  // Shutdown socket timeout fix components
  shutdownSocketTimeoutFix();
  logger.info('WebSocket timeout handling shutdown');
  
  // Close database connection
  await prisma.$disconnect();
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app; // Export for testing
