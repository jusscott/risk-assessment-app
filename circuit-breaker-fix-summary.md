# Circuit Breaker and Service Connectivity Fix

## Problem Overview

After restarting all containers, several critical services were unable to restart properly:

- Circuit breaker service not starting
- API Gateway not starting
- Analysis service not starting
- Questionnaire service not starting
- Report service not starting

## Root Causes

After investigation, we identified multiple related issues:

1. **Circuit Breaker Lockout**: The circuit breakers were stuck in an open state due to previous connection failures, preventing services from communicating with each other.

2. **API Gateway Configuration Issues**:
   - Missing Axios dependency needed for health checks
   - Redis connection problems in the rate-limiting middleware
   - Incompatible Redis client versions

3. **Service Dependency Order**: Services were attempting to start without their dependencies being available, causing cascading failures.

## Solution Implemented

We created three scripts to address these issues:

### 1. `fix-api-gateway-dependencies.js`

This script resolves API Gateway dependency issues:

- Adds the missing Axios dependency
- Updates Redis client to a compatible version
- Creates a centralized Redis configuration module
- Updates the rate-limiting middleware to use the new Redis config
- Adds a robust health check endpoint to monitor service status

### 2. `reset-circuit-breakers.js`

This script resets the circuit breakers across all services:

- Resets circuit breaker state files
- Updates circuit breaker configuration to be more permissive
- Modifies timeout and threshold settings to prevent premature circuit opening
- Fixes service URL configurations for proper connectivity
- Performs Docker container cleanup

### 3. `fix-all-services.sh`

This script orchestrates the fix process:

- Makes the other scripts executable
- Executes the API Gateway dependency fixes
- Resets all circuit breakers
- Stops all services for a clean slate
- Restarts services in the correct dependency order:
  1. Redis
  2. Auth Service
  3. API Gateway
  4. Circuit Breaker Service
  5. Questionnaire Service
  6. Payment Service
  7. Analysis Service
  8. Report Service
  9. Frontend
- Verifies service health status

## How It Works

The solution works by addressing the fundamental issues that were causing the services to fail:

1. **Dependency Resolution**: Ensures all required libraries are available and properly configured.

2. **Circuit Breaker Reset**: Forces all circuit breakers to close, allowing services to attempt connections again.

3. **Ordered Startup**: Ensures each service is only started after its dependencies are confirmed running.

4. **Health Verification**: Adds monitoring endpoints to verify service health and detect problems early.

## Preventative Measures

To prevent similar issues in the future, we've implemented:

1. **More Resilient Circuit Breaker Configuration**: Adjusted thresholds to be more tolerant of temporary network issues.

2. **Centralized Redis Configuration**: Created a shared Redis config module to ensure consistent Redis connectivity.

3. **Enhanced Health Monitoring**: Added detailed health check endpoints to quickly identify service issues.

4. **Proper Service Startup Order**: Documented and enforced the correct service startup sequence.

## Usage Instructions

To fix service connectivity issues:

```bash
# Make the scripts executable
chmod +x fix-api-gateway-dependencies.js fix-all-services.sh reset-circuit-breakers.js

# Run the comprehensive fix script
./fix-all-services.sh
```

For manual fixes to specific services, you can run:

```bash
# Fix API Gateway dependencies only
node fix-api-gateway-dependencies.js

# Reset circuit breakers only
node reset-circuit-breakers.js
```
