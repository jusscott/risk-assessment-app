#!/usr/bin/env node

/**
 * Comprehensive Questionnaire Display Issue Diagnostic
 * 
 * This script will:
 * 1. Test all questionnaire API endpoints directly
 * 2. Compare expected vs actual response formats
 * 3. Test with authentication headers
 * 4. Identify the exact cause of the display issue
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

// Test user credentials (from user's report)
const TEST_USER_EMAIL = 'jusscott@gmail.com';

console.log('🔍 COMPREHENSIVE QUESTIONNAIRE DISPLAY ISSUE DIAGNOSTIC');
console.log('======================================================');
console.log(`📍 API Base URL: ${API_BASE_URL}`);
console.log(`📍 Frontend URL: ${FRONTEND_URL}`);
console.log(`👤 Test User: ${TEST_USER_EMAIL}`);
console.log('');

/**
 * Test different API endpoint variations
 */
async function testAPIEndpoints() {
    console.log('🌐 TESTING API ENDPOINTS');
    console.log('------------------------');
    
    const endpoints = [
        // Direct API endpoints (what user confirmed works)
        '/api/questionnaires/templates',
        '/api/questionnaires/submissions/completed',
        '/api/questionnaires/submissions/in-progress',
        
        // Frontend expected endpoints (what the code calls)
        '/questionnaires/templates',
        '/questionnaires/submissions/completed', 
        '/questionnaires/submissions/in-progress',
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n📡 Testing: ${API_BASE_URL}${endpoint}`);
            
            // Test without auth first
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
                timeout: 5000,
                validateStatus: () => true // Don't throw on 4xx/5xx
            });
            
            results[endpoint] = {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers['content-type'],
                dataType: typeof response.data,
                dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
                hasSuccess: response.data && typeof response.data.success !== 'undefined',
                structure: response.data ? Object.keys(response.data) : [],
                sample: response.status === 200 ? JSON.stringify(response.data).substring(0, 200) + '...' : response.data
            };
            
            console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
            console.log(`   📊 Data Type: ${typeof response.data}`);
            if (Array.isArray(response.data)) {
                console.log(`   📝 Array Length: ${response.data.length}`);
            }
            if (response.data && typeof response.data === 'object') {
                console.log(`   🔑 Keys: ${Object.keys(response.data).join(', ')}`);
            }
            
        } catch (error) {
            results[endpoint] = {
                error: error.message,
                code: error.code,
                status: error.response?.status || 'NETWORK_ERROR'
            };
            
            console.log(`   ❌ Error: ${error.message}`);
            if (error.response) {
                console.log(`   📟 Status: ${error.response.status} ${error.response.statusText}`);
            }
        }
    }
    
    return results;
}

/**
 * Test with authentication
 */
async function testWithAuthentication() {
    console.log('\n🔐 TESTING WITH AUTHENTICATION');
    console.log('-----------------------------');
    
    // First, try to get a token by login
    let authToken = null;
    
    try {
        console.log('🔑 Attempting to get authentication token...');
        
        // Try different login endpoints
        const loginEndpoints = ['/api/auth/login', '/auth/login'];
        
        for (const loginEndpoint of loginEndpoints) {
            try {
                console.log(`   Trying: ${API_BASE_URL}${loginEndpoint}`);
                const loginResponse = await axios.post(`${API_BASE_URL}${loginEndpoint}`, {
                    email: TEST_USER_EMAIL,
                    password: 'testpassword' // You might need to adjust this
                }, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (loginResponse.status === 200 && loginResponse.data.token) {
                    authToken = loginResponse.data.token;
                    console.log(`   ✅ Got token from ${loginEndpoint}`);
                    break;
                } else {
                    console.log(`   ❌ Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`);
                }
            } catch (error) {
                console.log(`   ❌ Login endpoint error: ${error.message}`);
            }
        }
        
        if (!authToken) {
            console.log('⚠️  Could not obtain auth token. Testing with mock token...');
            authToken = 'mock-token-for-testing';
        }
        
    } catch (error) {
        console.log(`❌ Authentication error: ${error.message}`);
        authToken = 'mock-token-for-testing';
    }
    
    // Test endpoints with auth
    const authResults = {};
    const endpoints = [
        '/api/questionnaires/templates',
        '/api/questionnaires/submissions/completed',
        '/api/questionnaires/submissions/in-progress',
        '/questionnaires/templates',
        '/questionnaires/submissions/completed',
        '/questionnaires/submissions/in-progress',
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n📡 Testing with auth: ${API_BASE_URL}${endpoint}`);
            
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000,
                validateStatus: () => true
            });
            
            authResults[endpoint] = {
                status: response.status,
                statusText: response.statusText,
                dataType: typeof response.data,
                dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
                hasSuccess: response.data && typeof response.data.success !== 'undefined',
                sample: response.status === 200 ? JSON.stringify(response.data).substring(0, 200) + '...' : response.data
            };
            
            console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
            console.log(`   📊 Data: ${typeof response.data}`);
            if (Array.isArray(response.data)) {
                console.log(`   📝 Length: ${response.data.length}`);
            }
            
        } catch (error) {
            authResults[endpoint] = {
                error: error.message,
                status: error.response?.status || 'NETWORK_ERROR'
            };
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    return authResults;
}

/**
 * Analyze frontend API configuration
 */
async function analyzeFrontendConfig() {
    console.log('\n⚙️  ANALYZING FRONTEND CONFIGURATION');
    console.log('----------------------------------');
    
    try {
        // Check if we can access the frontend API service config
        const fs = require('fs');
        const path = require('path');
        
        const apiServicePath = path.join(__dirname, 'frontend/src/services/api.ts');
        if (fs.existsSync(apiServicePath)) {
            const apiConfig = fs.readFileSync(apiServicePath, 'utf8');
            console.log('📄 Found api.ts configuration:');
            
            // Extract base URL configuration
            const baseUrlMatch = apiConfig.match(/baseURL:\s*['"`]([^'"`]+)['"`]/);
            if (baseUrlMatch) {
                console.log(`   🔗 Base URL: ${baseUrlMatch[1]}`);
            }
            
            // Check for path rewriting or interceptors
            if (apiConfig.includes('interceptors')) {
                console.log('   🔄 Has request/response interceptors');
            }
            
            if (apiConfig.includes('rewrite') || apiConfig.includes('proxy')) {
                console.log('   🔀 Has path rewriting/proxy configuration');
            }
        } else {
            console.log('❌ Could not find frontend API configuration file');
        }
        
    } catch (error) {
        console.log(`❌ Error analyzing frontend config: ${error.message}`);
    }
}

/**
 * Test path rewriting behavior
 */
async function testPathRewriting() {
    console.log('\n🔀 TESTING PATH REWRITING BEHAVIOR');
    console.log('---------------------------------');
    
    const testPaths = [
        { frontend: '/questionnaires/templates', expected: '/api/questionnaires/templates' },
        { frontend: '/questionnaires/submissions/completed', expected: '/api/questionnaires/submissions/completed' },
        { frontend: '/questionnaires/submissions/in-progress', expected: '/api/questionnaires/submissions/in-progress' }
    ];
    
    for (const test of testPaths) {
        console.log(`\n🧪 Testing path rewriting:`);
        console.log(`   Frontend calls: ${test.frontend}`);
        console.log(`   Should map to: ${test.expected}`);
        
        // Test both paths
        try {
            const frontendResponse = await axios.get(`${API_BASE_URL}${test.frontend}`, {
                timeout: 3000,
                validateStatus: () => true
            });
            
            const expectedResponse = await axios.get(`${API_BASE_URL}${test.expected}`, {
                timeout: 3000,
                validateStatus: () => true
            });
            
            console.log(`   Frontend path status: ${frontendResponse.status}`);
            console.log(`   Expected path status: ${expectedResponse.status}`);
            
            if (frontendResponse.status === expectedResponse.status && 
                JSON.stringify(frontendResponse.data) === JSON.stringify(expectedResponse.data)) {
                console.log(`   ✅ Path rewriting working correctly`);
            } else {
                console.log(`   ❌ Path rewriting issue detected!`);
                console.log(`   Frontend response: ${JSON.stringify(frontendResponse.data).substring(0, 100)}...`);
                console.log(`   Expected response: ${JSON.stringify(expectedResponse.data).substring(0, 100)}...`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error testing path rewriting: ${error.message}`);
        }
    }
}

/**
 * Test response format compatibility
 */
async function testResponseFormat() {
    console.log('\n📋 TESTING RESPONSE FORMAT COMPATIBILITY');
    console.log('--------------------------------------');
    
    try {
        // Test the working endpoint that user confirmed
        const response = await axios.get(`${API_BASE_URL}/api/questionnaires/templates`, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            console.log('✅ Successfully retrieved templates data');
            console.log(`📊 Response type: ${typeof response.data}`);
            console.log(`📝 Response structure: ${JSON.stringify(response.data, null, 2).substring(0, 500)}...`);
            
            // Check if it matches expected frontend format
            const expectedFields = ['id', 'name', 'description', 'category', 'questions', 'estimatedTime'];
            
            if (Array.isArray(response.data)) {
                console.log(`✅ Response is an array with ${response.data.length} items`);
                
                if (response.data.length > 0) {
                    const firstItem = response.data[0];
                    console.log('🔍 Checking first item structure:');
                    
                    expectedFields.forEach(field => {
                        if (firstItem.hasOwnProperty(field)) {
                            console.log(`   ✅ Has ${field}: ${firstItem[field]}`);
                        } else {
                            console.log(`   ❌ Missing ${field}`);
                        }
                    });
                }
            } else if (response.data && typeof response.data === 'object') {
                // Check if it's wrapped in a success/data structure
                if (response.data.success && response.data.data) {
                    console.log('📦 Response is wrapped in success/data structure');
                    console.log(`   Success: ${response.data.success}`);
                    console.log(`   Data type: ${typeof response.data.data}`);
                    console.log(`   Data length: ${Array.isArray(response.data.data) ? response.data.data.length : 'N/A'}`);
                }
            }
            
        } else {
            console.log(`❌ Failed to retrieve templates: ${response.status} ${response.statusText}`);
            console.log(`   Response: ${JSON.stringify(response.data)}`);
        }
        
    } catch (error) {
        console.log(`❌ Error testing response format: ${error.message}`);
    }
}

/**
 * Main diagnostic function
 */
async function runDiagnostic() {
    try {
        console.log(`⏰ Starting diagnostic at ${new Date().toISOString()}\n`);
        
        // Run all diagnostic tests
        const endpointResults = await testAPIEndpoints();
        const authResults = await testWithAuthentication();
        await analyzeFrontendConfig();
        await testPathRewriting();
        await testResponseFormat();
        
        // Summary
        console.log('\n📊 DIAGNOSTIC SUMMARY');
        console.log('====================');
        
        console.log('\n🎯 KEY FINDINGS:');
        
        // Check for working endpoints
        const workingEndpoints = Object.keys(endpointResults).filter(ep => 
            endpointResults[ep].status === 200
        );
        
        if (workingEndpoints.length > 0) {
            console.log('✅ Working endpoints:');
            workingEndpoints.forEach(ep => {
                console.log(`   - ${ep} (${endpointResults[ep].dataLength} items)`);
            });
        }
        
        // Check for failing endpoints
        const failingEndpoints = Object.keys(endpointResults).filter(ep => 
            endpointResults[ep].status !== 200
        );
        
        if (failingEndpoints.length > 0) {
            console.log('\n❌ Failing endpoints:');
            failingEndpoints.forEach(ep => {
                console.log(`   - ${ep} (${endpointResults[ep].status || endpointResults[ep].error})`);
            });
        }
        
        // Specific recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        
        if (endpointResults['/api/questionnaires/templates']?.status === 200 && 
            endpointResults['/questionnaires/templates']?.status !== 200) {
            console.log('🔧 PATH REWRITING ISSUE DETECTED:');
            console.log('   - Backend responds to /api/questionnaires/templates');
            console.log('   - Frontend calls /questionnaires/templates');
            console.log('   - Need to fix API Gateway path rewriting configuration');
        }
        
        if (endpointResults['/api/questionnaires/submissions/completed']?.status !== 200) {
            console.log('🔧 COMPLETED SUBMISSIONS ENDPOINT ISSUE:');
            console.log('   - This explains the "Failed to load completed questionnaires" error');
            console.log('   - Check questionnaire service for submissions endpoint');
        }
        
        console.log('\n✅ Diagnostic complete!');
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        process.exit(1);
    }
}

// Run the diagnostic
runDiagnostic();
