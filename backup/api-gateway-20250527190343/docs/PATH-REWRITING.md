# API Gateway Path Rewriting

This document describes the standardized path rewriting system implemented in the API Gateway.

## Overview

The Risk Assessment App uses a microservices architecture where the API Gateway serves as the entry point for all client requests. The API Gateway routes these requests to the appropriate backend services using path-based routing.

Path rewriting is a critical component of this system, ensuring requests are correctly transformed from the external API paths that clients use to the internal paths that each service expects.

## Path Rewriting Configuration

The path rewriting configuration is centralized in two key files:

### 1. `src/config/path-rewrite.config.js`

This file contains:

- Service-specific path configurations
- External path prefixes (e.g., `/api/auth/`, `/api/questionnaires/`)
- Internal path prefixes (e.g., `/`, `/templates`)
- Parameterized path mapping rules
- The `generatePathRewrite` function that creates path rewrite rules for a given service

### 2. `src/config/service-url.config.js`

This file contains:

- Service URL resolution logic
- Environment variable lookup for service URLs
- Default URLs fallbacks

## Implementation

For each service in the API Gateway:

1. Path rewriting rules are generated using the standardized configuration
2. The proxy middleware applies these rules when forwarding requests
3. This ensures consistency across all service integrations

## Validation

The system includes:

1. A validation script (`backend/api-gateway/scripts/validate-path-mappings.js`) to verify path mappings
2. Integration tests to ensure proper routing behavior (`tests/integration/suites/path-rewriting.test.js`)

## Adding a New Service

To add a new service with path rewriting:

1. Add a new service entry to `path-rewrite.config.js` following the existing pattern
2. Define the external prefix (e.g., `/api/new-service/`) and internal prefix
3. Add any parameterized paths if needed
4. Update the API Gateway's index.js to use the new service with the standardized configuration:

```javascript
const newServiceProxy = createServiceProxy({
  serviceName: 'new-service-name',
  serviceUrl: serviceUrls.newService,
  pathRewrite: 'newService', // Use the service identifier from path-rewrite.config.js
  timeout: 30000 // Configure as needed
});

// Then register the routes
app.use('/api/new-service', verifyToken, apiLimiter, newServiceProxy);
```

## Testing Path Mappings

To test path mappings:

1. Run the validation script:
   ```
   node backend/api-gateway/scripts/validate-path-mappings.js
   ```

2. Run integration tests:
   ```
   npm run test:integration -- --grep "Path Rewriting"
   ```

## Troubleshooting

If a service is not receiving requests correctly:

1. Check the `path-rewrite.config.js` to ensure the service has the correct external and internal prefixes
2. Use the validation script to test the specific path mapping
3. Review the API Gateway logs for any errors in path transformation
4. Verify that the service route is registered correctly in `index.js`
5. Try the `/api/health` endpoint of the service to ensure it's running

## Best Practices

1. Always use the standardized configuration system rather than ad-hoc path rewriting
2. Keep external paths consistent with RESTful practices
3. Test path rewrites thoroughly before deploying
4. Document any special path handling requirements
5. Be careful with path order in the API Gateway's index.js, as more specific paths should come before general ones
