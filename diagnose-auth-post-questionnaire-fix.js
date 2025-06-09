#!/usr/bin/env node

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔍 Authentication Regression Diagnostic - Post Questionnaire Fix');
console.log('================================================================');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServiceHealth(serviceName, url, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await axios.get(url, { timeout: 2000 });
      if (response.status === 200) {
        console.log(`✅ ${serviceName} is healthy`);
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    await sleep(1000);
  }
  console.log(`❌ ${serviceName} failed to start within ${timeout}ms`);
  return false;
}

async function testRegistration() {
  console.log('\n📝 Testing User Registration...');
  
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    organizationName: 'Test Organization'
  };

  try {
    const response = await axios.post('http://localhost:5001/api/auth/register', testUser, {
      timeout: 5000
    });

    if (response.status === 201 && response.data.success) {
      console.log('✅ Registration successful');
      console.log(`   - User ID: ${response.data.data.user.id}`);
      console.log(`   - Email: ${response.data.data.user.email}`);
      console.log(`   - Access Token: ${response.data.data.tokens.accessToken ? 'Generated' : 'Missing'}`);
      return { success: true, user: testUser, tokens: response.data.data.tokens };
    } else {
      console.log('❌ Registration failed - Unexpected response format');
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return { success: false, error: 'Unexpected response format' };
    }
  } catch (error) {
    console.log('❌ Registration failed');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function testLogin(user) {
  console.log('\n🔐 Testing User Login...');
  
  try {
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: user.email,
      password: user.password
    }, {
      timeout: 5000
    });

    if (response.status === 200 && response.data.success) {
      console.log('✅ Login successful');
      console.log(`   - User ID: ${response.data.data.user.id}`);
      console.log(`   - Email: ${response.data.data.user.email}`);
      console.log(`   - Access Token: ${response.data.data.tokens.accessToken ? 'Generated' : 'Missing'}`);
      return { success: true, tokens: response.data.data.tokens };
    } else {
      console.log('❌ Login failed - Unexpected response format');
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return { success: false, error: 'Unexpected response format' };
    }
  } catch (error) {
    console.log('❌ Login failed');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data)}`);
      
      // Check specific bcrypt/password comparison errors
      if (error.response.data.error && error.response.data.error.code === 'INVALID_PASSWORD') {
        console.log('🚨 PASSWORD COMPARISON FAILURE - This indicates bcrypt regression!');
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function testLoginWithWrongPassword(user) {
  console.log('\n🔒 Testing Login with Wrong Password...');
  
  try {
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: user.email,
      password: 'WrongPassword123!'
    }, {
      timeout: 5000
    });

    // This should fail
    console.log('❌ Login with wrong password should have failed but succeeded');
    return { success: false, error: 'Security issue - wrong password accepted' };
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Login correctly rejected wrong password');
      return { success: true };
    } else {
      console.log('❌ Login failed with unexpected error');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${JSON.stringify(error.response.data)}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
      return { success: false, error: error.message };
    }
  }
}

async function testTokenValidation(token) {
  console.log('\n🎫 Testing Token Validation...');
  
  try {
    const response = await axios.post('http://localhost:5001/api/auth/validate-token', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });

    if (response.status === 200 && response.data.success) {
      console.log('✅ Token validation successful');
      console.log(`   - User ID: ${response.data.data.user.id}`);
      console.log(`   - Email: ${response.data.data.user.email}`);
      return { success: true };
    } else {
      console.log('❌ Token validation failed - Unexpected response format');
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return { success: false, error: 'Unexpected response format' };
    }
  } catch (error) {
    console.log('❌ Token validation failed');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function checkAuthServiceLogs() {
  console.log('\n📋 Checking Auth Service Logs for bcrypt errors...');
  
  return new Promise((resolve) => {
    const docker = spawn('docker', ['logs', '--tail=50', 'risk-assessment-app-auth-service-1'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    docker.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    docker.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    docker.on('close', (code) => {
      const logs = stdout + stderr;
      
      if (logs.includes('bcrypt') || logs.includes('password') || logs.includes('hash')) {
        console.log('🔍 Found auth-related log entries:');
        const lines = logs.split('\n');
        lines.forEach(line => {
          if (line.toLowerCase().includes('bcrypt') || 
              line.toLowerCase().includes('password') || 
              line.toLowerCase().includes('hash') ||
              line.toLowerCase().includes('error')) {
            console.log(`   ${line}`);
          }
        });
      } else {
        console.log('ℹ️  No bcrypt-related errors found in recent logs');
      }
      
      resolve();
    });
  });
}

async function checkTypescriptCompilation() {
  console.log('\n🔧 Checking TypeScript compilation in auth service...');
  
  return new Promise((resolve) => {
    const docker = spawn('docker', ['exec', 'risk-assessment-app-auth-service-1', 'npm', 'run', 'build'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    docker.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    docker.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    docker.on('close', (code) => {
      if (code === 0) {
        console.log('✅ TypeScript compilation successful');
      } else {
        console.log('❌ TypeScript compilation failed');
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
      }
      resolve();
    });
  });
}

async function main() {
  console.log('Starting authentication regression diagnostic...\n');

  // Check if services are running
  console.log('🔍 Checking service health...');
  const authHealthy = await checkServiceHealth('Auth Service', 'http://localhost:5001/health');
  
  if (!authHealthy) {
    console.log('\n❌ Auth service is not healthy. Please ensure Docker services are running.');
    console.log('   Run: docker-compose up -d');
    process.exit(1);
  }

  // Check TypeScript compilation
  await checkTypescriptCompilation();

  // Check service logs for errors
  await checkAuthServiceLogs();

  // Test authentication flow
  const registrationResult = await testRegistration();
  
  if (!registrationResult.success) {
    console.log('\n🚨 CRITICAL: Registration is failing - authentication system is broken');
    process.exit(1);
  }

  const loginResult = await testLogin(registrationResult.user);
  
  if (!loginResult.success) {
    console.log('\n🚨 CRITICAL: Login is failing - password comparison is broken');
    console.log('   This confirms a bcrypt regression issue!');
    process.exit(1);
  }

  const wrongPasswordResult = await testLoginWithWrongPassword(registrationResult.user);
  
  if (!wrongPasswordResult.success) {
    console.log('\n🚨 WARNING: Password validation logic may be compromised');
  }

  const tokenResult = await testTokenValidation(loginResult.tokens.accessToken);
  
  if (!tokenResult.success) {
    console.log('\n🚨 WARNING: Token validation is failing');
  }

  console.log('\n🎉 SUMMARY:');
  console.log('===========');
  console.log(`Registration: ${registrationResult.success ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`Login: ${loginResult.success ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`Wrong Password Rejection: ${wrongPasswordResult.success ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`Token Validation: ${tokenResult.success ? '✅ WORKING' : '❌ BROKEN'}`);

  if (registrationResult.success && loginResult.success && wrongPasswordResult.success && tokenResult.success) {
    console.log('\n✅ Authentication system appears to be working correctly');
    console.log('   No bcrypt regression detected');
  } else {
    console.log('\n❌ Authentication system has issues - bcrypt regression likely');
  }
}

main().catch(console.error);
