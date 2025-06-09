FROM node:16-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

# Use npm install --force to ensure all dependencies are installed
RUN npm install --force && npm install axios@1.4.0 axios-retry@3.3.1 opossum@6.4.0 --save

COPY . .

RUN npx prisma generate

EXPOSE 5002

# Copy and make the entrypoint script executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Use the entrypoint script instead of direct npm start
ENTRYPOINT ["/app/entrypoint.sh"]
