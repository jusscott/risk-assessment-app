#!/usr/bin/env node

const axios = require('axios');

async function diagnoseLoginIssue() {
    console.log('🔍 DIAGNOSING CURRENT LOGIN 401 ISSUE');
    console.log('=====================================');
    
    // Check service health
    console.log('\n1. 🏥 CHECKING SERVICE HEALTH');
    const services = [
        { name: 'API Gateway', url: 'http://localhost:3000/health' },
        { name: 'Auth Service', url: 'http://localhost:5000/health' },
        { name: 'Questionnaire Service', url: 'http://localhost:6000/health' }
    ];
    
    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 5000 });
            console.log(`✅ ${service.name}: ${response.status} - ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.log(`❌ ${service.name}: ${error.code || error.response?.status || 'UNREACHABLE'} - ${error.message}`);
        }
    }
    
    // Test direct auth service login
    console.log('\n2. 🔐 TESTING DIRECT AUTH SERVICE LOGIN');
    const testCredentials = [
        { email: 'good@test.com', password: 'Password123' },
        { email: 'jusscott@gmail.com', password: 'Password123' }
    ];
    
    for (const creds of testCredentials) {
        try {
            console.log(`\nTesting: ${creds.email}`);
            const response = await axios.post('http://localhost:5000/api/auth/login', creds, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`✅ Login Success: ${response.status}`);
            console.log(`Response structure:`, Object.keys(response.data));
            if (response.data.tokens) {
                console.log(`Token structure:`, Object.keys(response.data.tokens));
            }
        } catch (error) {
            console.log(`❌ Login Failed: ${error.response?.status || error.code}`);
            console.log(`Error message: ${error.response?.data?.message || error.message}`);
            if (error.response?.data) {
                console.log(`Error details:`, error.response.data);
            }
        }
    }
    
    // Test through API Gateway
    console.log('\n3. 🌐 TESTING THROUGH API GATEWAY');
    for (const creds of testCredentials) {
        try {
            console.log(`\nTesting via API Gateway: ${creds.email}`);
            const response = await axios.post('http://localhost:3000/api/auth/login', creds, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`✅ API Gateway Login Success: ${response.status}`);
            console.log(`Response structure:`, Object.keys(response.data));
        } catch (error) {
            console.log(`❌ API Gateway Login Failed: ${error.response?.status || error.code}`);
            console.log(`Error message: ${error.response?.data?.message || error.message}`);
            if (error.response?.data) {
                console.log(`Error details:`, error.response.data);
            }
        }
    }
    
    // Check database connectivity
    console.log('\n4. 🗄️ CHECKING DATABASE CONNECTIVITY');
    try {
        const response = await axios.get('http://localhost:5000/api/auth/check-db', {
            timeout: 5000
        });
        console.log(`✅ Database Check: ${response.status} - ${JSON.stringify(response.data)}`);
    } catch (error) {
        console.log(`❌ Database Check Failed: ${error.response?.status || error.code}`);
        if (error.response?.data) {
            console.log(`Error details:`, error.response.data);
        }
    }
    
    // Check if users exist
    console.log('\n5. 👤 CHECKING IF TEST USERS EXIST');
    try {
        // This is a custom endpoint that might not exist, but let's try
        const response = await axios.get('http://localhost:5000/api/auth/users', {
            timeout: 5000
        });
        console.log(`✅ Users endpoint: ${response.status}`);
        console.log(`Users found: ${response.data.length || 'Unknown'}`);
    } catch (error) {
        console.log(`ℹ️ Users endpoint not available or failed: ${error.response?.status || error.code}`);
    }
    
    console.log('\n6. 🔧 DIAGNOSTIC SUMMARY');
    console.log('========================');
    console.log('Based on the frontend error log:');
    console.log('- Login form was submitted successfully');
    console.log('- Auth slice login thunk started');
    console.log('- getAccessToken called with null localStorage token');
    console.log('- 401 Unauthorized from :5000/api/auth/login');
    console.log('- "Authentication session expired. Please log in again."');
    
    console.log('\nPossible causes:');
    console.log('1. Auth service not responding or crashed');
    console.log('2. Database connectivity issues');
    console.log('3. User credentials not in database');
    console.log('4. JWT secret mismatch');
    console.log('5. Request/response format changes');
    console.log('6. API Gateway routing issues');
}

// Run the diagnosis
diagnoseLoginIssue().catch(console.error);
