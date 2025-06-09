#!/usr/bin/env node

/**
 * Post-Relocation Authentication Troubleshooting Script
 * 
 * This script diagnoses authentication failures after project relocation,
 * focusing on common issues that occur when moving Docker-based projects.
 * 
 * Issues to check:
 * 1. Service startup and health
 * 2. Database connectivity and data integrity
 * 3. Docker network connectivity
 * 4. Environment configuration
 * 5. Volume mounting and data persistence
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class PostRelocationDiagnostic {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.authServiceURL = 'http://localhost:5001';
    this.testUsers = [
      { email: 'good@test.com', password: 'Password123' },
      { email: 'jusscott@gmail.com', password: 'Password123' }
    ];
    this.services = [
      { name: 'frontend', port: 3000, url: 'http://localhost:3000' },
      { name: 'api-gateway', port: 5000, url: 'http://localhost:5000/health' },
      { name: 'auth-service', port: 5001, url: 'http://localhost:5001/health' },
      { name: 'questionnaire-service', port: 5002, url: 'http://localhost:5002/api/health' },
      { name: 'payment-service', port: 5003, url: 'http://localhost:5003/api/health' },
      { name: 'analysis-service', port: 5004, url: 'http://localhost:5004/health' },
      { name: 'report-service', port: 5005, url: 'http://localhost:5005/health' }
    ];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'debug': '🔍'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Step 1: Check Docker Container Status
  async checkDockerContainerStatus() {
    await this.log('='.repeat(60));
    await this.log('Step 1: Checking Docker Container Status', 'info');
    await this.log('='.repeat(60));

    try {
      const { stdout } = await execAsync('docker-compose ps');
      await this.log('Docker container status:', 'info');
      console.log(stdout);

      // Check if any containers are not running
      const lines = stdout.split('\n').filter(line => line.trim());
      const containerLines = lines.slice(1); // Skip header
      
      let allRunning = true;
      for (const line of containerLines) {
        if (line.includes('Exit') || line.includes('Down')) {
          allRunning = false;
          await this.log(`Container issue detected: ${line}`, 'error');
        }
      }

      if (allRunning && containerLines.length > 0) {
        await this.log('All containers appear to be running', 'success');
      } else if (containerLines.length === 0) {
        await this.log('No containers are running! Need to start services.', 'error');
        return false;
      }

      return allRunning;
    } catch (error) {
      await this.log(`Error checking Docker status: ${error.message}`, 'error');
      return false;
    }
  }

  // Step 2: Check Service Health and Connectivity
  async checkServiceHealth() {
    await this.log('='.repeat(60));
    await this.log('Step 2: Checking Service Health and Connectivity', 'info');
    await this.log('='.repeat(60));

    const healthResults = {};

    for (const service of this.services) {
      try {
        const response = await axios.get(service.url, { 
          timeout: 5000,
          validateStatus: (status) => status < 500
        });
        
        const isHealthy = response.status === 200;
        healthResults[service.name] = {
          healthy: isHealthy,
          status: response.status,
          url: service.url
        };

        await this.log(
          `${service.name} (${service.url}): ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${response.status})`,
          isHealthy ? 'success' : 'error'
        );
      } catch (error) {
        healthResults[service.name] = {
          healthy: false,
          error: error.message,
          url: service.url
        };
        
        await this.log(
          `${service.name} (${service.url}): UNREACHABLE - ${error.message}`,
          'error'
        );
      }
    }

    return healthResults;
  }

  // Step 3: Test Database Connectivity
  async checkDatabaseConnectivity() {
    await this.log('='.repeat(60));
    await this.log('Step 3: Checking Database Connectivity', 'info');
    await this.log('='.repeat(60));

    try {
      // Check if auth-service can connect to database
      const response = await axios.get(`${this.authServiceURL}/api/debug/db-status`, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200) {
        await this.log('Database connectivity check successful', 'success');
        if (response.data.users) {
          await this.log(`Found ${response.data.users.length} users in database`, 'info');
        }
        return true;
      } else {
        await this.log(`Database connectivity issue: Status ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      await this.log(`Database connectivity test failed: ${error.message}`, 'error');
      
      // Try to check database container directly
      try {
        const { stdout } = await execAsync('docker-compose exec -T postgres pg_isready -U postgres');
        await this.log('Direct PostgreSQL check result:', 'info');
        console.log(stdout);
      } catch (dbError) {
        await this.log(`Direct database check failed: ${dbError.message}`, 'error');
      }
      
      return false;
    }
  }

  // Step 4: Check User Data Integrity
  async checkUserDataIntegrity() {
    await this.log('='.repeat(60));
    await this.log('Step 4: Checking User Data Integrity', 'info');
    await this.log('='.repeat(60));

    for (const user of this.testUsers) {
      try {
        const response = await axios.get(`${this.authServiceURL}/api/debug/user/${encodeURIComponent(user.email)}`, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });

        if (response.status === 200 && response.data.user) {
          await this.log(`User ${user.email}: EXISTS in database`, 'success');
          
          // Check password hash
          if (response.data.user.password && response.data.user.password.startsWith('$2b$')) {
            await this.log(`User ${user.email}: Password hash looks valid (bcrypt)`, 'success');
          } else {
            await this.log(`User ${user.email}: Password hash appears corrupted`, 'error');
          }
        } else {
          await this.log(`User ${user.email}: NOT FOUND in database`, 'error');
        }
      } catch (error) {
        await this.log(`Error checking user ${user.email}: ${error.message}`, 'error');
      }
    }
  }

  // Step 5: Test Authentication Flow
  async testAuthenticationFlow() {
    await this.log('='.repeat(60));
    await this.log('Step 5: Testing Authentication Flow', 'info');
    await this.log('='.repeat(60));

    for (const user of this.testUsers) {
      try {
        await this.log(`Testing login for ${user.email}...`, 'info');
        
        const response = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: user.email,
          password: user.password
        }, {
          timeout: 10000,
          validateStatus: (status) => status < 500
        });

        await this.log(`Login attempt for ${user.email}: Status ${response.status}`, 'debug');
        
        if (response.status === 200 && response.data.success) {
          await this.log(`Authentication SUCCESS for ${user.email}`, 'success');
        } else {
          await this.log(`Authentication FAILED for ${user.email}`, 'error');
          await this.log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'debug');
          
          // Get detailed error information
          if (response.data.error) {
            await this.log(`Error details: ${response.data.error.message}`, 'error');
          }
        }
      } catch (error) {
        await this.log(`Authentication test error for ${user.email}: ${error.message}`, 'error');
      }
    }
  }

  // Step 6: Check Docker Network Connectivity
  async checkDockerNetworkConnectivity() {
    await this.log('='.repeat(60));
    await this.log('Step 6: Checking Docker Network Connectivity', 'info');
    await this.log('='.repeat(60));

    try {
      // Check Docker networks
      const { stdout: networksOutput } = await execAsync('docker network ls');
      await this.log('Available Docker networks:', 'info');
      console.log(networksOutput);

      // Check specific network connectivity from api-gateway to auth-service
      try {
        const { stdout: pingOutput } = await execAsync(
          'docker-compose exec -T api-gateway ping -c 1 auth-service'
        );
        await this.log('Network connectivity api-gateway -> auth-service: SUCCESS', 'success');
      } catch (pingError) {
        await this.log('Network connectivity api-gateway -> auth-service: FAILED', 'error');
        await this.log(`Ping error: ${pingError.message}`, 'debug');
      }

      // Check auth-service to database connectivity
      try {
        const { stdout: dbPingOutput } = await execAsync(
          'docker-compose exec -T auth-service ping -c 1 postgres'
        );
        await this.log('Network connectivity auth-service -> postgres: SUCCESS', 'success');
      } catch (dbPingError) {
        await this.log('Network connectivity auth-service -> postgres: FAILED', 'error');
        await this.log(`Database ping error: ${dbPingError.message}`, 'debug');
      }

    } catch (error) {
      await this.log(`Network connectivity check failed: ${error.message}`, 'error');
    }
  }

  // Step 7: Check Environment Variables and Configuration
  async checkEnvironmentConfiguration() {
    await this.log('='.repeat(60));
    await this.log('Step 7: Checking Environment Configuration', 'info');
    await this.log('='.repeat(60));

    const servicesToCheck = ['auth-service', 'api-gateway'];
    
    for (const service of servicesToCheck) {
      try {
        const { stdout } = await execAsync(`docker-compose exec -T ${service} env | grep -E "(DATABASE_URL|JWT_SECRET|NODE_ENV|PORT)"`);
        await this.log(`Environment variables for ${service}:`, 'info');
        console.log(stdout);
      } catch (error) {
        await this.log(`Could not check environment for ${service}: ${error.message}`, 'warning');
      }
    }
  }

  // Step 8: Generate Recommendations
  async generateRecommendations(healthResults) {
    await this.log('='.repeat(60));
    await this.log('Step 8: Diagnostic Summary and Recommendations', 'info');
    await this.log('='.repeat(60));

    const unhealthyServices = Object.entries(healthResults)
      .filter(([name, result]) => !result.healthy)
      .map(([name]) => name);

    if (unhealthyServices.length === 0) {
      await this.log('All services appear healthy. Authentication issue may be data-related.', 'warning');
      
      await this.log('\n🔧 RECOMMENDED ACTIONS:', 'info');
      await this.log('1. Run the comprehensive login test: `node comprehensive-login-e2e-test.js`', 'info');
      await this.log('2. Check user data integrity with existing tools', 'info');
      await this.log('3. Verify bcrypt password hashes are not corrupted', 'info');
      await this.log('4. Check for any service-specific logs in Docker', 'info');
    } else {
      await this.log(`Found ${unhealthyServices.length} unhealthy services: ${unhealthyServices.join(', ')}`, 'error');
      
      await this.log('\n🚨 IMMEDIATE ACTIONS REQUIRED:', 'info');
      await this.log('1. Restart unhealthy services:', 'info');
      await this.log('   docker-compose restart ' + unhealthyServices.join(' '), 'info');
      await this.log('2. If restart fails, try full rebuild:', 'info');
      await this.log('   docker-compose down && docker-compose up -d --build', 'info');
      await this.log('3. Check service logs for errors:', 'info');
      unhealthyServices.forEach(service => {
        this.log(`   docker-compose logs ${service}`, 'info');
      });
    }

    await this.log('\n📋 POST-RELOCATION CHECKLIST:', 'info');
    await this.log('□ All Docker containers running', 'info');
    await this.log('□ Database connectivity established', 'info');
    await this.log('□ Network connectivity between services', 'info');
    await this.log('□ User data integrity verified', 'info');
    await this.log('□ Authentication flow functional', 'info');
    await this.log('□ Environment variables properly set', 'info');
  }

  // Main diagnostic workflow
  async runDiagnostic() {
    await this.log('🚀 Starting Post-Relocation Authentication Diagnostic', 'info');
    await this.log('This will systematically check all potential issues after project move', 'info');

    const containersRunning = await this.checkDockerContainerStatus();
    
    if (!containersRunning) {
      await this.log('\n🚨 CRITICAL: Containers not running. Starting services...', 'error');
      await this.log('Run: docker-compose up -d', 'info');
      return;
    }

    const healthResults = await this.checkServiceHealth();
    await this.checkDatabaseConnectivity();
    await this.checkUserDataIntegrity();
    await this.testAuthenticationFlow();
    await this.checkDockerNetworkConnectivity();
    await this.checkEnvironmentConfiguration();
    await this.generateRecommendations(healthResults);

    await this.log('\n✅ Diagnostic complete. Review results above for next steps.', 'success');
  }
}

// Quick service restart function
async function quickServiceRestart() {
  console.log('🔄 Attempting quick service restart...');
  
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    console.log('Restarting auth-service and api-gateway...');
    await execAsync('docker-compose restart auth-service api-gateway');
    
    console.log('Waiting 10 seconds for services to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('✅ Quick restart complete. Test authentication now.');
  } catch (error) {
    console.error('❌ Quick restart failed:', error.message);
  }
}

// Run diagnostic
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick-restart')) {
    await quickServiceRestart();
    return;
  }
  
  const diagnostic = new PostRelocationDiagnostic();
  await diagnostic.runDiagnostic();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
}

module.exports = PostRelocationDiagnostic;
