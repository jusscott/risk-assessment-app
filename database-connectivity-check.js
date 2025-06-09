const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

async function checkDatabaseConnection() {
  console.log('Starting database connectivity check...');

  // Load environment variables from .env file
  const envPath = path.join(__dirname, 'backend/questionnaire-service/.env');
  console.log(`Loading environment from: ${envPath}`);
  
  let dbUrl;
  try {
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      dbUrl = envConfig.DATABASE_URL;
      console.log('Found DATABASE_URL in .env file');
    } else {
      console.error('No .env file found at:', envPath);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error reading .env file:', err);
    process.exit(1);
  }

  if (!dbUrl) {
    console.error('No DATABASE_URL environment variable found');
    process.exit(1);
  }

  // Extract connection parameters from DATABASE_URL
  console.log('Parsing connection details from DATABASE_URL');
  try {
    // postgresql://username:password@hostname:port/database
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      console.error('Invalid DATABASE_URL format');
      process.exit(1);
    }

    const username = match[1];
    const password = match[2];
    const host = match[3];
    const port = match[4];
    const database = match[5];

    console.log(`Connection parameters:
  - Host: ${host}
  - Port: ${port}
  - Database: ${database}
  - Username: ${username}
  - Password: ${'*'.repeat(password.length)}`);

    // Test direct connection to PostgreSQL
    console.log('\nAttempting to connect to PostgreSQL database...');
    
    const client = new Client({
      user: username,
      host: host,
      database: database,
      password: password,
      port: port,
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log('\n✅ Successfully connected to PostgreSQL database!');
      
      // Test query
      console.log('Testing simple query...');
      const res = await client.query('SELECT 1 AS result');
      console.log(`Query result: ${res.rows[0].result}`);
      
      await client.end();
      console.log('Connection closed successfully');
      return true;
    } catch (err) {
      console.error('\n❌ Failed to connect to database:', err.message);
      
      if (err.message.includes('ECONNREFUSED')) {
        console.log('\nTroubleshooting tips:');
        console.log('1. Check if PostgreSQL is running on the specified host and port');
        console.log(`2. Try connecting with: psql -h ${host} -p ${port} -U ${username} -d ${database}`);
        console.log('3. Check if any firewall is blocking connections');
        console.log('4. Verify the host and port are correct');
        
        // Port check
        console.log(`\nChecking if port ${port} is open...`);
        try {
          const { execSync } = require('child_process');
          execSync(`nc -z -w5 ${host} ${port}`, { stdio: 'pipe' });
          console.log(`✅ Port ${port} is open on ${host}`);
        } catch (err) {
          console.log(`❌ Port ${port} is not open on ${host} or connection timeout`);
          
          // Check if port 5432 is open (common default PostgreSQL port)
          if (port !== '5432') {
            try {
              execSync(`nc -z -w5 ${host} 5432`, { stdio: 'pipe' });
              console.log(`⚠️ Note: Default PostgreSQL port 5432 IS open on ${host}`);
              console.log('Consider updating DATABASE_URL to use port 5432 instead');
            } catch (portErr) {
              console.log(`Port 5432 is also not open on ${host}`);
            }
          }
        }
      }
      
      return false;
    }
  } catch (err) {
    console.error('Error during connection setup:', err);
    return false;
  }
}

// Run the function
checkDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('\nDatabase connectivity check completed successfully');
      process.exit(0);
    } else {
      console.error('\nDatabase connectivity check failed');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error during database check:', err);
    process.exit(1);
  });
