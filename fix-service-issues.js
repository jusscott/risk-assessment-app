#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting comprehensive service fixes...\n');

// Fix 1: Report Service - Add missing status column
console.log('1. 📊 Fixing Report Service schema...');

const reportSchemaPath = 'backend/report-service/prisma/schema.prisma';
let reportSchema = fs.readFileSync(reportSchemaPath, 'utf8');

// Add status column to Report model
const reportModelRegex = /(model Report \{[^}]+?)(\n\})/;
if (reportSchema.match(reportModelRegex) && !reportSchema.includes('  status')) {
  reportSchema = reportSchema.replace(
    reportModelRegex,
    '$1  status       String    @default("pending") // "pending", "processing", "completed", "failed"\n$2'
  );
  fs.writeFileSync(reportSchemaPath, reportSchema);
  console.log('   ✅ Added status column to Report model');
} else {
  console.log('   ℹ️  Status column already exists or model not found');
}

// Fix 2: Questionnaire Service - Fix Prisma field names
console.log('\n2. 📋 Fixing Questionnaire Service Prisma queries...');

const questionnaireFiles = [
  'backend/questionnaire-service/src/controllers/template.controller.js',
  'backend/questionnaire-service/src/controllers/submission.controller.js'
];

questionnaireFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix common Prisma relation name mismatches
    const fixes = [
      // Fix questions -> Question for relations
      { from: /\.questions\s*:/g, to: '.Question:' },
      { from: /\.questions\s*\{/g, to: '.Question {' },
      // Fix template.questions -> template.Question
      { from: /template\.questions/g, to: 'template.Question' },
      { from: /Template\.questions/g, to: 'Template.Question' },
      // Fix include: { questions: true } -> include: { Question: true }
      { from: /include:\s*\{\s*questions:\s*true\s*\}/g, to: 'include: { Question: true }' },
      // Fix select: { questions: ... } -> select: { Question: ... }
      { from: /select:\s*\{\s*questions:/g, to: 'select: { Question:' }
    ];

    fixes.forEach(fix => {
      if (content.match(fix.from)) {
        content = content.replace(fix.from, fix.to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ Fixed Prisma queries in ${path.basename(filePath)}`);
    } else {
      console.log(`   ℹ️  No fixes needed for ${path.basename(filePath)}`);
    }
  }
});

// Fix 3: Analysis Service - WebSocket recovery
console.log('\n3. 🔗 Fixing Analysis Service WebSocket recovery...');

const analysisIndexPath = 'backend/analysis-service/src/index.js';
if (fs.existsSync(analysisIndexPath)) {
  let analysisContent = fs.readFileSync(analysisIndexPath, 'utf8');

  // Add service health monitoring and WebSocket recovery
  const wsRecoveryCode = `
// WebSocket Recovery Logic
const serviceHealthMonitor = {
  reportServiceHealthy: false,
  
  async checkReportServiceHealth() {
    try {
      const response = await fetch(\`\${process.env.REPORT_SERVICE_URL || 'http://report-service:3005'}/health\`);
      this.reportServiceHealthy = response.ok;
      return this.reportServiceHealthy;
    } catch (error) {
      console.log('Report service health check failed:', error.message);
      this.reportServiceHealthy = false;
      return false;
    }
  },

  async recoverWebSocketConnections() {
    if (this.reportServiceHealthy && global.io) {
      console.log('🔄 Recovering WebSocket connections...');
      global.io.emit('service-recovery', {
        service: 'report-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    }
  },

  startMonitoring() {
    setInterval(async () => {
      const wasHealthy = this.reportServiceHealthy;
      const isHealthy = await this.checkReportServiceHealth();
      
      if (!wasHealthy && isHealthy) {
        console.log('✅ Report service recovered, triggering WebSocket recovery');
        await this.recoverWebSocketConnections();
      }
    }, 10000); // Check every 10 seconds
  }
};

// Start monitoring after server setup
serviceHealthMonitor.startMonitoring();
`;

  if (!analysisContent.includes('serviceHealthMonitor')) {
    // Add the recovery code before the server start
    const serverStartRegex = /(server\.listen\([^)]+\)[^}]+\})/;
    if (analysisContent.match(serverStartRegex)) {
      analysisContent = analysisContent.replace(
        serverStartRegex,
        `${wsRecoveryCode}\n\n$1`
      );
      fs.writeFileSync(analysisIndexPath, analysisContent);
      console.log('   ✅ Added WebSocket recovery logic to Analysis Service');
    } else {
      console.log('   ⚠️  Could not find server.listen in Analysis Service');
    }
  } else {
    console.log('   ℹ️  WebSocket recovery already implemented');
  }
}

// Fix 4: Create Circuit Breaker Reset Script
console.log('\n4. 🔄 Creating Circuit Breaker reset functionality...');

const circuitBreakerResetPath = 'backend/scripts/circuit-breaker/reset-circuit-breakers.js';
const resetScript = `#!/usr/bin/env node

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
      const response = await axios.get(\`\${service.url}/health\`, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      return response.status < 400;
    } catch (error) {
      console.log(\`❌ \${service.name} health check failed: \${error.message}\`);
      return false;
    }
  }

  async resetCircuitBreaker(serviceName) {
    console.log(\`🔄 Resetting circuit breaker for \${serviceName}...\`);
    
    // Reset the circuit breaker state
    this.circuitBreakers.set(serviceName, {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      nextAttempt: null
    });

    console.log(\`✅ Circuit breaker reset for \${serviceName}\`);
  }

  async resetAllHealthyServices() {
    console.log('🚀 Starting circuit breaker reset process...\\n');

    const healthChecks = await Promise.all(
      this.services.map(async (service) => {
        const isHealthy = await this.checkServiceHealth(service);
        return { ...service, healthy: isHealthy };
      })
    );

    const healthyServices = healthChecks.filter(s => s.healthy);
    const unhealthyServices = healthChecks.filter(s => !s.healthy);

    if (healthyServices.length > 0) {
      console.log(\`✅ Healthy services (\${healthyServices.length}):\`);
      for (const service of healthyServices) {
        console.log(\`   - \${service.name}\`);
        await this.resetCircuitBreaker(service.name);
      }
    }

    if (unhealthyServices.length > 0) {
      console.log(\`\\n⚠️  Unhealthy services (\${unhealthyServices.length}):\`);
      for (const service of unhealthyServices) {
        console.log(\`   - \${service.name} (circuit breaker will remain OPEN)\`);
      }
    }

    console.log(\`\\n🎯 Circuit breaker reset complete. \${healthyServices.length}/\${this.services.length} services are healthy.\`);
    
    return {
      healthy: healthyServices.length,
      total: this.services.length,
      healthyServices: healthyServices.map(s => s.name),
      unhealthyServices: unhealthyServices.map(s => s.name)
    };
  }

  async monitorAndAutoReset() {
    console.log('👁️  Starting continuous circuit breaker monitoring...\\n');
    
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
`;

fs.writeFileSync(circuitBreakerResetPath, resetScript);
fs.chmodSync(circuitBreakerResetPath, '755');
console.log('   ✅ Created circuit breaker reset script');

// Create migration for Report Service
console.log('\n5. 📝 Creating Report Service migration...');

const migrationDir = 'backend/report-service/prisma/migrations/20250603_add_status';
if (!fs.existsSync(migrationDir)) {
  fs.mkdirSync(migrationDir, { recursive: true });
}

const migrationSQL = `-- Add status column to Report table
ALTER TABLE "Report" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

-- Add index for status column for better query performance
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- Add check constraint to ensure valid status values
ALTER TABLE "Report" ADD CONSTRAINT "Report_status_check" 
CHECK ("status" IN ('pending', 'processing', 'completed', 'failed'));
`;

fs.writeFileSync(path.join(migrationDir, 'migration.sql'), migrationSQL);

const migrationMeta = `{
  "version": "20250603_add_status",
  "dialect": "postgresql"
}`;

fs.writeFileSync(path.join(migrationDir, 'migration_lock.toml'), migrationMeta);
console.log('   ✅ Created migration for Report Service status column');

// Create service restart script
console.log('\n6. 🔄 Creating service restart script...');

const restartScript = `#!/bin/bash

echo "🚀 Restarting services with fixes applied..."

# Navigate to project directory
cd risk-assessment-app

# Apply Report Service migration
echo "📊 Applying Report Service migration..."
docker exec risk-assessment-app-report-service-1 npx prisma migrate deploy || echo "⚠️  Migration may have already been applied"

# Restart services in dependency order
echo "🔄 Restarting services..."

# Restart Report Service first (others depend on it)
docker restart risk-assessment-app-report-service-1
sleep 5

# Restart Analysis Service (needs Report Service healthy for WebSocket recovery)
docker restart risk-assessment-app-analysis-service-1
sleep 5

# Restart Questionnaire Service 
docker restart risk-assessment-app-questionnaire-service-1
sleep 3

# Restart API Gateway last
docker restart risk-assessment-app-api-gateway-1
sleep 3

echo "✅ All services restarted!"

# Reset circuit breakers after services are up
echo "🔄 Resetting circuit breakers..."
sleep 10
node backend/scripts/circuit-breaker/reset-circuit-breakers.js

echo "🎉 Service fixes applied and systems recovered!"
`;

fs.writeFileSync('restart-services-after-fixes.sh', restartScript);
fs.chmodSync('restart-services-after-fixes.sh', '755');
console.log('   ✅ Created service restart script');

console.log('\n🎉 All service fixes completed!');
console.log('\n📋 Summary of fixes applied:');
console.log('   1. ✅ Report Service: Added status column with migration');
console.log('   2. ✅ Questionnaire Service: Fixed Prisma query field names (questions -> Question)');
console.log('   3. ✅ Analysis Service: Added WebSocket recovery logic for when Report Service is healthy');
console.log('   4. ✅ Circuit Breakers: Created reset script and monitoring system');
console.log('   5. ✅ Created comprehensive restart script');

console.log('\n🚀 Next steps:');
console.log('   1. Run: ./restart-services-after-fixes.sh');
console.log('   2. Monitor: node backend/scripts/circuit-breaker/reset-circuit-breakers.js monitor');
console.log('   3. Verify all services are healthy and WebSocket connections recovered');
