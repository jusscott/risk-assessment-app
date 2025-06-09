/**
 * This script completely rebuilds the Prisma client with the correct database connection
 * Solves the issue where even after updating DATABASE_URL, the service still tries to use port 5432
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Configuration
const questionnairePath = path.join(__dirname, 'backend/questionnaire-service');
const prismaClientPath = path.join(questionnairePath, 'node_modules/.prisma');
const envPath = path.join(questionnairePath, '.env');

console.log('🔍 Starting Prisma client fix for questionnaire service');
console.log(`Working directory: ${questionnairePath}`);

// 1. Check if .env exists and contains correct port
console.log('\n📝 Checking environment configuration...');
try {
  if (!fs.existsSync(envPath)) {
    console.error(`Error: .env file not found at ${envPath}`);
    process.exit(1);
  }

  // Load and check DATABASE_URL
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  const dbUrl = envConfig.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('Error: DATABASE_URL not found in .env file');
    process.exit(1);
  }

  console.log(`Found DATABASE_URL: ${dbUrl}`);
  
  // Check if the URL already uses port 5433
  if (!dbUrl.includes('localhost:5433')) {
    console.log('DATABASE_URL does not use port 5433, updating it...');
    
    // Update the port in DATABASE_URL
    const updatedDbUrl = dbUrl.replace(/localhost:\d+/, 'localhost:5433');
    const updatedEnvContent = fs.readFileSync(envPath, 'utf8').replace(
      dbUrl, 
      updatedDbUrl
    );
    
    fs.writeFileSync(envPath, updatedEnvContent);
    console.log('Updated DATABASE_URL in .env to use port 5433');
  } else {
    console.log('DATABASE_URL already using correct port 5433');
  }
} catch (err) {
  console.error(`Error processing .env file: ${err.message}`);
  process.exit(1);
}

// 2. Delete Prisma client to force regeneration
console.log('\n🗑️ Cleaning up existing Prisma client...');
try {
  if (fs.existsSync(prismaClientPath)) {
    console.log(`Removing directory: ${prismaClientPath}`);
    fs.rmSync(prismaClientPath, { recursive: true, force: true });
  } else {
    console.log('Prisma client directory not found, nothing to delete');
  }
} catch (err) {
  console.error(`Error cleaning up Prisma client: ${err.message}`);
  // Continue anyway
}

// 3. Regenerate Prisma client
console.log('\n🔄 Regenerating Prisma client...');
try {
  process.chdir(questionnairePath);
  console.log('Executing: npx prisma generate');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client successfully regenerated');
} catch (err) {
  console.error(`Error generating Prisma client: ${err.message}`);
  process.exit(1);
}

// 4. Apply database migrations
console.log('\n📊 Applying database migrations...');
try {
  console.log('Executing: npx prisma migrate deploy');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Database migrations successfully applied');
} catch (err) {
  console.error(`Error applying migrations: ${err.message}`);
  console.log('Continuing despite migration error...');
}

// 5. Test database connection with the new client
console.log('\n🧪 Testing database connection with the new Prisma client...');
try {
  const testConnScript = `
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  async function testConnection() {
    try {
      console.log('Attempting to connect to the database...');
      const result = await prisma.$queryRaw\`SELECT 1 AS result\`;
      console.log('Connection successful! Result:', result);
      await prisma.$disconnect();
      return true;
    } catch (error) {
      console.error('Database connection error:', error.message);
      await prisma.$disconnect();
      return false;
    }
  }
  
  testConnection()
    .then(success => {
      console.log('Connection test ' + (success ? 'succeeded' : 'failed'));
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
  `;

  const testFilePath = path.join(questionnairePath, 'test-connection.js');
  fs.writeFileSync(testFilePath, testConnScript);
  
  console.log('Executing test connection script...');
  execSync(`node ${testFilePath}`, { stdio: 'inherit' });
  
  // Clean up
  fs.unlinkSync(testFilePath);
  
  console.log('✅ Database connection test successful');
} catch (err) {
  console.error(`Error testing database connection: ${err.message}`);
  console.log('Database connectivity still has issues');
}

console.log('\n✅ Prisma client fix completed');
console.log('\n🚀 You can now restart the questionnaire service');
