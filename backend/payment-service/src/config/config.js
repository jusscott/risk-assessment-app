// Configuration for the payment service
const config = {
  app: {
    port: process.env.PORT || 5003,
    env: process.env.NODE_ENV || 'development',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_your_test_key',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_webhook_secret',
    currency: process.env.STRIPE_CURRENCY || 'usd',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:5001/api',
  },
};

module.exports = config;
