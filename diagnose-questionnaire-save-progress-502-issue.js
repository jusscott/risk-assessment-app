#!/usr/bin/env node

/**
 * Comprehensive diagnosis of questionnaire save progress 502 errors
 * Testing the complete flow from API Gateway to Questionnaire Service
 */

const axios = require('axios');

// Configuration
const API_GATEWAY_URL = 'http://localhost:5000';
const QUESTIONNAIRE_SERVICE_URL = 'http://localhost:5002';

console.log('🔍 Diagnosing Questionnaire Save Progress 502 Issue');
console.log('='.repeat(60));
console.log(`API Gateway: ${API_GATEWAY_URL}`);
console.log(`Questionnaire Service: ${QUESTIONNAIRE_SERVICE_URL}`);
console.log('='.repeat(60));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testServiceConnectivity() {
  console.log('\n📡 Testing Service Connectivity');
  console.log('-'.repeat(40));
  
  try {
    // Test API Gateway health
    console.log('1. Testing API Gateway health...');
    const gatewayHealth = await axios.get(`${API_GATEWAY_URL}/health`, { timeout: 5000 });
    console.log('✅ API Gateway is healthy');
    
    // Test Questionnaire Service health  
    console.log('2. Testing Questionnaire Service health (direct)...');
    const questionnaireHealth = await axios.get(`${QUESTIONNAIRE_SERVICE_URL}/health`, { timeout: 5000 });
    console.log('✅ Questionnaire Service is healthy (direct)');
    console.log('   Response:', JSON.stringify(questionnaireHealth.data, null, 2));
    
    // Test Questionnaire Service through API Gateway
    console.log('3. Testing Questionnaire Service through API Gateway...');
    try {
      const gatewayToQuestionnaire = await axios.get(`${API_GATEWAY_URL}/api/questionnaires/templates`, { timeout: 5000 });
      console.log('✅ API Gateway → Questionnaire Service routing works');
      console.log(`   Found ${gatewayToQuestionnaire.data.data.length} templates`);
    } catch (error) {
      console.log('❌ API Gateway → Questionnaire Service routing failed');
      console.log('   Error:', error.response?.status, error.response?.statusText);
      console.log('   Data:', error.response?.data);
    }
    
  } catch (error) {
    console.log('❌ Service connectivity test failed');
    console.log('Error:', error.message);
    return false;
  }
  
  return true;
}

async function testSubmissionEndpoints() {
  console.log('\n🎯 Testing Submission Endpoints');
  console.log('-'.repeat(40));
  
  // Test direct access to questionnaire service submissions endpoint
  console.log('1. Testing submissions endpoint (direct to questionnaire service)...');
  try {
    const directSubmissions = await axios.get(`${QUESTIONNAIRE_SERVICE_URL}/api/submissions`, { timeout: 5000 });
    console.log('✅ Direct submissions endpoint works');
    console.log('   Response:', JSON.stringify(directSubmissions.data, null, 2));
  } catch (error) {
    console.log('❌ Direct submissions endpoint failed');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data || error.message);
  }
  
  await sleep(1000);
  
  // Test through API Gateway
  console.log('2. Testing submissions endpoint (through API Gateway)...');
  try {
    const gatewaySubmissions = await axios.get(`${API_GATEWAY_URL}/api/questionnaires/submissions`, { timeout: 5000 });
    console.log('✅ Gateway submissions endpoint works');
    console.log('   Response:', JSON.stringify(gatewaySubmissions.data, null, 2));
  } catch (error) {
    console.log('❌ Gateway submissions endpoint failed');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data || error.message);
  }
}

async function testPutRequestRouting() {
  console.log('\n🔄 Testing PUT Request Routing');
  console.log('-'.repeat(40));
  
  // Create a mock PUT request payload
  const mockAnswers = {
    "1": "Yes",
    "2": "No", 
    "3": "Partially"
  };
  
  console.log('1. Testing PUT /submissions/1 (direct to questionnaire service)...');
  try {
    const directPut = await axios.put(
      `${QUESTIONNAIRE_SERVICE_URL}/api/submissions/1`,
      { answers: mockAnswers },
      { 
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        validateStatus: (status) => status < 500 // Accept 400s but not 500s
      }
    );
    console.log('✅ Direct PUT request routed successfully');
    console.log('   Status:', directPut.status);
    console.log('   Response:', JSON.stringify(directPut.data, null, 2));
  } catch (error) {
    if (error.response?.status >= 400 && error.response?.status < 500) {
      console.log('⚠️  Direct PUT request routed (expected auth/validation error)');
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data?.message || error.response.data);
    } else {
      console.log('❌ Direct PUT request failed (routing issue)');
      console.log('   Status:', error.response?.status || 'No response');
      console.log('   Error:', error.response?.data || error.message);
    }
  }
  
  await sleep(1000);
  
  console.log('2. Testing PUT /submissions/1 (through API Gateway)...');
  try {
    const gatewayPut = await axios.put(
      `${API_GATEWAY_URL}/api/questionnaires/submissions/1`,
      { answers: mockAnswers },
      { 
        timeout: 10000, // Longer timeout for gateway
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        validateStatus: (status) => status < 500 // Accept 400s but not 500s
      }
    );
    console.log('✅ Gateway PUT request routed successfully');
    console.log('   Status:', gatewayPut.status);
    console.log('   Response:', JSON.stringify(gatewayPut.data, null, 2));
  } catch (error) {
    if (error.response?.status >= 400 && error.response?.status < 500) {
      console.log('⚠️  Gateway PUT request routed (expected auth/validation error)');
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data?.message || error.response.data);
    } else if (error.response?.status === 502) {
      console.log('🚨 FOUND THE ISSUE: Gateway returning 502 Bad Gateway');
      console.log('   This means API Gateway cannot reach Questionnaire Service for PUT requests');
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data || error.message);
      
      return 'GATEWAY_502_ERROR';
    } else {
      console.log('❌ Gateway PUT request failed');
      console.log('   Status:', error.response?.status || 'No response');
      console.log('   Error:', error.response?.data || error.message);
    }
  }
  
  return null;
}

async function testDockerNetworking() {
  console.log('\n🐳 Testing Docker Networking');
  console.log('-'.repeat(40));
  
  try {
    // Check if services can resolve each other by hostname
    console.log('Testing internal Docker network connectivity...');
    console.log('(This test runs external requests but simulates internal networking)');
    
    // Test different URLs that the API Gateway might be using internally
    const internalUrls = [
      'http://questionnaire-service:5002/api/submissions',
      'http://questionnaire-service:5002/submissions',
      'http://localhost:5002/api/submissions',
      'http://localhost:5002/submissions'
    ];
    
    for (const url of internalUrls) {
      try {
        console.log(`Testing URL: ${url}...`);
        const response = await axios.get(url, { timeout: 3000 });
        console.log(`✅ ${url} - accessible`);
      } catch (error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          console.log(`❌ ${url} - network issue (${error.code})`);
        } else if (error.response?.status >= 400 && error.response?.status < 500) {
          console.log(`⚠️  ${url} - accessible but returns ${error.response.status}`);
        } else {
          console.log(`❌ ${url} - error: ${error.message}`);
        }
      }
      await sleep(500);
    }
    
  } catch (error) {
    console.log('❌ Docker networking test failed:', error.message);
  }
}

async function main() {
  try {
    // Test basic connectivity
    const connectivityOk = await testServiceConnectivity();
    if (!connectivityOk) {
      console.log('\n🛑 Basic connectivity failed - aborting');
      return;
    }
    
    // Test submission endpoints
    await testSubmissionEndpoints();
    
    // Test PUT request routing (the main issue)
    const putIssue = await testPutRequestRouting();
    
    // Test Docker networking
    await testDockerNetworking();
    
    console.log('\n📋 DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    
    if (putIssue === 'GATEWAY_502_ERROR') {
      console.log('🚨 ISSUE IDENTIFIED: API Gateway 502 Bad Gateway Error');
      console.log('');
      console.log('PROBLEM:');
      console.log('- API Gateway cannot forward PUT requests to Questionnaire Service');
      console.log('- GET requests work fine, but PUT requests fail with 502');
      console.log('- This suggests a routing configuration issue in API Gateway');
      console.log('');
      console.log('LIKELY CAUSES:');
      console.log('1. Questionnaire Service recently restarted (only 3 min up)');
      console.log('2. API Gateway still using old service discovery info');
      console.log('3. PUT request routing configuration differs from GET');
      console.log('4. Timeout or connection pooling issue for PUT requests');
      console.log('');
      console.log('RECOMMENDED ACTIONS:');
      console.log('1. Restart API Gateway to refresh service connections');
      console.log('2. Check API Gateway proxy configuration for PUT methods');
      console.log('3. Verify service discovery/routing rules');
    } else {
      console.log('ℹ️  Issue may be more complex - manual investigation needed');
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    process.exit(1);
  }
}

// Run the diagnosis
main().catch(console.error);
