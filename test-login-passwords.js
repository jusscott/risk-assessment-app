#!/usr/bin/env node

const axios = require('axios');

async function testLoginWithPasswords(email, passwords) {
  console.log(`\n🔐 Testing login for: ${email}`);
  console.log('='.repeat(60));

  for (const password of passwords) {
    console.log(`\n🔑 Trying password: "${password}"`);
    
    try {
      const response = await axios.post('http://localhost:5001/login', {
        email,
        password
      }, {
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      });

      console.log(`Status: ${response.status}`);
      
      if (response.data.success && response.data.data?.tokens) {
        console.log(`✅ SUCCESS! Correct password is: "${password}"`);
        console.log(`User: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
        console.log(`Role: ${response.data.data.user.role}`);
        console.log(`Token: ${response.data.data.tokens.accessToken.substring(0, 20)}...`);
        return password;
      } else {
        console.log(`❌ Failed - ${response.data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n❌ No valid password found for ${email}`);
  return null;
}

async function main() {
  console.log('🚀 Testing Login Passwords');
  console.log('===========================');
  
  // Common password variations to test
  const commonPasswords = [
    'password123',
    'Password123',
    'testpassword123',
    'Testpassword123',
    'password',
    'Password',
    'test123',
    'Test123',
    'admin123',
    'Admin123',
    'jusscott123',
    'Jusscott123',
    'good123',
    'Good123'
  ];

  // Test both users
  const emails = ['good@test.com', 'jusscott@gmail.com'];
  
  const validCredentials = {};
  
  for (const email of emails) {
    const validPassword = await testLoginWithPasswords(email, commonPasswords);
    if (validPassword) {
      validCredentials[email] = validPassword;
    }
  }
  
  console.log('\n\n🎯 RESULTS');
  console.log('==========');
  
  if (Object.keys(validCredentials).length > 0) {
    console.log('✅ Found valid credentials:');
    for (const [email, password] of Object.entries(validCredentials)) {
      console.log(`   📧 ${email} -> 🔑 ${password}`);
    }
    
    // Test API Gateway login with found credentials
    console.log('\n🌐 Testing API Gateway with valid credentials...');
    for (const [email, password] of Object.entries(validCredentials)) {
      try {
        const gatewayResponse = await axios.post('http://localhost:5000/api/auth/login', {
          email,
          password
        }, {
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500;
          }
        });
        
        if (gatewayResponse.data.success) {
          console.log(`✅ API Gateway login SUCCESS for ${email}`);
        } else {
          console.log(`❌ API Gateway login FAILED for ${email}: ${gatewayResponse.data.error?.message}`);
        }
      } catch (error) {
        console.log(`❌ API Gateway login ERROR for ${email}: ${error.message}`);
      }
    }
  } else {
    console.log('❌ No valid credentials found. This may indicate:');
    console.log('   1. Bcrypt comparison is broken');
    console.log('   2. Password hashes are corrupted');
    console.log('   3. Different passwords were used than expected');
  }
}

main().catch(console.error);
