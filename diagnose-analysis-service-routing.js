#!/usr/bin/env node

const axios = require('axios');

console.log('🔍 Diagnosing Analysis Service Routing Issue');
console.log('=' .repeat(50));

async function diagnoseAnalysisServiceRouting() {
  try {
    console.log('1. Testing Analysis Service directly...');
    const directResponse = await axios.get('http://localhost:5004/health');
    console.log('✅ Direct Analysis Service Response:', directResponse.data);
    
    console.log('\n2. Testing Analysis Service through API Gateway...');
    const gatewayResponse = await axios.get('http://localhost:5000/api/analysis/health');
    console.log('🔄 API Gateway Response:', gatewayResponse.data);
    
    console.log('\n3. Analysis:');
    if (gatewayResponse.data.service === 'api-gateway') {
      console.log('❌ ISSUE CONFIRMED: API Gateway is serving its own health check instead of proxying to analysis service');
      console.log('   - The /api/analysis/health route is being intercepted by the health routes middleware');
      console.log('   - This prevents proper routing to the analysis service');
    } else {
      console.log('✅ Routing appears to be working correctly');
    }
    
    console.log('\n4. Testing other analysis endpoints...');
    try {
      // Test a non-health endpoint to see if general routing works
      const analysisResponse = await axios.get('http://localhost:5000/api/analysis/test', {
        headers: {
          'Authorization': 'Bearer fake-token-for-testing'
        }
      });
      console.log('✅ General analysis routing works:', analysisResponse.status);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ General analysis routing works (401 auth error expected)');
      } else {
        console.log('❌ General analysis routing error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  }
}

diagnoseAnalysisServiceRouting();
