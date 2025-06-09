/**
 * Configuration settings for the report service
 */

require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 5005,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL
  },
  
  // JWT configuration for authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'report-service-development-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  
  // API configuration
  api: {
    prefix: '/api'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Service URLs for inter-service communication
  services: {
    analysis: process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:5004',
    auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:5001/api'
  },
  
  // Report configuration
  reports: {
    // PDF generation options
    pdf: {
      defaultFontSize: 12,
      titleFontSize: 18,
      subtitleFontSize: 14,
      margin: {
        top: 50,
        bottom: 50,
        left: 60,
        right: 60
      }
    },
    
    // Storage configuration (where to store generated reports)
    storage: {
      type: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
      local: {
        path: process.env.LOCAL_STORAGE_PATH || './reports'
      },
      s3: {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION,
        accessKey: process.env.S3_ACCESS_KEY,
        secretKey: process.env.S3_SECRET_KEY
      }
    },
    
    // Share configuration (how long links are valid, etc.)
    share: {
      defaultExpiryDays: 7,
      accessCodeLength: 8
    }
  }
};

module.exports = config;
