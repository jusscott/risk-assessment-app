import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5001,
  jwt: {
    secret: process.env.JWT_SECRET || 'shared-security-risk-assessment-secret-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  db: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@auth-db:5432/auth',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  passwordReset: {
    expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '1h',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
