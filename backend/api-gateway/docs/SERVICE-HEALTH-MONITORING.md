# Centralized Service Health Monitoring

## Overview

The Risk Assessment Application now includes a centralized service health monitoring system that provides comprehensive insights into the health and performance of all microservices. This system collects detailed metrics from each service, integrates with the circuit breaker system, and presents a unified view of system health.

## Features

### 1. Comprehensive Health Checks

The system provides multiple levels of health checks:

- **Basic Health Checks**: Simple checks to verify if services are responding
- **Detailed Health Checks**: In-depth checks that include metrics and component status
- **Circuit Breaker Integration**: Health status includes circuit breaker information
- **Component-Level Metrics**: Specific metrics for databases, caches, and other components

### 2. Centralized Dashboard

A unified dashboard provides administrators with a complete view of system health:

- Overall system status
- Status of each individual service
- Circuit breaker status
- Detailed performance metrics
- Historical health data

### 3. Service-Specific Monitoring

Each service can be monitored individually with detailed metrics:

- Response times
- Resource utilization
- Database connections
- Cache hit rates
- Custom metrics specific to each service

### 4. Access Control

Health monitoring endpoints are secured with appropriate access controls:

- Basic health endpoints are publicly accessible for monitoring tools
- Detailed health information requires authentication
- Admin dashboard and advanced features require admin privileges

## Endpoints

### Public Endpoints

These endpoints are publicly accessible for basic monitoring:

- `GET /api/health`: Basic API Gateway health check
- `GET /api/health/deep`: Deep health check across all services
- `GET /api/health/system`: Centralized system health overview

### Service-Specific Endpoints

Each service has its own health check endpoint:

- `GET /api/health/services/{service-name}`: Health check for a specific service
- `GET /api/health/metrics/{service-name}/{component}`: Metrics for a specific component

### Admin Endpoints

These endpoints require admin privileges:

- `GET /api/security/health-dashboard`: Admin dashboard with comprehensive health data
- `GET /api/security/circuit-status`: Circuit breaker status for all services
- `POST /api/health/reset-cache`: Reset health monitoring caches

## Integration with Monitoring Tools

The health monitoring system is designed to work with external monitoring tools:

- Supports standard HTTP status codes for automated monitoring
- Provides JSON responses that can be parsed by monitoring tools
- Consistent response format across all endpoints

## Implementation Details

### Health Data Format

Health responses follow a consistent format:

```json
{
  "success": true,
  "status": "healthy", // can be "healthy", "degraded", or "unhealthy"
  "data": {
    "timestamp": "2025-05-25T22:09:22.000Z",
    "servicesTotal": 6,
    "servicesHealthy": 5,
    "servicesDegraded": 1,
    "servicesUnhealthy": 0,
    "services": {
      "api-gateway": {
        "name": "api-gateway",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": "2025-05-25T22:09:22.000Z"
      },
      "auth-service": {
        "name": "auth-service",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": "2025-05-25T22:09:21.000Z",
        "metrics": {
          // Service-specific metrics
        },
        "circuitBreaker": {
          "isOpen": false,
          "metrics": {
            // Circuit breaker metrics
          }
        }
      },
      // Other services...
    }
  }
}
```

### Circuit Breaker Integration

The health monitoring system integrates with the circuit breaker system:

- Shows current circuit status (open or closed)
- Includes circuit metrics (failure rates, success counts)
- Monitors recovery attempts

### Caching Strategy

To prevent excessive load from health checks:

- Health data is cached for a short period (default: 10 seconds)
- Cache can be bypassed with the `bypassCache=true` query parameter
- Admins can reset the cache if needed

## Using the Health Monitoring System

### For Developers

1. **Basic Service Health Check**:
   ```
   curl http://localhost:5000/api/health
   ```

2. **Check Specific Service**:
   ```
   curl http://localhost:5000/api/health/services/auth-service
   ```

3. **Get Detailed Metrics**:
   ```
   curl http://localhost:5000/api/health/metrics/auth-service/database
   ```

### For Administrators

1. **Access Admin Dashboard** (requires admin login):
   ```
   curl -H "Authorization: Bearer {admin-token}" http://localhost:5000/api/security/health-dashboard
   ```

2. **Check Circuit Breaker Status** (requires admin login):
   ```
   curl -H "Authorization: Bearer {admin-token}" http://localhost:5000/api/security/circuit-status
   ```

3. **Reset Health Cache** (requires admin login):
   ```
   curl -X POST -H "Authorization: Bearer {admin-token}" http://localhost:5000/api/health/reset-cache
   ```

## Future Improvements

Planned enhancements for the health monitoring system:

1. Web-based admin dashboard with visualizations
2. Historical trending and anomaly detection
3. Automated alerting based on health patterns
4. Service dependency mapping and impact analysis
5. Machine learning for predictive health monitoring
