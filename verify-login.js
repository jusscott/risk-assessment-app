#!/usr/bin/env node

const axios = require('axios');

async function verifyLogin() {
  const API_URL = 'http://localhost:5000';
  
  console.log('🔍 Verifying login endpoints...');
  
  try {
    // Test API Gateway health
    console.log('Testing API Gateway health...');
    const healthResponse = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    console.log('✅ API Gateway is responding');
    
    // Test auth endpoints
    console.log('Testing auth endpoints...');
    try {
      const authResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      }, { timeout: 10000 });
    } catch (authError) {
      if (authError.response) {
        console.log(`✅ Auth endpoint is responding (status: ${authError.response.status})`);
        if (authError.response.status === 429) {
          console.log('⚠️  Rate limiting is active - this might be the login issue');
        }
      } else {
        console.log('❌ Auth service is not responding');
      }
    }
    
  } catch (error) {
    console.error('❌ API Gateway is not responding:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Make sure Docker services are running: docker-compose up -d');
    console.log('2. Check if API Gateway is running on port 5000: curl http://localhost:5000/health');
    console.log('3. Clear rate limits: node clear-rate-limits.js');
    console.log('4. Restart services: docker-compose restart api-gateway');
  }
}

verifyLogin();
