const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
const config = require('./config/config');

// Import routes
const reportRoutes = require('./routes/reports.routes');
const healthRoutes = require('./routes/health.routes');
const generationRoutes = require('./routes/generation.routes');

// Create Express app
const app = express();
const port = config.port;
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
  res.status(200).json({ status: 'OK', message: 'Report service is running' });
});

// API routes
app.use(`${config.api.prefix}/reports`, reportRoutes);
app.use(`${config.api.prefix}/health`, healthRoutes);
app.use(`${config.api.prefix}/reports`, generationRoutes); // Register generation routes under /reports

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
app.listen(port, () => {
  logger.info(`Report service listening on port ${port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info('Automatic report generation is enabled');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app; // Export for testing
