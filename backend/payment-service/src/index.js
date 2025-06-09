const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
const config = require('./config/config');

// Import routes
const planRoutes = require('./routes/plan.routes');
const paymentRoutes = require('./routes/payment.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const usageRoutes = require('./routes/usage.routes');
const enterpriseRoutes = require('./routes/enterprise.routes');
const healthRoutes = require('./routes/health.routes');

// Create Express app
const app = express();
const port = config.app.port;
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

// Middleware
app.use(cors());

// Special handling for Stripe webhook endpoint
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    // Raw body for Stripe webhook signature verification
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Register health routes
app.use('/api/health', healthRoutes);

// Register routes
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/enterprise', enterpriseRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: err.message || 'Internal server error'
    }
  });
});

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
const server = app.listen(port, () => {
  logger.info(`Payment service listening on port ${port}`);
});

module.exports = app; // Export for testing
