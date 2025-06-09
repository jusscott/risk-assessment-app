#!/usr/bin/env node

const axios = require('axios');

console.log('=== CRITICAL SERVICE ISSUES DIAGNOSTIC ===');
console.log('Testing specific issues reported after recent fixes\n');

async function testServiceEndpoints() {
    const baseUrls = {
        gateway: 'http://localhost:5000',
        auth: 'http://localhost:5001',
        questionnaire: 'http://localhost:5002'
    };
    
    console.log('1. TESTING QUESTIONNAIRE SERVICE HEALTH ENDPOINT (404 Issue)');
    console.log('===============================================================');
    
    // Test direct questionnaire service health
    try {
        console.log('Testing direct questionnaire service health...');
        const directResponse = await axios.get(`${baseUrls.questionnaire}/health`, {
            timeout: 5000
        });
        console.log('✅ Direct questionnaire health:', directResponse.status, directResponse.data);
    } catch (error) {
        console.log('❌ Direct questionnaire health failed:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Headers:', JSON.stringify(error.response.headers, null, 2));
        }
    }
    
    // Test questionnaire service health through API Gateway
    try {
        console.log('\nTesting questionnaire health through API Gateway...');
        const gatewayResponse = await axios.get(`${baseUrls.gateway}/api/questionnaire/health`, {
            timeout: 5000
        });
        console.log('✅ Gateway->questionnaire health:', gatewayResponse.status, gatewayResponse.data);
    } catch (error) {
        console.log('❌ Gateway->questionnaire health failed:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Headers:', JSON.stringify(error.response.headers, null, 2));
            console.log('   Response:', error.response.data);
        }
    }
    
    console.log('\n2. TESTING AUTH SERVICE LOGIN ENDPOINT (502 Issue)');
    console.log('========================================================');
    
    // Test direct auth service health
    try {
        console.log('Testing direct auth service health...');
        const authHealthResponse = await axios.get(`${baseUrls.auth}/health`, {
            timeout: 5000
        });
        console.log('✅ Direct auth health:', authHealthResponse.status, authHealthResponse.data);
    } catch (error) {
        console.log('❌ Direct auth health failed:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Headers:', JSON.stringify(error.response.headers, null, 2));
        }
    }
    
    // Test auth login through API Gateway
    try {
        console.log('\nTesting auth login through API Gateway...');
        const loginResponse = await axios.post(`${baseUrls.gateway}/api/auth/login`, {
            email: 'test@example.com',
            password: 'testpassword'
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Gateway->auth login:', loginResponse.status);
    } catch (error) {
        console.log('❌ Gateway->auth login failed:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Headers:', JSON.stringify(error.response.headers, null, 2));
            console.log('   Response:', error.response.data);
        }
        if (error.code === 'ECONNREFUSED') {
            console.log('   ⚠️  CONNECTION REFUSED - Service may not be running');
        }
    }
    
    console.log('\n3. TESTING QUESTIONNAIRE LOADING FOR REAL USER');
    console.log('===============================================');
    
    // First try to authenticate with the real user
    try {
        console.log('Testing authentication for jusscott@gmail.com...');
        const realUserLogin = await axios.post(`${baseUrls.gateway}/api/auth/login`, {
            email: 'jusscott@gmail.com',
            password: 'password123'  // Assuming this is the password
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Real user authentication successful:', realUserLogin.status);
        const token = realUserLogin.data.token;
        
        // Test questionnaire loading with real user token
        console.log('\nTesting questionnaire loading with authenticated user...');
        const questionnairesResponse = await axios.get(`${baseUrls.gateway}/api/questionnaire/submissions`, {
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Questionnaires loaded successfully:', questionnairesResponse.status);
        console.log('   Number of questionnaires:', questionnairesResponse.data.length || 0);
        if (questionnairesResponse.data.length > 0) {
            console.log('   Sample questionnaire:', JSON.stringify(questionnairesResponse.data[0], null, 2));
        }
        
    } catch (error) {
        console.log('❌ Real user questionnaire loading failed:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Response:', error.response.data);
        }
    }
    
    console.log('\n4. API GATEWAY PROXY CONFIGURATION CHECK');
    console.log('=========================================');
    
    // Test API Gateway routes
    try {
        console.log('Testing API Gateway root health...');
        const gatewayHealth = await axios.get(`${baseUrls.gateway}/health`, {
            timeout: 5000
        });
        console.log('✅ Gateway health:', gatewayHealth.status, gatewayHealth.data);
    } catch (error) {
        console.log('❌ Gateway health failed:', error.message);
    }
    
    // Test path rewriting by checking available routes
    try {
        console.log('\nTesting API Gateway path mappings...');
        const routes = ['auth', 'questionnaire', 'analysis', 'report', 'payment'];
        
        for (const route of routes) {
            try {
                const response = await axios.get(`${baseUrls.gateway}/api/${route}/health`, {
                    timeout: 3000
                });
                console.log(`✅ /${route} route: ${response.status}`);
            } catch (error) {
                console.log(`❌ /${route} route: ${error.response ? error.response.status : error.message}`);
            }
        }
        
    } catch (error) {
        console.log('❌ Route mapping test failed:', error.message);
    }
    
    console.log('\n5. DOCKER CONTAINER STATUS CHECK');
    console.log('=================================');
    
    console.log('Checking Docker container status...');
    console.log('Please run: docker ps | grep risk-assessment');
    console.log('Expected containers: frontend, api-gateway, auth-service, questionnaire-service, analysis-service, report-service, payment-service');
}

async function main() {
    try {
        await testServiceEndpoints();
        
        console.log('\n=== DIAGNOSTIC SUMMARY ===');
        console.log('Please review the results above and check:');
        console.log('1. Are all Docker containers running?');
        console.log('2. Are services accessible on their direct ports?');
        console.log('3. Is API Gateway properly proxying requests?');
        console.log('4. Are there any networking or routing configuration issues?');
        console.log('\nNext: Run the fix script based on the identified issues.');
        
    } catch (error) {
        console.error('Diagnostic failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { testServiceEndpoints };
