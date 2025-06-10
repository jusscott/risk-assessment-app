#!/usr/bin/env node

const axios = require('axios');

console.log('=== COMPREHENSIVE 502 ERROR DIAGNOSIS WITH AUTHENTICATION ===');
console.log('Timestamp:', new Date().toISOString());
console.log();

async function testEndpoint(url, method = 'GET', headers = {}, data = null) {
    try {
        const config = {
            method,
            url,
            headers,
            timeout: 10000,
            validateStatus: () => true // Accept all status codes
        };
        
        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        
        console.log(`${method} ${url}`);
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Response:`, JSON.stringify(response.data, null, 2));
        console.log('---');
        
        return response;
    } catch (error) {
        console.log(`${method} ${url}`);
        console.log(`Error: ${error.message}`);
        if (error.code) {
            console.log(`Error Code: ${error.code}`);
        }
        console.log('---');
        return null;
    }
}

async function main() {
    console.log('1. Testing questionnaire service health...');
    await testEndpoint('http://localhost:5002/health');
    
    console.log('2. Testing API Gateway health...');
    await testEndpoint('http://localhost:5000/health');
    
    console.log('3. Testing direct questionnaire service submission endpoint...');
    await testEndpoint('http://localhost:5002/submissions/in-progress');
    
    console.log('4. Testing through API Gateway...');
    await testEndpoint('http://localhost:5000/api/questionnaires/submissions/in-progress');
    
    console.log('5. Testing login to get valid token...');
    let authToken = null;
    try {
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        if (loginResponse.data && loginResponse.data.data && loginResponse.data.data.tokens && loginResponse.data.data.tokens.accessToken) {
            authToken = loginResponse.data.data.tokens.accessToken;
            console.log('Login successful - got auth token');
            console.log('Token preview:', authToken.substring(0, 50) + '...');
        } else {
            console.log('Login failed or unexpected response structure:', loginResponse.data);
        }
    } catch (error) {
        console.log('Login error:', error.message);
    }
    console.log('---');
    
    if (authToken) {
        const authHeader = { 'Authorization': `Bearer ${authToken}` };
        
        console.log('6. Testing authenticated request to questionnaire service directly...');
        await testEndpoint('http://localhost:5002/submissions/in-progress', 'GET', authHeader);
        
        console.log('7. Testing authenticated request through API Gateway...');
        await testEndpoint('http://localhost:5000/api/questionnaires/submissions/in-progress', 'GET', authHeader);
        
        console.log('8. Testing the specific failing PUT request...');
        const testData = {
            answers: {
                "q1": "test answer"
            }
        };
        
        console.log('8a. Direct to questionnaire service...');
        await testEndpoint('http://localhost:5002/submissions/5', 'PUT', { 
            ...authHeader, 
            'Content-Type': 'application/json' 
        }, testData);
        
        console.log('8b. Through API Gateway...');
        await testEndpoint('http://localhost:5000/api/questionnaires/submissions/5', 'PUT', { 
            ...authHeader, 
            'Content-Type': 'application/json' 
        }, testData);
    } else {
        console.log('6-8. Skipping authenticated tests - no auth token available');
    }
    
    console.log('9. Checking container status...');
    console.log('Run: docker-compose ps questionnaire-service');
    
    console.log('10. Checking recent logs...');
    console.log('Run: docker-compose logs questionnaire-service --tail=10');
}

main().catch(console.error);
