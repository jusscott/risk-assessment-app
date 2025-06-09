#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_GATEWAY_URL = 'http://localhost:5000';
const QUESTIONNAIRE_SERVICE_URL = 'http://questionnaire-service:5002';
const AUTH_SERVICE_URL = 'http://auth-service:5001';

// Test user email
const TEST_USER_EMAIL = 'juscott@gmail.com';
const TEST_PASSWORD = 'password123'; // Assuming standard test password

console.log('🔍 COMPREHENSIVE QUESTIONNAIRE DISPLAY DIAGNOSTIC');
console.log('='.repeat(60));
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🎯 Target User: ${TEST_USER_EMAIL}`);
console.log('');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
    try {
        const response = await axios({
            timeout: 10000,
            ...options,
            url
        });
        return { success: true, data: response.data, status: response.status, headers: response.headers };
    } catch (error) {
        return { 
            success: false, 
            error: error.message,
            status: error.response?.status,
            data: error.response?.data,
            code: error.code
        };
    }
}

async function testServiceHealth() {
    console.log('🏥 TESTING SERVICE HEALTH');
    console.log('-'.repeat(30));
    
    const services = [
        { name: 'API Gateway', url: `${API_GATEWAY_URL}/health` },
        { name: 'Auth Service', url: `http://localhost:5001/health` },
        { name: 'Questionnaire Service', url: `http://localhost:5002/health` }
    ];
    
    for (const service of services) {
        const result = await makeRequest(service.url);
        console.log(`${service.name}: ${result.success ? '✅ Healthy' : `❌ ${result.error}`}`);
        if (result.success && result.data) {
            console.log(`  Status: ${JSON.stringify(result.data)}`);
        }
    }
    console.log('');
}

async function testAuthentication() {
    console.log('🔐 TESTING USER AUTHENTICATION');
    console.log('-'.repeat(30));
    
    // Test login via API Gateway
    const loginResult = await makeRequest(`${API_GATEWAY_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: {
            email: TEST_USER_EMAIL,
            password: TEST_PASSWORD
        }
    });
    
    if (loginResult.success) {
        console.log('✅ Login successful');
        console.log(`  User ID: ${loginResult.data.user?.id}`);
        console.log(`  User Email: ${loginResult.data.user?.email}`);
        const token = loginResult.data.token;
        console.log(`  Token: ${token ? token.substring(0, 20) + '...' : 'Missing'}`);
        return { token, userId: loginResult.data.user?.id };
    } else {
        console.log(`❌ Login failed: ${loginResult.error}`);
        console.log(`  Status: ${loginResult.status}`);
        console.log(`  Response: ${JSON.stringify(loginResult.data)}`);
        return null;
    }
}

async function testTokenValidation(token) {
    console.log('🎫 TESTING TOKEN VALIDATION');
    console.log('-'.repeat(30));
    
    // Test token validation via API Gateway
    const validateResult = await makeRequest(`${API_GATEWAY_URL}/api/auth/validate`, {
        method: 'GET',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (validateResult.success) {
        console.log('✅ Token validation successful');
        console.log(`  User: ${JSON.stringify(validateResult.data.user)}`);
        return validateResult.data.user;
    } else {
        console.log(`❌ Token validation failed: ${validateResult.error}`);
        console.log(`  Status: ${validateResult.status}`);
        console.log(`  Response: ${JSON.stringify(validateResult.data)}`);
        return null;
    }
}

async function testQuestionnaireEndpoints(token) {
    console.log('📋 TESTING QUESTIONNAIRE ENDPOINTS');
    console.log('-'.repeat(30));
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test questionnaire templates endpoint via API Gateway
    const templatesResult = await makeRequest(`${API_GATEWAY_URL}/api/questionnaire/templates`, {
        method: 'GET',
        headers
    });
    
    console.log('1. Templates endpoint:');
    if (templatesResult.success) {
        console.log('   ✅ Templates fetched successfully');
        console.log(`   📊 Found ${templatesResult.data?.length || 0} templates`);
        if (templatesResult.data && templatesResult.data.length > 0) {
            templatesResult.data.forEach((template, index) => {
                console.log(`     ${index + 1}. ${template.title} (${template.framework})`);
            });
        }
    } else {
        console.log(`   ❌ Templates fetch failed: ${templatesResult.error}`);
        console.log(`   Status: ${templatesResult.status}`);
        console.log(`   Response: ${JSON.stringify(templatesResult.data)}`);
    }
    
    // Test user submissions endpoint
    const submissionsResult = await makeRequest(`${API_GATEWAY_URL}/api/questionnaire/user/submissions`, {
        method: 'GET',
        headers
    });
    
    console.log('2. User submissions endpoint:');
    if (submissionsResult.success) {
        console.log('   ✅ Submissions fetched successfully');
        console.log(`   📊 Found ${submissionsResult.data?.length || 0} submissions`);
        if (submissionsResult.data && submissionsResult.data.length > 0) {
            submissionsResult.data.forEach((submission, index) => {
                console.log(`     ${index + 1}. ID: ${submission.id}, Status: ${submission.status}, Framework: ${submission.framework}`);
            });
        }
    } else {
        console.log(`   ❌ Submissions fetch failed: ${submissionsResult.error}`);
        console.log(`   Status: ${submissionsResult.status}`);
        console.log(`   Response: ${JSON.stringify(submissionsResult.data)}`);
    }
    
    return { templatesResult, submissionsResult };
}

async function testDirectQuestionnaireService(token) {
    console.log('🔗 TESTING DIRECT QUESTIONNAIRE SERVICE');
    console.log('-'.repeat(30));
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // Test direct connection to questionnaire service
    const directResult = await makeRequest(`http://localhost:5002/api/templates`, {
        method: 'GET',
        headers
    });
    
    if (directResult.success) {
        console.log('✅ Direct service connection successful');
        console.log(`   📊 Found ${directResult.data?.length || 0} templates directly`);
    } else {
        console.log(`❌ Direct service connection failed: ${directResult.error}`);
        console.log(`   Status: ${directResult.status}`);
        console.log(`   Response: ${JSON.stringify(directResult.data)}`);
    }
    
    return directResult;
}

async function checkEnvironmentVariables() {
    console.log('🌍 CHECKING ENVIRONMENT VARIABLES');
    console.log('-'.repeat(30));
    
    const envFiles = [
        'backend/questionnaire-service/.env',
        'backend/questionnaire-service/.env.development',
        'backend/api-gateway/.env',
        'backend/auth-service/.env'
    ];
    
    for (const envFile of envFiles) {
        const fullPath = path.join(process.cwd(), envFile);
        if (fs.existsSync(fullPath)) {
            console.log(`📄 ${envFile}:`);
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n').filter(line => 
                line.includes('localhost') || 
                line.includes('DATABASE_URL') || 
                line.includes('AUTH_SERVICE_URL') ||
                line.includes('QUESTIONNAIRE_SERVICE_URL')
            );
            lines.forEach(line => {
                if (line.trim() && !line.startsWith('#')) {
                    console.log(`   ${line.includes('localhost') ? '⚠️ ' : '✅ '}${line}`);
                }
            });
        } else {
            console.log(`❌ ${envFile}: File not found`);
        }
    }
    console.log('');
}

async function checkDatabaseConnectivity() {
    console.log('🗄️ CHECKING DATABASE CONNECTIVITY');
    console.log('-'.repeat(30));
    
    // Test questionnaire service diagnostic endpoint
    const diagnosticResult = await makeRequest('http://localhost:5002/api/diagnostic/db-status');
    
    if (diagnosticResult.success) {
        console.log('✅ Database diagnostic successful');
        console.log(`   Status: ${JSON.stringify(diagnosticResult.data)}`);
    } else {
        console.log(`❌ Database diagnostic failed: ${diagnosticResult.error}`);
    }
}

async function checkAPIGatewayRouting() {
    console.log('🚦 CHECKING API GATEWAY ROUTING');
    console.log('-'.repeat(30));
    
    // Check if API Gateway is properly routing questionnaire requests
    const routingTest = await makeRequest(`${API_GATEWAY_URL}/api/questionnaire/health`, {
        method: 'GET'
    });
    
    if (routingTest.success) {
        console.log('✅ API Gateway routing to questionnaire service works');
    } else {
        console.log(`❌ API Gateway routing failed: ${routingTest.error}`);
        console.log(`   Status: ${routingTest.status}`);
    }
}

async function generateDiagnosticSummary(results) {
    console.log('📋 DIAGNOSTIC SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    const { authResult, questionnaireResults, directResult } = results;
    
    console.log('🎯 IDENTIFIED ISSUES:');
    const issues = [];
    
    if (!authResult) {
        issues.push('❌ User authentication failed - Check auth service and user credentials');
    }
    
    if (questionnaireResults && !questionnaireResults.templatesResult.success) {
        issues.push('❌ Questionnaire templates not loading via API Gateway');
    }
    
    if (questionnaireResults && !questionnaireResults.submissionsResult.success) {
        issues.push('❌ User submissions not loading via API Gateway');
    }
    
    if (directResult && !directResult.success) {
        issues.push('❌ Direct questionnaire service connection failed');
    }
    
    if (issues.length === 0) {
        console.log('✅ No critical issues detected - questionnaire display should work');
    } else {
        issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    console.log('');
    console.log('🔧 RECOMMENDED FIXES:');
    
    if (!authResult) {
        console.log('   1. Verify user exists in database and password is correct');
        console.log('   2. Check auth service logs for bcrypt issues');
        console.log('   3. Ensure auth service can connect to auth database');
    }
    
    if (questionnaireResults && !questionnaireResults.templatesResult.success) {
        console.log('   1. Check API Gateway routing configuration for /api/questionnaire/*');
        console.log('   2. Verify questionnaire service is accessible from API Gateway');
        console.log('   3. Check for service discovery issues between containers');
    }
    
    if (directResult && !directResult.success) {
        console.log('   1. Replace localhost URLs with Docker service names');
        console.log('   2. Check questionnaire service environment variables');
        console.log('   3. Verify token validation middleware in questionnaire service');
    }
    
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('   1. Run: docker-compose logs questionnaire-service (check for errors)');
    console.log('   2. Run: docker-compose logs api-gateway (check routing)');
    console.log('   3. Check browser network tab when loading questionnaires page');
    console.log('   4. Verify frontend is making requests to correct endpoints');
}

async function main() {
    try {
        await testServiceHealth();
        await sleep(1000);
        
        await checkEnvironmentVariables();
        await sleep(1000);
        
        await checkDatabaseConnectivity();
        await sleep(1000);
        
        await checkAPIGatewayRouting();
        await sleep(1000);
        
        const authResult = await testAuthentication();
        await sleep(1000);
        
        let questionnaireResults = null;
        let directResult = null;
        let validatedUser = null;
        
        if (authResult && authResult.token) {
            validatedUser = await testTokenValidation(authResult.token);
            await sleep(1000);
            
            questionnaireResults = await testQuestionnaireEndpoints(authResult.token);
            await sleep(1000);
            
            directResult = await testDirectQuestionnaireService(authResult.token);
        }
        
        await generateDiagnosticSummary({
            authResult,
            questionnaireResults,
            directResult,
            validatedUser
        });
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        console.error(error.stack);
    }
}

if (require.main === module) {
    main();
}
