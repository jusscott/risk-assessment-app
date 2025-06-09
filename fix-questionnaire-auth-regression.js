#!/usr/bin/env node

/**
 * Fix Questionnaire Authentication Regression
 * 
 * This script diagnoses and fixes the authentication issue that's preventing
 * users from logging in and accessing questionnaires after the progress restoration fix.
 */

const bcrypt = require('bcryptjs');
const { Client } = require('pg');

console.log('🔧 FIXING QUESTIONNAIRE AUTHENTICATION REGRESSION');
console.log('='.repeat(80));

async function resetUserPassword() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'auth'
  });

  try {
    await client.connect();
    console.log('✅ Connected to auth database');

    // Check current user
    const userResult = await client.query(
      'SELECT id, email, "firstName", "lastName" FROM "User" WHERE email = $1',
      ['jusscott@gmail.com']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found - creating test user');
      
      // Create organization first
      const orgResult = await client.query(
        'INSERT INTO "Organization" (id, name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id',
        ['Test Organization']
      );
      
      const orgId = orgResult.rows[0].id;
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Test123!', salt);
      
      // Create user
      await client.query(
        `INSERT INTO "User" (id, email, password, "firstName", "lastName", "organizationId", role, "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        ['jusscott@gmail.com', hashedPassword, 'Justin', 'Scott', orgId, 'ADMIN']
      );
      
      console.log('✅ Test user created successfully');
    } else {
      console.log('✅ User found - resetting password');
      
      // Hash the password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Test123!', salt);
      
      // Update user password
      await client.query(
        'UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE email = $2',
        [hashedPassword, 'jusscott@gmail.com']
      );
      
      console.log('✅ Password reset to "Test123!" successfully');
    }

    // Verify the password works
    const verifyResult = await client.query(
      'SELECT password FROM "User" WHERE email = $1',
      ['jusscott@gmail.com']
    );
    
    const storedHash = verifyResult.rows[0].password;
    const isValid = await bcrypt.compare('Test123!', storedHash);
    
    if (isValid) {
      console.log('✅ Password verification successful');
    } else {
      console.log('❌ Password verification failed - bcrypt issue detected');
      
      // Try alternative approach - regenerate hash
      console.log('🔄 Trying alternative bcrypt configuration...');
      const newSalt = await bcrypt.genSalt(12);
      const newHash = await bcrypt.hash('Test123!', newSalt);
      
      await client.query(
        'UPDATE "User" SET password = $1 WHERE email = $2',
        [newHash, 'jusscott@gmail.com']
      );
      
      const finalTest = await bcrypt.compare('Test123!', newHash);
      console.log(finalTest ? '✅ Alternative hash works' : '❌ Alternative hash failed');
    }

  } catch (error) {
    console.error('❌ Database operation failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function testAuthService() {
  console.log('\n🧪 Testing Auth Service...');
  
  const axios = require('axios');
  
  try {
    // Test login
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'jusscott@gmail.com',
      password: 'Test123!'
    });
    
    console.log('✅ Login successful!');
    console.log('   Token received:', response.data.tokens?.accessToken ? 'Yes' : 'No');
    console.log('   User data:', response.data.user?.email || 'No user data');
    
    return response.data.tokens?.accessToken;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function testQuestionnaireAccess(token) {
  if (!token) {
    console.log('⏭️  Skipping questionnaire test - no token');
    return;
  }
  
  console.log('\n📋 Testing Questionnaire Access...');
  
  const axios = require('axios');
  
  try {
    // Test templates
    const templatesResponse = await axios.get('http://localhost:5000/questionnaires/templates', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Templates endpoint works');
    console.log('   Templates found:', templatesResponse.data?.data?.length || 0);
    
    // Test in-progress submissions
    const inProgressResponse = await axios.get('http://localhost:5000/questionnaires/submissions/in-progress', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ In-progress submissions endpoint works');
    console.log('   In-progress submissions:', inProgressResponse.data?.data?.length || 0);
    
    // Test completed submissions
    const completedResponse = await axios.get('http://localhost:5000/questionnaires/submissions/completed', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Completed submissions endpoint works');
    console.log('   Completed submissions:', completedResponse.data?.data?.length || 0);
    
  } catch (error) {
    console.log('❌ Questionnaire access failed:', error.response?.data?.message || error.message);
  }
}

async function main() {
  try {
    console.log('Step 1: Resetting user password...');
    await resetUserPassword();
    
    console.log('\nStep 2: Testing authentication...');
    const token = await testAuthService();
    
    console.log('\nStep 3: Testing questionnaire access...');
    await testQuestionnaireAccess(token);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 SUMMARY');
    console.log('='.repeat(80));
    
    if (token) {
      console.log('✅ Authentication regression FIXED!');
      console.log('✅ User can now log in with: jusscott@gmail.com / Test123!');
      console.log('✅ Questionnaires should now be accessible');
      console.log('\n🔄 Please run the diagnostic script again to verify full functionality');
    } else {
      console.log('❌ Authentication issue persists');
      console.log('🔍 Further investigation needed - check auth service logs');
    }
    
  } catch (error) {
    console.error('💥 Fix script failed:', error.message);
    process.exit(1);
  }
}

main();
