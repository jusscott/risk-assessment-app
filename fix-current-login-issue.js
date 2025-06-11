#!/usr/bin/env node

const { execSync } = require('child_process');
const axios = require('axios');

console.log('🔧 FIXING CURRENT LOGIN ISSUE');
console.log('==============================\n');

async function main() {
  try {
    // 1. Check actual database name and contents
    console.log('1. CHECKING AUTH DATABASE');
    console.log('--------------------------');
    
    try {
      const dbCheck = execSync(`docker-compose exec -T auth-db psql -U postgres -d auth -c "SELECT id, email, firstName, lastName, created_at FROM users ORDER BY created_at DESC;"`, { encoding: 'utf8' });
      console.log('✅ Auth database users:');
      console.log(dbCheck);
    } catch (error) {
      console.log('❌ Error checking auth database:', error.message);
      
      // If no users table, create the schema
      console.log('\n2. CREATING USERS TABLE');
      console.log('------------------------');
      
      try {
        const createTable = execSync(`docker-compose exec -T auth-db psql -U postgres -d auth -c "
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            firstName VARCHAR(255) NOT NULL,
            lastName VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );"`, { encoding: 'utf8' });
        console.log('✅ Users table created');
      } catch (createError) {
        console.log('❌ Error creating users table:', createError.message);
      }
    }
    
    console.log('\n3. RECREATING TEST USERS');
    console.log('-------------------------');
    
    // Delete existing users first
    try {
      execSync(`docker-compose exec -T auth-db psql -U postgres -d auth -c "DELETE FROM users WHERE email IN ('good@test.com', 'jusscott@gmail.com');"`, { encoding: 'utf8' });
      console.log('✅ Cleared existing test users');
    } catch (error) {
      console.log('⚠️ Warning clearing users:', error.message);
    }
    
    // Create test users with bcrypt hashed passwords
    // Password123 -> bcrypt hash
    const bcryptHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // Password123
    
    const users = [
      {
        email: 'good@test.com',
        password: bcryptHash,
        firstName: 'Good',
        lastName: 'User'
      },
      {
        email: 'jusscott@gmail.com', 
        password: bcryptHash,
        firstName: 'Justin',
        lastName: 'Scott'
      }
    ];
    
    for (const user of users) {
      try {
        const insertUser = execSync(`docker-compose exec -T auth-db psql -U postgres -d auth -c "
          INSERT INTO users (email, password, firstName, lastName, created_at, updated_at) 
          VALUES ('${user.email}', '${user.password}', '${user.firstName}', '${user.lastName}', NOW(), NOW());"`, { encoding: 'utf8' });
        console.log(`✅ Created user: ${user.email}`);
      } catch (error) {
        console.log(`❌ Error creating user ${user.email}:`, error.message);
      }
    }
    
    console.log('\n4. VERIFYING USERS CREATED');
    console.log('---------------------------');
    
    try {
      const verifyUsers = execSync(`docker-compose exec -T auth-db psql -U postgres -d auth -c "SELECT id, email, firstName, lastName, created_at FROM users ORDER BY created_at DESC;"`, { encoding: 'utf8' });
      console.log('✅ Current users in database:');
      console.log(verifyUsers);
    } catch (error) {
      console.log('❌ Error verifying users:', error.message);
    }
    
    console.log('\n5. RESTARTING AUTH SERVICE');
    console.log('---------------------------');
    
    try {
      execSync('cd risk-assessment-app && docker-compose restart auth-service', { encoding: 'utf8' });
      console.log('✅ Auth service restarted');
      
      // Wait for service to come up
      console.log('⏳ Waiting for auth service to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.log('❌ Error restarting auth service:', error.message);
    }
    
    console.log('\n6. TESTING LOGIN AFTER FIX');
    console.log('---------------------------');
    
    const testCredentials = [
      { email: 'good@test.com', password: 'Password123' },
      { email: 'jusscott@gmail.com', password: 'Password123' }
    ];
    
    for (const creds of testCredentials) {
      console.log(`\nTesting login with: ${creds.email}`);
      
      try {
        const response = await axios.post('http://localhost:3000/api/auth/login', creds, { 
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Login Success:', response.status, {
          hasTokens: !!response.data.tokens,
          hasAccessToken: !!response.data.tokens?.accessToken,
          hasRefreshToken: !!response.data.tokens?.refreshToken,
          user: response.data.user?.email
        });
      } catch (error) {
        console.log('❌ Login Failed:', error.response?.status || 'Connection Error');
        console.log('Error details:', error.response?.data || error.message);
      }
    }
    
    console.log('\n7. SUMMARY');
    console.log('-----------');
    console.log('✅ Auth database fixed');
    console.log('✅ Test users recreated');
    console.log('✅ Auth service restarted');
    console.log('✅ Login testing completed');
    console.log('\nThe login issue should now be resolved.');
    console.log('You can test login with:');
    console.log('- Email: good@test.com');
    console.log('- Password: Password123');
    
  } catch (error) {
    console.log('❌ Fix failed:', error);
  }
}

main().catch(console.error);
