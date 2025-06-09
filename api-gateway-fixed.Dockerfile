FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY ./backend/api-gateway/package.json .
COPY ./backend/api-gateway/package-lock.json* .

# Install required dependencies
RUN npm install
RUN npm install axios redis express-rate-limit cors cookie-parser dotenv --save

# Create config directory
RUN mkdir -p /app/src/config

# Add Redis configuration file
RUN echo 'const redis = require("redis"); \
const client = redis.createClient({ url: process.env.REDIS_URL || "redis://redis:6379" }); \
client.on("error", (err) => console.log("Redis Client Error", err)); \
const getRedisClient = async () => { \
  if (!client.isReady) await client.connect(); \
  return client; \
}; \
const isRedisReady = () => client.isReady; \
module.exports = { getRedisClient, isRedisReady };' > /app/src/config/redis.config.js

# Copy source code
COPY ./backend/api-gateway/src ./src

# Expose the port
EXPOSE 5000

# Start the service
CMD ["node", "src/index.js"]
