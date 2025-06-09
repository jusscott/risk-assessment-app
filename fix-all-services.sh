#!/bin/bash

# fix-all-services.sh
# This script fixes the issues with all services by:
# 1. Fixing API Gateway dependencies
# 2. Resetting circuit breakers
# 3. Restarting services in the correct order

set -e  # Exit on error

# Color setup for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Log messages with colors
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Project root directory
PROJECT_ROOT=$(pwd)

log_info "Starting service recovery process..."
log_info "Project directory: $PROJECT_ROOT"

# Make scripts executable
log_info "Making fix scripts executable..."
chmod +x "$PROJECT_ROOT/fix-api-gateway-dependencies.js"
chmod +x "$PROJECT_ROOT/reset-circuit-breakers.js"
if [ -f "$PROJECT_ROOT/fix-api-gateway.sh" ]; then
  chmod +x "$PROJECT_ROOT/fix-api-gateway.sh"
fi
log_success "Scripts made executable"

# Fix API Gateway dependencies
log_info "Fixing API Gateway dependencies..."
node "$PROJECT_ROOT/fix-api-gateway-dependencies.js"
log_success "API Gateway dependencies fixed"

# Reset circuit breakers
log_info "Resetting circuit breakers..."
node "$PROJECT_ROOT/reset-circuit-breakers.js"
log_success "Circuit breakers reset"

# Stop all services to clean state
log_info "Stopping all services to ensure clean state..."
docker-compose down
log_success "All services stopped"

# Start services in proper dependency order
log_info "Starting services in dependency order..."

# Start Redis first
log_info "Starting Redis..."
docker-compose up -d redis
sleep 5
log_success "Redis started"

# Start auth service
log_info "Starting Auth service..."
docker-compose up -d auth-service
sleep 5
log_success "Auth service started"

# Start API Gateway
log_info "Starting API Gateway..."
docker-compose up -d api-gateway
sleep 5
log_success "API Gateway started"

# Start circuit breaker service
log_info "Starting Circuit Breaker service..."
docker-compose up -d circuit-breaker
sleep 5
log_success "Circuit Breaker service started"

# Start questionnaire service
log_info "Starting Questionnaire service..."
docker-compose up -d questionnaire-service
sleep 5
log_success "Questionnaire service started"

# Start payment service
log_info "Starting Payment service..."
docker-compose up -d payment-service
sleep 5
log_success "Payment service started"

# Start analysis service
log_info "Starting Analysis service..."
docker-compose up -d analysis-service
sleep 5
log_success "Analysis service started"

# Start report service
log_info "Starting Report service..."
docker-compose up -d report-service
sleep 5
log_success "Report service started"

# Start frontend
log_info "Starting Frontend..."
docker-compose up -d frontend
sleep 5
log_success "Frontend started"

# Verify services are running
log_info "Verifying all services are running..."
docker-compose ps

# Check if any services are not "Up"
if docker-compose ps | grep -v "Up"; then
  log_warning "Some services may not be running correctly. Check status above."
else
  log_success "All services are running!"
fi

# Check API Gateway health
log_info "Checking API Gateway health..."
curl -s http://localhost:5050/health/detailed || log_warning "Could not connect to API Gateway health endpoint"

log_success "Service recovery process completed!"
log_info "If you still experience issues, try running specific service fixes:"
log_info "- For API Gateway: ./fix-api-gateway.sh"
log_info "- For database migrations: docker-compose exec [service-name] npm run db:migrate"
log_info "- For checking logs: docker-compose logs -f [service-name]"

exit 0
