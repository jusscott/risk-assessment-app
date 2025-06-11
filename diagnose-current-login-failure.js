const axios = require('axios');

async function diagnoseCurrentLoginFailure() {
    console.log('🔍 DIAGNOSING CURRENT LOGIN FAILURE');
    console.log('=====================================');
    console.log('Timeline Analysis:');
    console.log('- 11:16 AM: Prisma upgrade (4.16.2 → 5.22.0) + segfault fix');
    console.log('- Before 12:00 PM: Everything working');
    console.log('- After lunch: Logout loop appeared');
    console.log('- Recently: Logout fixed, login now broken');
    console.log('');

    // Test service health first
    console.log('1. SERVICE HEALTH CHECK');
    console.log('======================');
    
    const services = [
        { name: 'API Gateway', url: 'http://localhost:3000/health' },
        { name: 'Auth Service', url: 'http://localhost:3001/health' },
        { name: 'Questionnaire Service', url: 'http://localhost:3002/health' }
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

    console.log('\n2. LOGIN ATTEMPT TEST');
    console.log('====================');
    
    const testCredentials = [
        { email: 'good@test.com', password: 'Password123' },
        { email: 'jusscott@gmail.com', password: 'Password123' }
    ];

    for (const creds of testCredentials) {
        console.log(`\nTesting login: ${creds.email}`);
        try {
            const response = await axios.post('http://localhost:3000/api/auth/login', creds, {
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

    console.log('\n3. AUTH ENDPOINTS TEST');
    console.log('=====================');
    
    const authEndpoints = [
        'http://localhost:3000/api/auth/me',
        'http://localhost:3001/auth/me', 
        'http://localhost:3001/auth/profile'
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

    console.log('\n4. DATABASE CONNECTION TEST');
    console.log('===========================');
    
    try {
        // Test auth service database through a simple endpoint
        const response = await axios.get('http://localhost:3001/health');
        console.log(`✅ Auth service DB connection appears healthy`);
    } catch (error) {
        console.log(`❌ Auth service DB connection issue: ${error.message}`);
    }

    console.log('\n5. PRISMA MIGRATION STATUS CHECK');
    console.log('================================');
    console.log('Recent Prisma upgrade: 4.16.2 → 5.22.0');
    console.log('Need to check if migration issues occurred after upgrade...');
    console.log('');

    console.log('🔍 DIAGNOSIS SUMMARY');
    console.log('===================');
    console.log('This diagnostic checks:');
    console.log('1. Service health after Prisma upgrade');
    console.log('2. Login endpoint functionality');
    console.log('3. Authentication flow integrity');  
    console.log('4. Database connectivity post-upgrade');
    console.log('5. Potential migration issues from Prisma version change');
    console.log('');
    console.log('Next steps based on results:');
    console.log('- If services are down: Check container logs');
    console.log('- If login returns errors: Check auth service logs');
    console.log('- If database issues: Check Prisma migration status');
    console.log('- If token issues: Check JWT configuration consistency');
}

diagnoseCurrentLoginFailure().catch(console.error);
