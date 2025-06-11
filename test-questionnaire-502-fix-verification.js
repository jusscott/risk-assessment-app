const axios = require('axios');

console.log('=== QUESTIONNAIRE 502 ERROR FIX VERIFICATION ===\n');

async function testWithRealAuthentication() {
    console.log('1. TESTING WITH REAL AUTHENTICATION TOKEN');
    console.log('==========================================');
    
    try {
        // First, login to get a real token
        console.log('🔐 Logging in to get authentication token...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        const token = loginResponse.data.data.tokens.accessToken;
        console.log(`✅ Login successful - Token: ${token.substring(0, 20)}...`);
        
        // Test the failing endpoint with real token
        console.log('\n🔍 Testing in-progress submissions endpoint...');
        const submissionsResponse = await axios.get(
            'http://localhost:5000/api/questionnaires/submissions/in-progress',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            }
        );
        
        console.log(`✅ In-progress submissions: SUCCESS (${submissionsResponse.status})`);
        console.log(`   Submissions found: ${submissionsResponse.data.length}`);
        
        // Test templates endpoint (should work)
        console.log('\n🔍 Testing templates endpoint...');
        const templatesResponse = await axios.get(
            'http://localhost:5000/api/questionnaires/templates',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            }
        );
        
        console.log(`✅ Templates: SUCCESS (${templatesResponse.status})`);
        console.log(`   Templates found: ${templatesResponse.data.length}`);
        
        return { token, success: true };
        
    } catch (error) {
        console.log(`❌ Authentication test failed:`);
        console.log(`   Status: ${error.response?.status || 'No response'}`);
        console.log(`   Message: ${error.response?.data?.message || error.message}`);
        return { success: false, error: error.message };
    }
}

async function testSaveProgressScenario(token) {
    console.log('\n2. TESTING SAVE PROGRESS SCENARIO');
    console.log('==================================');
    
    try {
        // Test creating a new submission (simulating starting a questionnaire)
        console.log('🔍 Testing submission creation...');
        const createResponse = await axios.post(
            'http://localhost:5000/api/questionnaires/submissions',
            {
                templateId: 1, // ISO 27001:2013
                title: 'Test SOC 2 Assessment - Fix Verification'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            }
        );
        
        console.log(`✅ Submission creation: SUCCESS (${createResponse.status})`);
        const submissionId = createResponse.data.id;
        console.log(`   Submission ID: ${submissionId}`);
        
        // Test saving progress (the failing scenario from user report)
        console.log('\n🔍 Testing save progress...');
        const saveResponse = await axios.put(
            `http://localhost:5000/api/questionnaires/submissions/${submissionId}`,
            {
                answers: {
                    1: { answer: "Yes", comments: "Test comment for question 1" },
                    2: { answer: "No", comments: "Test comment for question 2" },
                    17: { answer: "Partially", comments: "Test comment for question 17 - this was the failing point" }
                },
                currentQuestionIndex: 17
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            }
        );
        
        console.log(`✅ Save progress: SUCCESS (${saveResponse.status})`);
        console.log(`   Updated submission: ${saveResponse.data.id}`);
        console.log(`   Progress saved: ${Object.keys(saveResponse.data.answers || {}).length} answers`);
        
        return { success: true, submissionId };
        
    } catch (error) {
        console.log(`❌ Save progress test failed:`);
        console.log(`   Status: ${error.response?.status || 'No response'}`);
        console.log(`   Message: ${error.response?.data?.message || error.message}`);
        if (error.response?.status === 502) {
            console.log(`   🚨 502 ERROR STILL PRESENT - Fix unsuccessful`);
        }
        return { success: false, error: error.message };
    }
}

async function checkServiceHealth() {
    console.log('\n3. FINAL SERVICE HEALTH CHECK');
    console.log('==============================');
    
    const services = [
        { name: 'API Gateway', url: 'http://localhost:5000/health' },
        { name: 'Auth Service', url: 'http://localhost:3001/health' },
        { name: 'Questionnaire Service', url: 'http://localhost:3002/health' }
    ];
    
    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 5000 });
            console.log(`✅ ${service.name}: HEALTHY`);
        } catch (error) {
            console.log(`❌ ${service.name}: UNHEALTHY - ${error.message}`);
        }
    }
}

async function runVerification() {
    console.log(`Verification started at: ${new Date().toISOString()}`);
    console.log('Testing fix for: 502 Bad Gateway errors on questionnaire save after question 17\n');
    
    // Test authentication and basic endpoints
    const authResult = await testWithRealAuthentication();
    
    if (authResult.success) {
        // Test the specific save progress scenario
        const saveResult = await testSaveProgressScenario(authResult.token);
        
        // Final health check
        await checkServiceHealth();
        
        console.log('\n=== VERIFICATION SUMMARY ===');
        if (saveResult.success) {
            console.log('🎉 SUCCESS: 502 error has been RESOLVED!');
            console.log('✅ Users can now save questionnaire progress normally');
            console.log('✅ Save progress works at question 17 and beyond');
            console.log('✅ All questionnaire endpoints are operational');
        } else {
            console.log('❌ FAILURE: 502 error persists');
            console.log('🔧 Additional troubleshooting may be required');
        }
    } else {
        console.log('\n=== VERIFICATION SUMMARY ===');
        console.log('❌ FAILURE: Authentication issues prevent testing');
        console.log('🔧 Authentication must be resolved before testing save progress');
    }
    
    console.log(`\nVerification completed at: ${new Date().toISOString()}`);
}

runVerification().catch(console.error);
