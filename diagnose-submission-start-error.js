#!/usr/bin/env node

const axios = require('axios');

/**
 * Comprehensive diagnostic for the submission start error
 * Tests the POST /api/questionnaires/submissions endpoint that's returning 500 errors
 */

const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  email: 'good@test.com',
  password: 'Password123'
};

async function runDiagnostic() {
  console.log('🔍 SUBMISSION START ERROR DIAGNOSTIC');
  console.log('=====================================\n');

  try {
    // Step 1: Login to get a valid token
    console.log('1. Authenticating user...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
    
    if (loginResponse.status !== 200 || !loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }

    const token = loginResponse.data.data.tokens?.accessToken;
    const userId = loginResponse.data.data.user.id;
    console.log(`✅ Login successful - User ID: ${userId}, Token: ${token ? token.substring(0, 20) + '...' : 'null'}`);

    // Step 2: Get available templates
    console.log('\n2. Fetching available templates...');
    const templatesResponse = await axios.get(`${BASE_URL}/api/questionnaires/templates`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!templatesResponse.data.success || !templatesResponse.data.data.length) {
      throw new Error('No templates available: ' + JSON.stringify(templatesResponse.data));
    }

    const templates = templatesResponse.data.data;
    const firstTemplate = templates[0];
    console.log(`✅ Found ${templates.length} templates`);
    console.log(`   First template: ID=${firstTemplate.id}, Name="${firstTemplate.name}"`);

    // Step 3: Attempt to start a new submission (this is where the error occurs)
    console.log('\n3. Attempting to start new submission...');
    console.log(`   POST ${BASE_URL}/api/questionnaires/submissions`);
    console.log(`   Payload: { templateId: ${firstTemplate.id} }`);
    console.log(`   Headers: Authorization: Bearer ${token ? token.substring(0, 20) + '...' : 'null'}`);

    try {
      const submissionResponse = await axios.post(
        `${BASE_URL}/api/questionnaires/submissions`,
        { templateId: firstTemplate.id },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Submission started successfully!');
      console.log('   Response:', JSON.stringify(submissionResponse.data, null, 2));

    } catch (submissionError) {
      console.log('❌ SUBMISSION START FAILED');
      console.log('   Status:', submissionError.response?.status);
      console.log('   Status Text:', submissionError.response?.statusText);
      console.log('   Response Data:', JSON.stringify(submissionError.response?.data, null, 2));
      console.log('   Request Config:', {
        url: submissionError.config?.url,
        method: submissionError.config?.method,
        data: submissionError.config?.data,
        headers: submissionError.config?.headers
      });

      // Step 4: Check direct questionnaire service (bypass API gateway)
      console.log('\n4. Testing direct questionnaire service...');
      try {
        const directResponse = await axios.post(
          'http://localhost:3002/api/submissions',
          { templateId: firstTemplate.id },
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('✅ Direct questionnaire service works!');
        console.log('   Response:', JSON.stringify(directResponse.data, null, 2));
      } catch (directError) {
        console.log('❌ Direct questionnaire service also fails');
        console.log('   Status:', directError.response?.status);
        console.log('   Response:', JSON.stringify(directError.response?.data, null, 2));
      }
    }

    // Step 5: Test with different data types
    console.log('\n5. Testing with different template ID formats...');
    
    const testCases = [
      { templateId: firstTemplate.id, description: 'Original (number)' },
      { templateId: String(firstTemplate.id), description: 'String conversion' },
      { templateId: parseInt(firstTemplate.id), description: 'Explicit parseInt' }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`   Testing ${testCase.description}: ${JSON.stringify(testCase.templateId)}`);
        const testResponse = await axios.post(
          'http://localhost:3002/api/submissions',
          { templateId: testCase.templateId },
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`   ✅ Success with ${testCase.description}`);
      } catch (testError) {
        console.log(`   ❌ Failed with ${testCase.description}: ${testError.response?.status} - ${testError.response?.data?.error?.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Check for Docker services
async function checkServices() {
  console.log('\n🔧 SERVICE STATUS CHECK');
  console.log('=======================');
  
  const services = [
    { name: 'API Gateway', url: 'http://localhost:5000/health' },
    { name: 'Auth Service', url: 'http://localhost:3001/health' },
    { name: 'Questionnaire Service', url: 'http://localhost:3002/health' }
  ];

  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 2000 });
      console.log(`✅ ${service.name}: Healthy`);
    } catch (error) {
      console.log(`❌ ${service.name}: ${error.code || error.message}`);
    }
  }
  console.log('');
}

async function main() {
  await checkServices();
  await runDiagnostic();
}

if (require.main === module) {
  main().catch(console.error);
}
