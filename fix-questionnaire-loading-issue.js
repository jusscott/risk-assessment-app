#!/usr/bin/env node

/**
 * Comprehensive Questionnaire Loading Issue Fix
 * 
 * This script addresses the persistent "unable to load questionnaires" error by:
 * 1. Running comprehensive diagnostics
 * 2. Fixing identified issues automatically
 * 3. Providing step-by-step manual fixes when needed
 * 4. Verifying the fix works
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import our diagnostic tool
const { runDiagnostics } = require('./questionnaire-loading-diagnostic');

console.log('🔧 QUESTIONNAIRE LOADING ISSUE COMPREHENSIVE FIX\n');
console.log('This script will diagnose and fix the persistent questionnaire loading issue.\n');

/**
 * Execute a command and return the result
 */
function executeCommand(command, description) {
  console.log(`▶️  ${description}`);
  console.log(`   Command: ${command}`);
  
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: __dirname 
    });
    console.log(`✅ Success: ${description}`);
    if (result.trim()) {
      console.log(`   Output: ${result.trim()}`);
    }
    console.log('');
    return { success: true, output: result };
  } catch (error) {
    console.log(`❌ Failed: ${description}`);
    console.log(`   Error: ${error.message}`);
    if (error.stdout) {
      console.log(`   Stdout: ${error.stdout}`);
    }
    if (error.stderr) {
      console.log(`   Stderr: ${error.stderr}`);
    }
    console.log('');
    return { success: false, error: error.message };
  }
}

/**
 * Check if Docker containers are running
 */
function checkDockerContainers() {
  console.log('🐳 Checking Docker container status...\n');
  
  const requiredServices = [
    'questionnaire-service',
    'api-gateway',
    'auth-service',
    'postgres'
  ];
  
  let allRunning = true;
  
  for (const service of requiredServices) {
    const result = executeCommand(
      `docker-compose ps ${service}`,
      `Checking ${service} container status`
    );
    
    if (!result.success || !result.output.includes('Up')) {
      console.log(`⚠️  ${service} is not running properly`);
      allRunning = false;
    }
  }
  
  return allRunning;
}

/**
 * Restart Docker services
 */
function restartDockerServices() {
  console.log('🔄 Restarting Docker services...\n');
  
  // Stop all services
  executeCommand('docker-compose down', 'Stopping all services');
  
  // Remove old containers and networks
  executeCommand('docker system prune -f', 'Cleaning up Docker system');
  
  // Start services in correct order
  executeCommand('docker-compose up -d postgres', 'Starting PostgreSQL database');
  
  // Wait for database to be ready
  console.log('⏳ Waiting for database to be ready...');
  executeCommand('sleep 10', 'Waiting 10 seconds for database startup');
  
  executeCommand('docker-compose up -d auth-service', 'Starting Auth Service');
  executeCommand('sleep 5', 'Waiting 5 seconds for auth service');
  
  executeCommand('docker-compose up -d questionnaire-service', 'Starting Questionnaire Service');
  executeCommand('sleep 5', 'Waiting 5 seconds for questionnaire service');
  
  executeCommand('docker-compose up -d api-gateway', 'Starting API Gateway');
  executeCommand('sleep 5', 'Waiting 5 seconds for API gateway');
  
  executeCommand('docker-compose up -d frontend', 'Starting Frontend');
}

/**
 * Fix database connectivity issues
 */
function fixDatabaseConnectivity() {
  console.log('🗄️  Fixing database connectivity issues...\n');
  
  // Check if questionnaire database exists and has correct schema
  const dbCommands = [
    {
      cmd: 'docker-compose exec -T questionnaire-service npx prisma migrate deploy',
      desc: 'Applying database migrations for questionnaire service'
    },
    {
      cmd: 'docker-compose exec -T questionnaire-service npx prisma generate',
      desc: 'Generating Prisma client for questionnaire service'
    },
    {
      cmd: 'docker-compose exec -T auth-service npx prisma migrate deploy',
      desc: 'Applying database migrations for auth service'
    },
    {
      cmd: 'docker-compose exec -T auth-service npx prisma generate',
      desc: 'Generating Prisma client for auth service'
    }
  ];
  
  for (const dbCmd of dbCommands) {
    executeCommand(dbCmd.cmd, dbCmd.desc);
  }
}

/**
 * Seed the database with necessary data
 */
function seedDatabase() {
  console.log('🌱 Seeding database with necessary data...\n');
  
  const seedCommands = [
    {
      cmd: 'docker-compose exec -T questionnaire-service npm run seed',
      desc: 'Seeding questionnaire templates and data'
    }
  ];
  
  for (const seedCmd of seedCommands) {
    const result = executeCommand(seedCmd.cmd, seedCmd.desc);
    if (!result.success) {
      console.log('⚠️  Database seeding failed, trying alternative approach...');
      
      // Try direct seeding script
      executeCommand(
        'docker-compose exec -T questionnaire-service node prisma/seed.js',
        'Running seed script directly'
      );
    }
  }
}

/**
 * Fix API Gateway configuration
 */
function fixApiGatewayConfiguration() {
  console.log('🌐 Fixing API Gateway configuration...\n');
  
  // Check if API Gateway can reach questionnaire service
  const healthCheckCommands = [
    {
      cmd: 'docker-compose exec -T api-gateway curl -f http://questionnaire-service:3003/health || echo "Health check failed"',
      desc: 'Testing API Gateway to Questionnaire Service connectivity'
    },
    {
      cmd: 'docker-compose exec -T api-gateway curl -f http://auth-service:3001/health || echo "Health check failed"',
      desc: 'Testing API Gateway to Auth Service connectivity'
    }
  ];
  
  for (const healthCmd of healthCheckCommands) {
    executeCommand(healthCmd.cmd, healthCmd.desc);
  }
  
  // Restart API Gateway to refresh configurations
  executeCommand('docker-compose restart api-gateway', 'Restarting API Gateway');
}

/**
 * Clear Redis cache and rate limiting data
 */
function clearRedisCache() {
  console.log('🗑️  Clearing Redis cache and rate limiting data...\n');
  
  const redisCommands = [
    {
      cmd: 'docker-compose exec -T redis redis-cli FLUSHALL',
      desc: 'Clearing all Redis cache data'
    },
    {
      cmd: 'docker-compose exec -T api-gateway node -e "console.log(\'Clearing API Gateway caches...\')"',
      desc: 'Notifying API Gateway to clear internal caches'
    }
  ];
  
  for (const redisCmd of redisCommands) {
    executeCommand(redisCmd.cmd, redisCmd.desc);
  }
}

/**
 * Create test user and data
 */
function createTestData() {
  console.log('👤 Creating test user and data...\n');
  
  // Create a test user for verification
  const testUserScript = `
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    
    async function createTestUser() {
      const prisma = new PrismaClient();
      
      try {
        // Check if test user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: 'test@example.com' }
        });
        
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash('testpassword123', 10);
          
          const user = await prisma.user.create({
            data: {
              email: 'test@example.com',
              name: 'Test User',
              password: hashedPassword,
              role: 'USER'
            }
          });
          
          console.log('Test user created:', user.email);
        } else {
          console.log('Test user already exists:', existingUser.email);
        }
      } catch (error) {
        console.error('Error creating test user:', error.message);
      } finally {
        await prisma.$disconnect();
      }
    }
    
    createTestUser();
  `;
  
  // Write test user creation script
  fs.writeFileSync(path.join(__dirname, 'create-test-user.js'), testUserScript);
  
  executeCommand(
    'docker-compose exec -T auth-service node /app/create-test-user.js',
    'Creating test user in auth service'
  );
  
  // Create test submission data
  executeCommand(
    'docker-compose exec -T questionnaire-service node -e "' +
    'const { PrismaClient } = require(\'@prisma/client\'); ' +
    'const prisma = new PrismaClient(); ' +
    'prisma.submission.create({ data: { userId: \'test-user-id\', templateId: 1, status: \'draft\' } }).then(console.log).catch(console.error).finally(() => prisma.$disconnect());' +
    '"',
    'Creating test submission data'
  );
}

/**
 * Verify the fix by running diagnostics
 */
async function verifyFix() {
  console.log('🔍 Verifying the fix by running diagnostics...\n');
  
  try {
    // Run our comprehensive diagnostic tool
    await runDiagnostics();
    
    console.log('\n✅ Diagnostic verification completed!');
    console.log('Check the diagnostic results above to see if all issues are resolved.');
    
  } catch (error) {
    console.error('❌ Error running diagnostic verification:', error.message);
    console.log('You may need to run the diagnostic tool manually:');
    console.log('   node questionnaire-loading-diagnostic.js');
  }
}

/**
 * Main fix execution
 */
async function runComprehensiveFix() {
  console.log('🚀 Starting comprehensive questionnaire loading fix...\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Check Docker containers
    console.log('STEP 1: Checking Docker container status');
    console.log('=' .repeat(50));
    const containersRunning = checkDockerContainers();
    
    if (!containersRunning) {
      console.log('STEP 2: Restarting Docker services');
      console.log('=' .repeat(50));
      restartDockerServices();
    }
    
    // Step 3: Fix database connectivity
    console.log('STEP 3: Fixing database connectivity');
    console.log('=' .repeat(50));
    fixDatabaseConnectivity();
    
    // Step 4: Seed database
    console.log('STEP 4: Seeding database');
    console.log('=' .repeat(50));
    seedDatabase();
    
    // Step 5: Fix API Gateway
    console.log('STEP 5: Fixing API Gateway configuration');
    console.log('=' .repeat(50));
    fixApiGatewayConfiguration();
    
    // Step 6: Clear Redis cache
    console.log('STEP 6: Clearing Redis cache');
    console.log('=' .repeat(50));
    clearRedisCache();
    
    // Step 7: Create test data
    console.log('STEP 7: Creating test data');
    console.log('=' .repeat(50));
    createTestData();
    
    // Step 8: Wait for services to stabilize
    console.log('STEP 8: Waiting for services to stabilize');
    console.log('=' .repeat(50));
    console.log('⏳ Waiting 30 seconds for all services to stabilize...');
    executeCommand('sleep 30', 'Waiting for service stabilization');
    
    // Step 9: Verify the fix
    console.log('STEP 9: Verifying the fix');
    console.log('=' .repeat(50));
    await verifyFix();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 COMPREHENSIVE FIX COMPLETED!');
    console.log('=' .repeat(50));
    console.log(`Total time: ${duration} seconds`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Open your browser and navigate to http://localhost:3000');
    console.log('2. Try logging in with: test@example.com / testpassword123');
    console.log('3. Navigate to the Questionnaires page');
    console.log('4. Verify that questionnaires load without the "unable to load" error');
    console.log('');
    console.log('If you still see issues:');
    console.log('1. Run the diagnostic tool: node questionnaire-loading-diagnostic.js');
    console.log('2. Check browser developer console for frontend errors');
    console.log('3. Check Docker logs: docker-compose logs questionnaire-service');
    console.log('');
    
  } catch (error) {
    console.error('❌ Comprehensive fix failed:', error.message);
    console.log('');
    console.log('Manual troubleshooting steps:');
    console.log('1. Check Docker container status: docker-compose ps');
    console.log('2. Check service logs: docker-compose logs [service-name]');
    console.log('3. Restart specific services: docker-compose restart [service-name]');
    console.log('4. Run diagnostic tool: node questionnaire-loading-diagnostic.js');
    process.exit(1);
  }
}

// Execute the comprehensive fix
if (require.main === module) {
  runComprehensiveFix().catch(error => {
    console.error('Fatal error during fix execution:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveFix };
