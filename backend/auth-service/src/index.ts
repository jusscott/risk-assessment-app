import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';

// Initialize Prisma client with better logging for connection issues
export const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' }
  ]
});

// Log Prisma errors
prisma.$on('error', (e) => {
  console.error('Prisma client error:', e);
});

// Log Prisma warnings
prisma.$on('warn', (e) => {
  console.warn('Prisma client warning:', e);
});

// Database connection state
let isDbConnected = false;

// Initialize Express application
const app: Application = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',  // Allow requests from any origin in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-user-id', 'x-user-role', 'Access-Control-Allow-Headers']
})); // Enhanced CORS configuration
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '25mb' })); // JSON parsing with increased size limit
app.use(express.urlencoded({ extended: true, limit: '25mb' })); // URL-encoded parsing

// Increase request timeout
app.use((req, res, next) => {
  res.setTimeout(120000, () => { 
    console.error('Request timeout exceeded');
    res.status(408).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timeout exceeded'
      }
    });
  });
  next();
});

// Database connection check middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Skip health check endpoint from database check
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  try {
    if (!isDbConnected) {
      // Try to connect to database
      await prisma.$queryRaw`SELECT 1`;
      isDbConnected = true;
    }
    next();
  } catch (error) {
    console.error('Database connection error in middleware:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Database service is currently unavailable'
      }
    });
  }
});

// Register health routes first (keep at root level for Docker health checks)  
app.use('/', healthRoutes);

// Routes - mount auth routes at root since API Gateway strips /api/auth prefix
app.use('/', authRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler with more detailed logging and error classification
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let errorCode = 'SERVER_ERROR';
  let errorMessage = 'An error occurred processing your request';
  
  // Prisma specific error handling
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle known Prisma errors
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        errorCode = 'RESOURCE_CONFLICT';
        errorMessage = 'Resource already exists with this identifier';
        break;
      case 'P2025':
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
        errorMessage = 'Resource not found';
        break;
      case 'P2000':
      case 'P2001':
      case 'P2006':
        statusCode = 400;
        errorCode = 'INVALID_INPUT';
        errorMessage = 'Invalid input data provided';
        break;
      default:
        // Connection-related errors
        if (err.code.startsWith('P1')) {
          statusCode = 503;
          errorCode = 'DATABASE_ERROR';
          errorMessage = 'Database service currently unavailable';
          isDbConnected = false;
        }
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = 'Validation error in request data';
  } else if (err instanceof Prisma.PrismaClientRustPanicError || 
             err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    errorMessage = 'Service is currently unavailable';
    isDbConnected = false;
  }
  
  console.error('Error processing request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers,
    error: err.message,
    errorCode,
    statusCode,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Formalized error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage
    }
  });
});

/**
 * Initializes the database connection with retry logic
 */
async function initializeDatabaseConnection() {
  let retries = 5;
  const retryDelay = 5000; // 5 seconds between retries
  
  while (retries > 0) {
    try {
      console.log(`Attempting database connection (${retries} retries left)...`);
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbConnected = true;
      console.log('Database connection established successfully');
      break;
    } catch (error) {
      retries--;
      console.error(`Failed to connect to database. ${retries} retries left.`, error);
      
      if (retries === 0) {
        console.error('Maximum connection attempts reached. Starting server anyway.');
        break;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Start server
let server: any;

async function startServer() {
  // Try to establish initial database connection
  await initializeDatabaseConnection();
  
  server = app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
    console.log(`Database connection status: ${isDbConnected ? 'Connected' : 'Not connected'}`);
  });
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // Log additional details that might help with debugging
  console.error('Promise:', promise);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  
  // Try to disconnect DB before exiting
  prisma.$disconnect().finally(() => {
    process.exit(1);
  });
});

// Periodic check to see if database connection is alive and attempt reconnection if needed
setInterval(async () => {
  if (!isDbConnected) {
    try {
      console.log('Attempting to reconnect to database...');
      await prisma.$queryRaw`SELECT 1`;
      isDbConnected = true;
      console.log('Database reconnection successful');
    } catch (error) {
      console.error('Database reconnection failed:', error);
    }
  }
}, 30000); // Check every 30 seconds

export default app;
