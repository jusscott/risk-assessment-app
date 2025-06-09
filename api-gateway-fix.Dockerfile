FROM risk-assessment-app-api-gateway:latest

# Install required dependencies
RUN npm install axios --save
RUN npm install redis --save
RUN npm install express-rate-limit cors cookie-parser dotenv --save

# Create config directory if it doesn't exist
RUN mkdir -p /app/src/config

# Add Redis configuration file
RUN echo 'const redis = require("redis"); \
const client = redis.createClient({ url: process.env.REDIS_URL || "redis://redis:6379" }); \
client.on("error", (err) => console.log("Redis Client Error", err)); \
const getRedisClient = () => client; \
const isRedisReady = () => client.isReady; \
module.exports = { getRedisClient, isRedisReady };' > /app/src/config/redis.config.js
