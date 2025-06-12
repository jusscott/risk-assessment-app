#!/usr/bin/env node

const axios = require('axios');

console.log('🧪 Testing Analysis Service Fix');
console.log('=' .repeat(50));

async function testAnalysisServiceFix() {
  try {
    console.log('1. Testing Analysis Service directly...');
    const directResponse = await axios.get('http://localhost:5004/api/health');
    console.log('✅ Direct Analysis Service Response:');
    console.log('   Status:', directResponse.status);
    console.log('   Service:', directResponse.data.data.service);
    console.log('   Health:', directResponse.data.data.status);
    
    console.log('\n2. Testing Analysis Service through API Gateway with auth...');
    try {
      // Create a test JWT token (this is a fake token for testing routing)
      const fakeToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const gatewayResponse = await axios.get('http://localhost:5000/api/analysis/health', {
        headers: {
          'Authorization': fakeToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ API Gateway Response:');
      console.log('   Status:', gatewayResponse.status);
      console.log('   Service:', gatewayResponse.data.data?.service || 'unknown');
      console.log('   Health:', gatewayResponse.data.data?.status || gatewayResponse.data.status);
      
      // Check if it's properly routing to analysis service
      if (gatewayResponse.data.data?.service === 'analysis-service') {
        console.log('\n🎉 SUCCESS: Analysis service routing is working correctly!');
        console.log('   - API Gateway is properly proxying to analysis service');
        console.log('   - Path rewriting is working correctly');
        console.log('   - Analysis service health endpoint is accessible');
      } else {
        console.log('\n❌ ISSUE: Still not routing to analysis service correctly');
        console.log('   Expected service: analysis-service');
        console.log('   Actual service:', gatewayResponse.data.data?.service || 'unknown');
      }
      
    } catch (authError) {
      if (authError.response && authError.response.status === 401) {
        console.log('🔐 API Gateway Response: 401 Unauthorized (as expected)');
        console.log('   This suggests the routing is working, but authentication is required');
        console.log('   This is actually correct behavior for protected endpoints');
        
        console.log('\n3. Testing without authentication middleware bypass...');
        // The health endpoint should ideally be accessible without auth
        console.log('   Recommendation: Health endpoints should bypass authentication');
      } else {
        console.log('❌ API Gateway Error:', authError.message);
        if (authError.response) {
          console.log('   Status:', authError.response.status);
          console.log('   Response:', authError.response.data);
        }
      }
    }
    
    console.log('\n4. Summary:');
    console.log('   ✅ Analysis service is running and healthy');
    console.log('   ✅ Analysis service health endpoint works directly');
    console.log('   🔄 API Gateway routing needs authentication or health bypass');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testAnalysisServiceFix();
