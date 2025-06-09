# API Gateway Port Mismatch Fix

## Issue Identified
The API Gateway container was being marked as unhealthy due to a port mismatch:

1. The API Gateway service was configured to run on port 5050 in the code:
   ```javascript
   // From backend/api-gateway/src/index.js
   const port = process.env.PORT || 5050;
   ```

2. However, the Docker Compose file was mapping port 5000:
   ```yaml
   ports:
     - "5000:5000"
   ```

3. The Docker health check was looking for the service on port 5000:
   ```yaml
   healthcheck:
     test: ["CMD", "wget", "--spider", "-q", "http://localhost:5000/health"]
   ```

This mismatch caused the health check to fail, marking the container as unhealthy and triggering repeated restarts.

## Fix Applied
The fix adds a `PORT` environment variable to the API Gateway service in docker-compose.yml to ensure the service runs on port 5000 internally, which aligns with:
- The port exposed by Docker (5000)
- The port used by the health check (5000)

## How to Apply the Changes
To apply the changes, restart the services with:
```bash
docker-compose down && docker-compose up -d
```

This will ensure that the API Gateway listens on the correct port and passes the health check.
