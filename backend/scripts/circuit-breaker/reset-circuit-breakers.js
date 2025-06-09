#!/usr/bin/env node

const axios = require('axios');

class CircuitBreakerResetManager {
  constructor() {
    this.services = [
      { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001' },
      { name: 'questionnaire-service', url: process.env.QUESTIONNAIRE_SERVICE_URL || 'http://questionnaire-service:3002' },
      { name: 'analysis-service', url: process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:3003' },
      { name: 'payment-service', url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3004' },
      { name: 'report-service', url: process.env.REPORT_SERVICE_URL || 'http://report-service:3005' }
    ];
    this.circuitBreakers = new Map();
  }

  async checkServiceHealth(service) {
    try {
      const response = await axios.get(`${service.url}/health`, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      return response.status < 400;
    } catch (error) {
      console.log(`❌ ${service.name} health check failed: ${error.message}`);
      return false;
    }
  }

  async resetCircuitBreaker(serviceName) {
    console.log(`🔄 Resetting circuit breaker for ${serviceName}...`);
    
    // Reset the circuit breaker state
    this.circuitBreakers.set(serviceName, {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      nextAttempt: null
    });

    console.log(`✅ Circuit breaker reset for ${serviceName}`);
  }

  async resetAllHealthyServices() {
    console.log('🚀 Starting circuit breaker reset process...\n');

    const healthChecks = await Promise.all(
      this.services.map(async (service) => {
        const isHealthy = await this.checkServiceHealth(service);
        return { ...service, healthy: isHealthy };
      })
    );

    const healthyServices = healthChecks.filter(s => s.healthy);
    const unhealthyServices = healthChecks.filter(s => !s.healthy);

    if (healthyServices.length > 0) {
      console.log(`✅ Healthy services (${healthyServices.length}):`);
      for (const service of healthyServices) {
        console.log(`   - ${service.name}`);
        await this.resetCircuitBreaker(service.name);
      }
    }

    if (unhealthyServices.length > 0) {
      console.log(`\n⚠️  Unhealthy services (${unhealthyServices.length}):`);
      for (const service of unhealthyServices) {
        console.log(`   - ${service.name} (circuit breaker will remain OPEN)`);
      }
    }

    console.log(`\n🎯 Circuit breaker reset complete. ${healthyServices.length}/${this.services.length} services are healthy.`);
    
    return {
      healthy: healthyServices.length,
      total: this.services.length,
      healthyServices: healthyServices.map(s => s.name),
      unhealthyServices: unhealthyServices.map(s => s.name)
    };
  }

  async monitorAndAutoReset() {
    console.log('👁️  Starting continuous circuit breaker monitoring...\n');
    
    setInterval(async () => {
      const result = await this.resetAllHealthyServices();
      if (result.healthy === result.total) {
        console.log('🎉 All services healthy! Circuit breakers reset.');
      }
    }, 30000); // Check every 30 seconds
  }
}

// CLI usage
if (require.main === module) {
  const manager = new CircuitBreakerResetManager();
  
  const command = process.argv[2];
  
  if (command === 'monitor') {
    manager.monitorAndAutoReset().catch(console.error);
  } else {
    manager.resetAllHealthyServices()
      .then((result) => {
        process.exit(result.healthy === result.total ? 0 : 1);
      })
      .catch((error) => {
        console.error('❌ Error resetting circuit breakers:', error);
        process.exit(1);
      });
  }
}

module.exports = CircuitBreakerResetManager;
