#!/bin/bash

# Install js-yaml if not already installed
if ! npm list js-yaml --depth=0 > /dev/null 2>&1; then
  echo "Installing js-yaml dependency..."
  npm install --no-save js-yaml
  if [ $? -ne 0 ]; then
    echo "Failed to install js-yaml. Please install it manually with: npm install js-yaml"
    exit 1
  fi
fi

# Run the fix script
echo "Running API Gateway port fix script..."
node fix-api-gateway-port.js

# Check if script executed successfully
if [ $? -eq 0 ]; then
  echo -e "\n\nFix completed successfully."
  
  # Create a summary file
  cat > api-gateway-port-fix-summary.md << 'EOL'
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
EOL

  echo "A detailed summary has been saved to: api-gateway-port-fix-summary.md"
  echo "To apply the changes, run: docker-compose down && docker-compose up -d"
else
  echo "Fix script failed. Please check the error messages above."
  exit 1
fi
