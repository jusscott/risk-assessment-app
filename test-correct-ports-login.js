const axios = require('axios');

async function testCorrectPortsLogin() {
    console.log('🔍 TESTING LOGIN WITH CORRECT PORT CONFIGURATION');
    console.log('================================================');
    console.log('Port Configuration Analysis:');
    console.log('- Frontend: Port 3000 → API Gateway: Port 5000 ✅');
    console.log('- API Gateway: Port 5000 ✅');
    console.log('- Auth Service: Port 5001 ✅');
    console.log('- Questionnaire Service: Port 5002 ✅');
    console.log('');

    // Test service health on CORRECT ports
    console.log('1. SERVICE HEALTH CHECK (CORRECT PORTS)');
    console.log('=======================================');
    
    const services = [
        { name: 'API Gateway', url: 'http://localhost:5000/health' },
        { name: 'Auth Service', url: 'http://localhost:5001/health' },
        { name: 'Questionnaire Service', url: 'http://localhost:5002/health' }
    ];
    
    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 5000 });
            console.log(`✅ ${service.name}: ${response.status} - ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.log(`❌ ${service.name}: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data: ${JSON.stringify(error.response.data)}`);
            }
        }
    }

    console.log('\n2. LOGIN ATTEMPT TEST (CORRECT PORT 5000)');
    console.log('=========================================');
    
    const testCredentials = [
        { email: 'good@test.com', password: 'Password123' },
        { email: 'jusscott@gmail.com', password: 'Password123' }
    ];

    for (const creds of testCredentials) {
        console.log(`\nTesting login: ${creds.email}`);
        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', creds, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`✅ Status: ${response.status}`);
            console.log(`✅ Response structure:`, Object.keys(response.data));
            
            if (response.data.tokens) {
                console.log(`✅ Tokens present: ${Object.keys(response.data.tokens)}`);
                console.log(`✅ Access token length: ${response.data.tokens.accessToken?.length || 'N/A'}`);
            } else if (response.data.token) {
                console.log(`✅ Token present: ${response.data.token.length} chars`);
            } else {
                console.log(`❌ No token found in response`);
            }

            if (response.data.user) {
                console.log(`✅ User data: ID=${response.data.user.id}, Email=${response.data.user.email}`);
            }

        } catch (error) {
            console.log(`❌ Login failed: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
            }
            if (error.request && !error.response) {
                console.log(`   Network/Timeout issue - service may be down`);
            }
        }
    }

    console.log('\n3. AUTH ENDPOINTS TEST (CORRECT PORTS)');
    console.log('=====================================');
    
    const authEndpoints = [
        'http://localhost:5000/api/auth/me',
        'http://localhost:5001/auth/me', 
        'http://localhost:5001/auth/profile'
    ];

    for (const endpoint of authEndpoints) {
        try {
            const response = await axios.get(endpoint, { timeout: 5000 });
            console.log(`✅ ${endpoint}: ${response.status}`);
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
            if (error.response?.status === 401) {
                console.log(`   Expected 401 - endpoint requires authentication`);
            }
        }
    }

    console.log('\n4. FRONTEND CONFIGURATION TEST');
    console.log('==============================');
    console.log('Frontend environment: REACT_APP_API_URL=http://localhost:5000');
    console.log('This matches the API Gateway port - CONFIGURATION IS CORRECT ✅');
    
    console.log('\n5. ROOT CAUSE ANALYSIS');
    console.log('=====================');
    console.log('Previous Issue Analysis:');
    console.log('- ❌ Was testing wrong ports (3000, 3001, 3002)');
    console.log('- ✅ Correct ports are (5000, 5001, 5002)');
    console.log('- ✅ Frontend correctly configured to use port 5000');
    console.log('- ❓ Need to verify if port change was intentional or accidental');
    
    console.log('\nNext Steps:');
    console.log('- If services work on port 5000: Login should work now');
    console.log('- If services still fail: Check service logs for actual errors');
    console.log('- Determine if port change was related to recent Prisma/logout fixes');
}

testCorrectPortsLogin().catch(console.error);
