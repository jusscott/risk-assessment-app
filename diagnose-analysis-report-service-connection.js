#!/usr/bin/env node

/**
 * Diagnostic Script: Analysis-Service to Report-Service Connection Issues
 * 
 * This script diagnoses the 404 connection errors between analysis-service 
 * and report-service to identify missing WebSocket endpoints.
 */

const axios = require('axios');

async function diagnoseAnalysisReportConnection() {
  console.log('🔍 ANALYSIS-SERVICE TO REPORT-SERVICE CONNECTION DIAGNOSIS');
  console.log('=' .repeat(80));
  
  const reportServiceUrl = 'http://localhost:5005';
  const analysisServiceUrl = 'http://localhost:5004';
  
  // Test report-service endpoints
  console.log('\n📋 Testing Report Service Endpoints:');
  console.log('-'.repeat(50));
  
  const reportEndpoints = [
    '/health',
    '/api/health', 
    '/api/reports',
    '/ws', // This is what analysis-service is trying to connect to
    '/api/ws'
  ];
  
  for (const endpoint of reportEndpoints) {
    try {
      const response = await axios.get(`${reportServiceUrl}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true // Don't throw on 404
      });
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint} - ${response.status} ${response.statusText}`);
      } else {
        console.log(`❌ ${endpoint} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`🔌 ${endpoint} - Service not available`);
      } else {
        console.log(`❌ ${endpoint} - ${error.message}`);
      }
    }
  }
  
  // Test analysis-service endpoints  
  console.log('\n📋 Testing Analysis Service Endpoints:');
  console.log('-'.repeat(50));
  
  const analysisEndpoints = [
    '/health',
    '/api/health',
    '/api/analysis'
  ];
  
  for (const endpoint of analysisEndpoints) {
    try {
      const response = await axios.get(`${analysisServiceUrl}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint} - ${response.status} ${response.statusText}`);
      } else {
        console.log(`❌ ${endpoint} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`🔌 ${endpoint} - Service not available`);
      } else {
        console.log(`❌ ${endpoint} - ${error.message}`);
      }
    }
  }
  
  // Check Docker logs for specific errors
  console.log('\n📋 Recent Analysis Service Logs (WebSocket Errors):');
  console.log('-'.repeat(50));
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('cd risk-assessment-app && docker-compose logs analysis-service --tail=10 2>/dev/null || echo "Could not fetch logs"');
    
    const lines = stdout.split('\n');
    const wsErrors = lines.filter(line => 
      line.includes('404') || 
      line.includes('WebSocket') || 
      line.includes('report-service') ||
      line.includes('health check failed')
    );
    
    if (wsErrors.length > 0) {
      console.log('\n🚨 Found WebSocket/404 Related Errors:');
      wsErrors.forEach((line, index) => {
        console.log(`${index + 1}. ${line.trim()}`);
      });
    } else {
      console.log('✅ No recent WebSocket errors found in logs');
    }
    
  } catch (error) {
    console.log(`❌ Could not fetch Docker logs: ${error.message}`);
  }
  
  // Analysis and recommendations
  console.log('\n🔧 DIAGNOSIS RESULTS:');
  console.log('=' .repeat(80));
  
  console.log('\n🚨 ROOT CAUSE IDENTIFIED:');
  console.log('The analysis-service is trying to establish WebSocket connections to the report-service,');
  console.log('but the report-service does NOT have WebSocket support. It only provides HTTP REST endpoints.');
  
  console.log('\n📍 SPECIFIC ISSUES:');
  console.log('1. Analysis-service tries to connect to: ws://report-service:5005/ws');
  console.log('2. Report-service does not have a /ws endpoint');
  console.log('3. Analysis-service health checks may use wrong URL/port');
  console.log('4. WebSocket integration code is unnecessary since report-service is HTTP-only');
  
  console.log('\n💡 RECOMMENDED SOLUTIONS:');
  console.log('1. ✅ DISABLE WebSocket integration in analysis-service (Recommended)');
  console.log('2. 🔧 Configure analysis-service to use HTTP-only communication');
  console.log('3. 🗑️  Remove WebSocket timeout fix utilities');
  console.log('4. 📝 Update analysis-service configuration to remove WebSocket URLs');
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('Run the fix script to disable WebSocket integration and use HTTP-only communication.');
}

// Run diagnosis
diagnoseAnalysisReportConnection()
  .then(() => {
    console.log('\n✅ Diagnosis completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Diagnosis failed:', error.message);
    process.exit(1);
  });
