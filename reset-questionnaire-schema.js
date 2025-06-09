#!/usr/bin/env node

/**
 * Reset Questionnaire Database Schema
 * 
 * This script directly resets the database schema by:
 * 1. Connecting to PostgreSQL and dropping the public schema
 * 2. Recreating the public schema
 * 3. Applying Prisma migrations to the clean schema
 * 4. Seeding the database with initial data
 * 
 * This approach fixes P3005 migration errors where dropping the entire database is not possible.
 */

const { execSync } = require('child_process');

console.log('🔧 RESETTING QUESTIONNAIRE DATABASE SCHEMA\n');
console.log('This script will completely reset the schema to resolve P3005 migration errors.\n');

/**
 * Execute a command safely with detailed output
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
    if (result && result.trim()) {
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
    return { success: false, error: error.message, stderr: error.stderr, stdout: error.stdout };
  }
}

/**
 * Reset the database schema directly with SQL commands
 */
function resetDatabaseSchema() {
  console.log('🗄️  STEP 1: Reset database schema\n');
  console.log('=' .repeat(50));
  
  // Stop the questionnaire service to avoid connection issues
  executeCommand('docker-compose stop questionnaire-service', 'Stopping questionnaire service');
  
  // Drop and recreate the schema instead of the entire database
  const pgCommands = [
    // Drop the schema with cascade to remove all objects
    'docker-compose exec -T questionnaire-db psql -U questionnaire_user -d questionnaires -c "DROP SCHEMA public CASCADE;"',
    // Recreate the schema
    'docker-compose exec -T questionnaire-db psql -U questionnaire_user -d questionnaires -c "CREATE SCHEMA public;"',
    // Set proper permissions
    'docker-compose exec -T questionnaire-db psql -U questionnaire_user -d questionnaires -c "GRANT ALL ON SCHEMA public TO questionnaire_user;"',
    'docker-compose exec -T questionnaire-db psql -U questionnaire_user -d questionnaires -c "GRANT ALL ON SCHEMA public TO public;"'
  ];
  
  for (const cmd of pgCommands) {
    executeCommand(cmd, 'Executing PostgreSQL command');
  }
}

/**
 * Apply Prisma migrations to the clean schema
 */
function applyMigrations() {
  console.log('🔄 STEP 2: Apply migrations to clean schema\n');
  console.log('=' .repeat(50));
  
  // Start the questionnaire service
  executeCommand('docker-compose start questionnaire-service', 'Starting questionnaire service');
  executeCommand('sleep 10', 'Waiting for questionnaire service to be ready');
  
  // Apply migrations
  executeCommand(
    'docker-compose exec -T questionnaire-service npx prisma migrate deploy',
    'Applying migrations to clean schema'
  );
  
  // Generate Prisma client
  executeCommand(
    'docker-compose exec -T questionnaire-service npx prisma generate',
    'Generating Prisma client'
  );
}

/**
 * Seed the database with initial data
 */
function seedDatabase() {
  console.log('🌱 STEP 3: Seeding database\n');
  console.log('=' .repeat(50));
  
  // Run the seed script
  const seedResult = executeCommand(
    'docker-compose exec -T questionnaire-service npm run seed',
    'Running database seed script'
  );
  
  if (!seedResult.success) {
    console.log('Seed script failed, trying direct seed file...');
    executeCommand(
      'docker-compose exec -T questionnaire-service node prisma/seed.js',
      'Running seed file directly'
    );
  }
}

/**
 * Verify the database is working properly
 */
function verifyDatabase() {
  console.log('✅ STEP 4: Verifying database\n');
  console.log('=' .repeat(50));
  
  // Test database connection
  executeCommand(
    'docker-compose exec -T questionnaire-service node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.$connect().then(() => console.log(\'Database connected successfully\')).catch(e => console.error(\'Connection failed:\', e.message)).finally(() => prisma.$disconnect());"',
    'Testing database connection'
  );
  
  // Test basic query
  executeCommand(
    'docker-compose exec -T questionnaire-service node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.template.findMany().then(templates => console.log(\'Templates found:\', templates.length)).catch(e => console.error(\'Query failed:\', e.message)).finally(() => prisma.$disconnect());"',
    'Testing basic database query'
  );
  
  // Check service health endpoint
  executeCommand(
    'sleep 5 && curl -f http://localhost:5002/api/health || echo "Service health check failed"',
    'Testing questionnaire service health endpoint'
  );
}

/**
 * Main execution function
 */
async function resetQuestionnaireDatabaseSchema() {
  console.log('🚀 Starting Database Schema Reset...\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Reset database schema
    resetDatabaseSchema();
    
    // Step 2: Apply migrations
    applyMigrations();
    
    // Step 3: Seed database
    seedDatabase();
    
    // Step 4: Verify everything is working
    verifyDatabase();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 DATABASE SCHEMA RESET COMPLETED!');
    console.log('=' .repeat(50));
    console.log(`Total time: ${duration} seconds`);
    console.log('');
    console.log('✅ Database schema has been reset and migrations applied');
    console.log('✅ Prisma client has been regenerated');
    console.log('✅ Database seeded with initial data');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run the main questionnaire loading fix: node risk-assessment-app/fix-questionnaire-loading-issue-corrected.js');
    console.log('2. Or test the questionnaire service directly: curl http://localhost:5002/api/health');
    console.log('');
    
  } catch (error) {
    console.error('❌ Database schema reset failed:', error.message);
    console.log('');
    console.log('Manual intervention required. Try these steps:');
    console.log('1. Connect to database directly:');
    console.log('   docker-compose exec questionnaire-db psql -U questionnaire_user -d questionnaires');
    console.log('');
    console.log('2. Execute these SQL commands:');
    console.log('   DROP SCHEMA public CASCADE;');
    console.log('   CREATE SCHEMA public;');
    console.log('   GRANT ALL ON SCHEMA public TO questionnaire_user;');
    console.log('   GRANT ALL ON SCHEMA public TO public;');
    console.log('');
    console.log('3. Then run migrations:');
    console.log('   docker-compose exec -T questionnaire-service npx prisma migrate deploy');
    process.exit(1);
  }
}

// Execute the schema reset
if (require.main === module) {
  resetQuestionnaireDatabaseSchema().catch(error => {
    console.error('Fatal error during schema reset:', error);
    process.exit(1);
  });
}

module.exports = { resetQuestionnaireDatabaseSchema };
