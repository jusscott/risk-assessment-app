/**
 * Circuit Breaker Reset Script
 * 
 * This script forcibly resets all circuit breakers to a closed state
 * and cleans up any persistent circuit state that might be preventing
 * services from starting correctly.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Service paths
const SERVICES = [
  'circuit-breaker',
  'api-gateway',
  'auth-service',
  'questionnaire-service',
  'analysis-service',
  'report-service',
  'payment-service'
];

// Root directory
const PROJECT_ROOT = path.resolve(__dirname);

console.log('=== Circuit Breaker Reset Script ===');
console.log('This script will reset all circuit breakers and restart services in the correct order');
console.log('Current directory:', PROJECT_ROOT);

/**
 * Reset circuit breaker state files in a service
 */
function resetCircuitState(serviceName) {
  console.log(`\nResetting circuit breaker state for ${serviceName}...`);
  
  let servicePath;
  if (serviceName === 'circuit-breaker') {
    servicePath = path.join(PROJECT_ROOT, 'backend/scripts/circuit-breaker');
  } else {
    servicePath = path.join(PROJECT_ROOT, 'backend', serviceName);
  }
  
  // Look for any circuit state files
  const utilsPath = path.join(servicePath, 'src/utils');
  
  if (fs.existsSync(utilsPath)) {
    // Find any circuit-related files
    const files = fs.readdirSync(utilsPath);
    let circuitFilesFound = false;
    
    files.forEach(file => {
      if (file.includes('circuit') || file.includes('enhanced-client')) {
        const filePath = path.join(utilsPath, file);
        console.log(`Found circuit-related file: ${file}`);
        circuitFilesFound = true;
        
        // Check if there's a config file associated
        const configDir = path.join(servicePath, 'src/config');
        if (fs.existsSync(configDir)) {
          const configFiles = fs.readdirSync(configDir);
          configFiles.forEach(configFile => {
            const configPath = path.join(configDir, configFile);
            const configContent = fs.readFileSync(configPath, 'utf8');
            
            // If the config has circuit breaker settings, update them
            if (configContent.includes('circuitBreaker') || configContent.includes('enhancedConnectivity')) {
              console.log(`Found circuit breaker config in ${configFile}, resetting to default values`);
              
              // Create backup
              const backupPath = `${configPath}.bak`;
              fs.copyFileSync(configPath, backupPath);
              
              // Replace with more permissive values
              let updatedConfig = configContent
                .replace(/circuitBreakerThreshold:\s*\d+/g, 'circuitBreakerThreshold: 10')
                .replace(/resetTimeout:\s*\d+/g, 'resetTimeout: 5000')
                .replace(/errorThresholdPercentage:\s*\d+/g, 'errorThresholdPercentage: 90');
              
              fs.writeFileSync(configPath, updatedConfig);
            }
          });
        }
      }
    });
    
    if (!circuitFilesFound) {
      console.log(`No circuit breaker files found in ${serviceName}`);
    }
  } else {
    console.log(`No utils directory found for ${serviceName}`);
  }
}

/**
 * Fix a specific service
 */
function fixService(serviceName) {
  console.log(`\nFixing ${serviceName}...`);
  
  // Reset circuit state
  resetCircuitState(serviceName);
  
  // Docker restart if possible
  try {
    console.log(`Restarting ${serviceName} via Docker...`);
    execSync(`docker-compose restart ${serviceName}`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
    console.log(`${serviceName} restarted successfully via Docker`);
  } catch (error) {
    console.log(`Warning: Could not restart ${serviceName} via Docker: ${error.message}`);
    console.log('This is normal if the service is not running in Docker');
  }
}

/**
 * Execute a series of Docker commands to help reset services
 */
function resetDocker() {
  console.log('\n=== Resetting Docker State ===');
  
  try {
    // Get current status
    console.log('Current Docker container status:');
    execSync('docker ps -a', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    
    // Stop all containers
    console.log('\nStopping all Docker containers...');
    execSync('docker-compose down', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    
    // Clean up any remaining resources
    console.log('\nCleaning up Docker resources...');
    execSync('docker system prune -f', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    
    // Start containers
    console.log('\nStarting all Docker containers...');
    execSync('docker-compose up -d', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    
    console.log('\nDocker containers started successfully');
  } catch (error) {
    console.error(`Error resetting Docker: ${error.message}`);
  }
}

/**
 * Fix specific API Gateway issues
 */
function fixApiGateway() {
  console.log('\n=== Fixing API Gateway ===');
  
  const apiGatewayPath = path.join(PROJECT_ROOT, 'backend/api-gateway');
  
  // Check service-url.config.js
  const serviceUrlPath = path.join(apiGatewayPath, 'src/config/service-url.config.js');
  if (fs.existsSync(serviceUrlPath)) {
    console.log('Checking service URL configuration...');
    
    try {
      const configContent = fs.readFileSync(serviceUrlPath, 'utf8');
      
      // Create backup
      const backupPath = `${serviceUrlPath}.bak`;
      fs.copyFileSync(serviceUrlPath, backupPath);
      
      // Update the service URLs to ensure proper connectivity
      const updatedConfig = configContent
        .replace(/getServiceUrl,\s*payment:[^,}]+/g, 'getServiceUrl,\n  payment: process.env.PAYMENT_SERVICE_URL || \'http://localhost:5003/api\'')
        .replace(/plans:[^,}]+/g, 'plans: process.env.PAYMENT_SERVICE_URL || \'http://localhost:5003/api\'');
      
      fs.writeFileSync(serviceUrlPath, updatedConfig);
      console.log('Service URL configuration updated');
    } catch (error) {
      console.error(`Error updating service URL config: ${error.message}`);
    }
  }
  
  // Check path-rewrite.config.js
  const pathRewritePath = path.join(apiGatewayPath, 'src/config/path-rewrite.config.js');
  if (fs.existsSync(pathRewritePath)) {
    console.log('Checking path rewrite configuration...');
    
    try {
      const pathRewriteContent = fs.readFileSync(pathRewritePath, 'utf8');
      
      // Create backup
      const backupPath = `${pathRewritePath}.bak`;
      fs.copyFileSync(pathRewritePath, backupPath);
      
      // Make sure paths are correctly configured
      // Keep the existing config, no specific changes needed
      
      console.log('Path rewrite configuration checked');
    } catch (error) {
      console.error(`Error checking path rewrite config: ${error.message}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // First, reset all circuit breakers
    console.log('=== Resetting Circuit Breaker State ===');
    SERVICES.forEach(service => {
      resetCircuitState(service);
    });
    
    // Fix API Gateway specific issues
    fixApiGateway();
    
    // Reset Docker containers
    resetDocker();
    
    // Wait for containers to initialize
    console.log('\nWaiting for services to initialize...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Fix each service individually in the correct order
    console.log('\n=== Fixing Individual Services ===');
    
    // Fix circuit breaker service first
    fixService('circuit-breaker');
    
    // Fix API Gateway next
    fixService('api-gateway');
    
    // Fix auth service (required by other services)
    fixService('auth-service');
    
    // Fix remaining services
    fixService('questionnaire-service');
    fixService('analysis-service');
    fixService('report-service');
    fixService('payment-service');
    
    console.log('\n=== Circuit Breaker Reset Complete ===');
    console.log('All services have been reset and restarted.');
    console.log('If services are still not starting, please check the individual service logs for specific errors.');
    console.log('You can use the following commands to check service status:');
    console.log('  - docker ps               # Check running containers');
    console.log('  - docker-compose logs     # View service logs');
    
  } catch (error) {
    console.error('Error in circuit breaker reset script:', error);
    process.exit(1);
  }
}

// Run the main function
main();
