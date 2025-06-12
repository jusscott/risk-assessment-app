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
  
  // Initialize HTTP-based report service communication
  initReportServiceConnection();
  logger.info('HTTP-based report service communication initialized');
  
  // Report service health monitoring (HTTP-based)
  const serviceHealthMonitor = {
    reportServiceHealthy: false,
    
    async checkReportServiceHealth() {
      try {
        const axios = require('axios');
        const response = await axios.get(`${config.services.reportService.httpUrl}/health`, { timeout: 5000 });
        this.reportServiceHealthy = response.status === 200;
        return this.reportServiceHealthy;
      } catch (error) {
        logger.debug(`Report service health check: ${error.message}`);
        this.reportServiceHealthy = false;
        return false;
      }
    },

    startMonitoring() {
      setInterval(async () => {
        const wasHealthy = this.reportServiceHealthy;
        const isHealthy = await this.checkReportServiceHealth();
        
        if (!wasHealthy && isHealthy) {
          logger.info('✅ Report service recovered and available via HTTP');
        } else if (wasHealthy && !isHealthy) {
          logger.warn('⚠️  Report service health check failed');
        }
      }, 30000); // Check every 30 seconds (less frequent than before)
    }
  };

  // Start monitoring after server setup
  serviceHealthMonitor.startMonitoring();
  logger.info('HTTP-based service health monitoring started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
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
  
  // Close database connection
  await prisma.$disconnect();
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app; // Export for testing
