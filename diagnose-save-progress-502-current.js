#!/usr/bin/env node

/**
 * Comprehensive Save Progress 502 Error Diagnostic Script
 * 
 * This script analyzes the current state of the save progress functionality
 * to identify where the 502 Bad Gateway error is occurring.
 */

const axios = require('axios');
const { execSync } = require('child_process');

const API_URL = 'http://localhost:5000';
const QUESTIONNAIRE_SERVICE_URL = 'http://localhost:3003';

// Test credentials
const testCredentials = {
  email: 'good@test.com',
  password: 'Password123'
};

console.log('🔍 COMPREHENSIVE SAVE PROGRESS 502 ERROR DIAGNOSTIC');
console.log('=' .repeat(60));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServiceHealth() {
  console.log('\n📊 SERVICE HEALTH CHECK');
  console.log('-'.repeat(40));
  
  const services = [
    { name: 'API Gateway', url: `${API_URL}/health` },
    { name: 'Auth Service', url: `${API_URL}/api/auth/health` },
    { name: 'Questionnaire Service', url: `${API_URL}/api/questionnaires/health` },
    { name: 'Questionnaire Direct', url: `${QUESTIONNAIRE_SERVICE_URL}/health` }
  ];
  
  for (const service of services) {
    try {
      const start = Date.now();
      const response = await axios.get(service.url, { timeout: 5000 });
      const duration = Date.now() - start;
      
      console.log(`✅ ${service.name}: ${response.status} (${duration}ms)`);
      if (response.data) {
        console.log(`   Data: ${JSON.stringify(response.data).substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name}: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 100)}`);
      }
    }
  }
}

async function checkDockerServices() {
  console.log('\n🐳 DOCKER SERVICE STATUS');
  console.log('-'.repeat(40));
  
  try {
    const containers = execSync('docker-compose ps --format "table {{.Name}}\\t{{.State}}\\t{{.Status}}"', 
      { encoding: 'utf8', cwd: __dirname });
    console.log(containers);
    
    console.log('\n📊 Service Uptime:');
    const stats = execSync('docker-compose ps --format "{{.Name}}: {{.Status}}"', 
      { encoding: 'utf8', cwd: __dirname });
    console.log(stats);
  } catch (error) {
    console.log(`❌ Docker command failed: ${error.message}`);
  }
}

async function authenticateUser() {
  console.log('\n🔐 USER AUTHENTICATION');
  console.log('-'.repeat(40));
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, testCredentials, {
      timeout: 10000
    });
    
    if (response.data?.success && response.data?.data?.tokens?.accessToken) {
      const token = response.data.data.tokens.accessToken;
      console.log('✅ Authentication successful');
      console.log(`   Token length: ${token.length}`);
      console.log(`   Token preview: ${token.substring(0, 20)}...`);
      return token;
    } else {
      console.log('❌ Authentication failed - invalid response structure');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.log(`❌ Authentication failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function testSaveProgressFlow(token) {
  console.log('\n💾 SAVE PROGRESS FLOW TEST');
  console.log('-'.repeat(40));
  
  if (!token) {
    console.log('❌ No authentication token available');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Step 1: Get in-progress submissions
    console.log('1️⃣ Getting in-progress submissions...');
    const submissionsResponse = await axios.get(`${API_URL}/api/submissions/in-progress`, {
      headers,
      timeout: 10000
    });
    
    console.log(`✅ In-progress submissions: ${submissionsResponse.status}`);
    console.log(`   Found ${submissionsResponse.data?.data?.length || 0} submissions`);
    
    if (!submissionsResponse.data?.data?.length) {
      console.log('⚠️ No in-progress submissions found. Creating one...');
      
      // Get available templates first
      const templatesResponse = await axios.get(`${API_URL}/api/questionnaires/templates`, {
        headers,
        timeout: 10000
      });
      
      if (templatesResponse.data?.data?.length > 0) {
        const templateId = templatesResponse.data.data[0].id;
        console.log(`   Using template ID: ${templateId}`);
        
        // Start a new submission
        const newSubmissionResponse = await axios.post(`${API_URL}/api/submissions`, {
          templateId: templateId
        }, {
          headers,
          timeout: 10000
        });
        
        console.log(`✅ New submission created: ${newSubmissionResponse.status}`);
        console.log(`   Submission ID: ${newSubmissionResponse.data?.data?.id}`);
        
        const submissionId = newSubmissionResponse.data?.data?.id;
        if (submissionId) {
          await testUpdateSubmission(submissionId, token, headers);
        }
      } else {
        console.log('❌ No templates available to create submission');
      }
    } else {
      // Use existing submission
      const submissionId = submissionsResponse.data.data[0].id;
      console.log(`   Using existing submission ID: ${submissionId}`);
      await testUpdateSubmission(submissionId, token, headers);
    }
    
  } catch (error) {
    console.log(`❌ Save progress flow failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Headers:`, JSON.stringify(error.response.headers, null, 2));
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
      
      // Check if this is the 502 error we're looking for
      if (error.response.status === 502) {
        console.log('🚨 502 BAD GATEWAY ERROR DETECTED!');
        console.log('   This is the error we are trying to fix');
        
        // Additional 502 error analysis
        await analyze502Error(error);
      }
    }
    if (error.code) {
      console.log(`   Error Code: ${error.code}`);
    }
  }
}

async function testUpdateSubmission(submissionId, token, headers) {
  console.log(`\n2️⃣ Testing submission update (ID: ${submissionId})...`);
  
  const testAnswers = {
    1: "Test answer 1",
    2: "Test answer 2",
    3: "Yes"
  };
  
  try {
    const start = Date.now();
    const updateResponse = await axios.put(`${API_URL}/api/submissions/${submissionId}`, {
      answers: testAnswers
    }, {
      headers,
      timeout: 15000 // Longer timeout for save operations
    });
    
    const duration = Date.now() - start;
    console.log(`✅ Submission update successful: ${updateResponse.status} (${duration}ms)`);
    console.log(`   Response:`, JSON.stringify(updateResponse.data, null, 2));
    
  } catch (error) {
    console.log(`❌ Submission update failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
      
      // Check if this is the 502 error
      if (error.response.status === 502) {
        console.log('🚨 502 BAD GATEWAY ERROR ON SAVE PROGRESS!');
        await analyze502Error(error);
      }
    }
  }
}

async function analyze502Error(error) {
  console.log('\n🔬 502 ERROR ANALYSIS');
  console.log('-'.repeat(40));
  
  console.log('Error details:');
  console.log(`   Message: ${error.message}`);
  console.log(`   Code: ${error.code || 'N/A'}`);
  console.log(`   URL: ${error.config?.url || 'N/A'}`);
  console.log(`   Method: ${error.config?.method?.toUpperCase() || 'N/A'}`);
  
  if (error.response) {
    console.log(`   Response Status: ${error.response.status}`);
    console.log(`   Response Headers:`, JSON.stringify(error.response.headers, null, 2));
    console.log(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
  }
  
  // Test direct connection to questionnaire service
  console.log('\n🔌 Testing direct questionnaire service connection...');
  try {
    const directResponse = await axios.get(`${QUESTIONNAIRE_SERVICE_URL}/health`, {
      timeout: 5000
    });
    console.log(`✅ Direct connection to questionnaire service: ${directResponse.status}`);
  } catch (directError) {
    console.log(`❌ Direct connection failed: ${directError.message}`);
  }
  
  // Check API Gateway logs
  console.log('\n📋 Checking recent API Gateway logs...');
  try {
    const logs = execSync('docker-compose logs --tail=20 api-gateway', 
      { encoding: 'utf8', cwd: __dirname });
    console.log('Recent API Gateway logs:');
    console.log(logs);
  } catch (logError) {
    console.log(`❌ Could not retrieve logs: ${logError.message}`);
  }
}

async function checkNetworkConnectivity() {
  console.log('\n🌐 NETWORK CONNECTIVITY CHECK');
  console.log('-'.repeat(40));
  
  const endpoints = [
    { name: 'API Gateway Health', url: `${API_URL}/health` },
    { name: 'Questionnaire Service Health (via Gateway)', url: `${API_URL}/api/questionnaires/health` },
    { name: 'Questionnaire Service Health (Direct)', url: `${QUESTIONNAIRE_SERVICE_URL}/health` },
    { name: 'Auth Service Health', url: `${API_URL}/api/auth/health` }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await axios.get(endpoint.url, { 
        timeout: 5000,
        headers: { 'X-Test': 'connectivity-check' }
      });
      const duration = Date.now() - start;
      
      console.log(`✅ ${endpoint.name}: ${response.status} (${duration}ms)`);
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   → Service appears to be down or unreachable`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   → Connection timed out`);
      }
    }
  }
}

async function main() {
  try {
    await checkDockerServices();
    await checkServiceHealth();
    await checkNetworkConnectivity();
    
    const token = await authenticateUser();
    if (token) {
      await testSaveProgressFlow(token);
    }
    
    console.log('\n🎯 DIAGNOSTIC SUMMARY');
    console.log('-'.repeat(40));
    console.log('This diagnostic script has analyzed:');
    console.log('• Docker service status and uptime');
    console.log('• Service health endpoints');
    console.log('• Network connectivity between services');
    console.log('• Authentication flow');
    console.log('• Save progress functionality');
    console.log('• 502 error analysis when detected');
    console.log('\nIf 502 errors were detected, check the analysis above for root cause.');
    
  } catch (error) {
    console.error('\n💥 Diagnostic script failed:', error.message);
    console.error(error.stack);
  }
}

// Run the diagnostic
main().catch(console.error);
