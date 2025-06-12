#!/usr/bin/env node

const axios = require('axios');

console.log('🔍 Detailed Analysis Service Routing Diagnosis');
console.log('=' .repeat(60));

async function testAnalysisRoutingDetailed() {
  try {
    console.log('1. Testing Analysis Service directly...');
    const directResponse = await axios.get('http://localhost:5004/api/health');
    console.log('✅ Direct Response:', {
      status: directResponse.status,
      service: directResponse.data?.data?.service,
      url: 'http://localhost:5004/api/health'
    });
    
    console.log('\n2. Testing API Gateway general health...');
    try {
      const gatewayHealthResponse = await axios.get('http://localhost:5000/api/health');
      console.log('✅ API Gateway Health Response:', {
        status: gatewayHealthResponse.status,
        service: gatewayHealthResponse.data?.data?.service
      });
    } catch (error) {
      console.log('❌ API Gateway Health Error:', error.message);
    }
    
    console.log('\n3. Testing Analysis Service through API Gateway (no auth)...');
    try {
      const noAuthResponse = await axios.get('http://localhost:5000/api/analysis/health');
      console.log('✅ No Auth Response:', {
        status: noAuthResponse.status,
        service: noAuthResponse.data?.data?.service || noAuthResponse.data?.service,
        data: noAuthResponse.data
      });
    } catch (error) {
      console.log('❌ No Auth Error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
    }
    
    console.log('\n4. Testing with fake authentication...');
    try {
      const fakeToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const authResponse = await axios.get('http://localhost:5000/api/analysis/health', {
        headers: {
          'Authorization': fakeToken,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ With Auth Response:', {
        status: authResponse.status,
        service: authResponse.data?.data?.service || authResponse.data?.service,
        data: authResponse.data
      });
    } catch (error) {
      console.log('❌ With Auth Error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
    }
    
    console.log('\n5. Testing other analysis endpoints...');
    try {
      const analysisResponse = await axios.get('http://localhost:5000/api/analysis/test');
      console.log('✅ Analysis Test Response:', analysisResponse.status);
    } catch (error) {
      console.log('❌ Analysis Test Error:', {
        status: error.response?.status,
        message: error.message
      });
    }
    
    console.log('\n6. Testing if other services work through gateway...');
    try {
      const authHealthResponse = await axios.get('http://localhost:5000/api/auth/health');
      console.log('✅ Auth Service Health through Gateway:', {
        status: authHealthResponse.status,
        service: authHealthResponse.data?.data?.service
      });
    } catch (error) {
      console.log('❌ Auth Service Health Error:', error.message);
    }
    
    console.log('\n=== DIAGNOSIS SUMMARY ===');
    console.log('Expected URL resolution:');
    console.log('  Client: http://localhost:5000/api/analysis/health');
    console.log('  Rewrite: /api/analysis/health -> /api/health');
    console.log('  Target: http://analysis-service:5004/api/health');
    console.log('  Expected service response: analysis-service');
    
  } catch (error) {
    console.error('❌ Fatal error during diagnosis:', error.message);
  }
}

testAnalysisRoutingDetailed();
