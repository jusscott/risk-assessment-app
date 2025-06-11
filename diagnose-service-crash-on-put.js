#!/usr/bin/env node

const axios = require('axios');

// Configuration
const CONFIG = {
  API_GATEWAY: 'http://localhost:3000',
  QUESTIONNAIRE_SERVICE: 'http://localhost:5002'
};

async function diagnosePutCrashIssue() {
  console.log('🔍 Diagnosing Questionnaire Service PUT Request Crash Issue');
  console.log('=' + '='.repeat(60));
  
  try {
    // 1. Check service health before PUT request
    console.log('\n1. Pre-PUT Health Check:');
    
    try {
      const healthResponse = await axios.get(`${CONFIG.QUESTIONNAIRE_SERVICE}/health`);
      console.log(`✅ Questionnaire Service Health: ${healthResponse.status}`);
    } catch (error) {
      console.log(`❌ Questionnaire Service Health: ${error.message}`);
    }
    
    // 2. Test GET request to submissions endpoint
    console.log('\n2. Testing GET Request to Submissions:');
    
    try {
      const getResponse = await axios.get(`${CONFIG.API_GATEWAY}/api/submissions/in-progress`, {
        headers: {
          'Authorization': 'Bearer test-token-for-diagnosis',
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ GET /api/submissions/in-progress: ${getResponse.status}`);
    } catch (error) {
      console.log(`❌ GET /api/submissions/in-progress: ${error.response?.status || error.message}`);
    }
    
    // 3. Test direct service GET request
    console.log('\n3. Testing Direct Service GET Request:');
    
    try {
      const directGetResponse = await axios.get(`${CONFIG.QUESTIONNAIRE_SERVICE}/submissions/in-progress`, {
        headers: {
          'Authorization': 'Bearer test-token-for-diagnosis',
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Direct GET /submissions/in-progress: ${directGetResponse.status}`);
    } catch (error) {
      console.log(`❌ Direct GET /submissions/in-progress: ${error.response?.status || error.message}`);
    }
    
    // 4. Check service health after GET request
    console.log('\n4. Post-GET Health Check:');
    
    try {
      const healthResponse2 = await axios.get(`${CONFIG.QUESTIONNAIRE_SERVICE}/health`);
      console.log(`✅ Questionnaire Service Health: ${healthResponse2.status}`);
    } catch (error) {
      console.log(`❌ Questionnaire Service Health: ${error.message}`);
    }
    
    // 5. Attempt PUT request to identify crash point
    console.log('\n5. Testing PUT Request (Crash Point):');
    
    const testPayload = {
      answers: {
        "1": "test-answer"
      }
    };
    
    try {
      const putResponse = await axios.put(`${CONFIG.API_GATEWAY}/api/submissions/1`, testPayload, {
        headers: {
          'Authorization': 'Bearer test-token-for-diagnosis',
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout to catch crashes quickly
      });
      console.log(`✅ PUT /api/submissions/1: ${putResponse.status}`);
    } catch (error) {
      console.log(`❌ PUT /api/submissions/1: ${error.response?.status || error.code || error.message}`);
      
      if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
        console.log('   🚨 SERVICE CRASH DETECTED: Connection refused/reset indicates service crashed');
      }
    }
    
    // 6. Check service health after PUT request
    console.log('\n6. Post-PUT Health Check (Check if Service Crashed):');
    
    try {
      const healthResponse3 = await axios.get(`${CONFIG.QUESTIONNAIRE_SERVICE}/health`);
      console.log(`✅ Questionnaire Service Health: ${healthResponse3.status} (Service survived PUT)`);
    } catch (error) {
      console.log(`❌ Questionnaire Service Health: ${error.message} (Service crashed on PUT)`);
    }
    
    // 7. Test direct service PUT request
    console.log('\n7. Testing Direct Service PUT Request (If Service Still Running):');
    
    try {
      const directPutResponse = await axios.put(`${CONFIG.QUESTIONNAIRE_SERVICE}/submissions/1`, testPayload, {
        headers: {
          'Authorization': 'Bearer test-token-for-diagnosis',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      console.log(`✅ Direct PUT /submissions/1: ${directPutResponse.status}`);
    } catch (error) {
      console.log(`❌ Direct PUT /submissions/1: ${error.response?.status || error.code || error.message}`);
      
      if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
        console.log('   🚨 SERVICE CRASH CONFIRMED: Direct PUT request also crashes service');
      }
    }
    
    // 8. Final health check
    console.log('\n8. Final Health Check:');
    
    try {
      const finalHealthResponse = await axios.get(`${CONFIG.QUESTIONNAIRE_SERVICE}/health`);
      console.log(`✅ Final Questionnaire Service Health: ${finalHealthResponse.status}`);
    } catch (error) {
      console.log(`❌ Final Questionnaire Service Health: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 Diagnosis Summary:');
    console.log('- If service health checks fail after PUT requests, the service is crashing');
    console.log('- If direct PUT also fails, the issue is in the service itself, not API Gateway');
    console.log('- ECONNRESET/ECONNREFUSED errors indicate service crash');
    console.log('- Next step: Check service logs and submission controller error handling');
    
  } catch (error) {
    console.error('❌ Diagnostic script error:', error.message);
  }
}

// Run diagnosis
diagnosePutCrashIssue().catch(console.error);
