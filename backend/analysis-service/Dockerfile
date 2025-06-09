FROM node:16-alpine

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear npm cache and install dependencies with verbose logging
RUN npm cache clean --force && \
    npm ci --only=production --verbose

# Verify ws module installation
RUN npm list ws || (echo "WS module not found, installing directly..." && npm install ws@^8.13.0)

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Verify the installation
RUN node -e "console.log('Testing WS module...'); const WebSocket = require('ws'); console.log('✅ WS module loaded successfully');"

EXPOSE 5004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('ws')" || exit 1

CMD ["npm", "start"]