const axios = require('axios');

console.log('=== QUESTIONNAIRE SERVICE PUT REQUEST CRASH DIAGNOSIS ===\n');

// Configuration
const BASE_URL = 'http://localhost:5002';
const AUTH_URL = 'http://localhost:5001';
const API_GATEWAY_URL = 'http://localhost:5000';

// Test credentials
const testCredentials = {
    email: 'good@test.com',
    password: 'Password123'
};

let authToken = null;
let submissionId = null;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServiceHealth() {
    console.log('🔍 Checking questionnaire service health...');
    try {
        const response = await axios.get(`${BASE_URL}/diagnostic/status`, {
            timeout: 5000
        });
        console.log('✅ Questionnaire service is healthy');
        console.log(`   Service uptime: ${response.data.uptime || 'unknown'}`);
        return true;
    } catch (error) {
        console.log('❌ Questionnaire service health check failed:', error.message);
        return false;
    }
}

async function authenticateUser() {
    console.log('\n🔐 Authenticating user...');
    try {
        const response = await axios.post(`${AUTH_URL}/auth/login`, testCredentials, {
            timeout: 10000
        });
        
        if (response.data && response.data.tokens && response.data.tokens.accessToken) {
            authToken = response.data.tokens.accessToken;
            console.log('✅ Authentication successful');
            console.log(`   Token length: ${authToken.length} chars`);
            return true;
        } else {
            console.log('❌ Authentication failed - invalid response structure');
            console.log('Response:', JSON.stringify(response.data, null, 2));
            return false;
        }
    } catch (error) {
        console.log('❌ Authentication failed:', error.message);
        return false;
    }
}

async function getOrCreateSubmission() {
    console.log('\n📝 Getting or creating a test submission...');
    
    // First, try to get existing submissions
    try {
        const response = await axios.get(`${BASE_URL}/submissions`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log(`   Found ${response.data.length} existing submissions`);
        
        // Look for an in-progress submission
        const inProgressSubmission = response.data.find(sub => sub.status === 'in_progress');
        if (inProgressSubmission) {
            submissionId = inProgressSubmission.id;
            console.log(`✅ Using existing in-progress submission: ${submissionId}`);
            return true;
        }
        
        // If no in-progress submission, create a new one
        console.log('   No in-progress submission found, creating new one...');
        
    } catch (error) {
        console.log('⚠️  Could not fetch existing submissions:', error.message);
        console.log('   Attempting to create new submission...');
    }
    
    // Create new submission
    try {
        const createResponse = await axios.post(`${BASE_URL}/submissions`, {
            templateId: 1, // Assuming template ID 1 exists (ISO 27001:2013)
            userId: 1      // Test user ID
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        submissionId = createResponse.data.id;
        console.log(`✅ Created new submission: ${submissionId}`);
        return true;
        
    } catch (error) {
        console.log('❌ Failed to create submission:', error.message);
        if (error.response) {
            console.log('   Response status:', error.response.status);
            console.log('   Response data:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function testPutRequestDirect() {
    console.log('\n🧪 Testing PUT request directly to questionnaire service...');
    
    const testPayload = {
        answers: {
            "1": "Yes",
            "2": "No",
            "3": "Partially"
        },
        currentStep: 3
    };
    
    console.log(`   Submission ID: ${submissionId}`);
    console.log('   Test payload:', JSON.stringify(testPayload, null, 2));
    
    // Set up request monitoring
    const startTime = Date.now();
    let requestCompleted = false;
    
    // Set a timeout to detect hanging requests
    const timeoutId = setTimeout(() => {
        if (!requestCompleted) {
            console.log('🚨 PUT request has been hanging for 30 seconds - likely service crash!');
        }
    }, 30000);
    
    try {
        console.log('   Sending PUT request...');
        
        const response = await axios.put(`${BASE_URL}/submissions/${submissionId}`, testPayload, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 35000 // 35 second timeout
        });
        
        requestCompleted = true;
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        console.log(`✅ PUT request successful! Response time: ${responseTime}ms`);
        console.log('   Response status:', response.status);
        console.log('   Response data:', JSON.stringify(response.data, null, 2));
        return true;
        
    } catch (error) {
        requestCompleted = true;
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        console.log(`❌ PUT request failed after ${responseTime}ms`);
        console.log('   Error type:', error.code || error.name);
        console.log('   Error message:', error.message);
        
        if (error.code === 'ECONNRESET') {
            console.log('🚨 ECONNRESET detected - service likely crashed during request processing!');
        } else if (error.code === 'ECONNABORTED') {
            console.log('🚨 Request timeout - service likely hanging/crashed!');
        } else if (error.response) {
            console.log('   Response status:', error.response.status);
            console.log('   Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        return false;
    }
}

async function testPutRequestViaGateway() {
    console.log('\n🌐 Testing PUT request via API Gateway...');
    
    const testPayload = {
        answers: {
            "1": "Yes",
            "2": "No", 
            "3": "Partially"
        },
        currentStep: 3
    };
    
    const startTime = Date.now();
    let requestCompleted = false;
    
    const timeoutId = setTimeout(() => {
        if (!requestCompleted) {
            console.log('🚨 PUT request via gateway has been hanging for 30 seconds!');
        }
    }, 30000);
    
    try {
        console.log('   Sending PUT request via API Gateway...');
        
        const response = await axios.put(`${API_GATEWAY_URL}/api/questionnaire/submissions/${submissionId}`, testPayload, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 35000
        });
        
        requestCompleted = true;
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        console.log(`✅ Gateway PUT request successful! Response time: ${responseTime}ms`);
        console.log('   Response status:', response.status);
        return true;
        
    } catch (error) {
        requestCompleted = true;
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        console.log(`❌ Gateway PUT request failed after ${responseTime}ms`);
        console.log('   Error type:', error.code || error.name);
        console.log('   Error message:', error.message);
        
        if (error.response) {
            console.log('   Response status:', error.response.status);
            console.log('   Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        return false;
    }
}

async function checkServiceStatusAfterTest() {
    console.log('\n🔍 Checking service status after PUT test...');
    
    try {
        const response = await axios.get(`${BASE_URL}/diagnostic/status`, {
            timeout: 5000
        });
        console.log('✅ Service is still responding after PUT test');
        return true;
    } catch (error) {
        console.log('❌ Service is not responding after PUT test - likely crashed!');
        console.log('   Error:', error.message);
        return false;
    }
}

async function monitorServiceLogs() {
    console.log('\n📊 Service status after tests:');
    console.log('   Run the following command to check service logs:');
    console.log('   docker-compose logs --tail=20 questionnaire-service');
    console.log('\n   Run the following command to check service status:');
    console.log('   docker-compose ps questionnaire-service');
}

async function runDiagnosis() {
    console.log('Starting comprehensive PUT request crash diagnosis...\n');
    
    // Step 1: Check initial service health
    const healthOk = await checkServiceHealth();
    if (!healthOk) {
        console.log('\n❌ Service is not healthy, aborting diagnosis');
        return;
    }
    
    // Step 2: Authenticate
    const authOk = await authenticateUser();
    if (!authOk) {
        console.log('\n❌ Authentication failed, aborting diagnosis');
        return;
    }
    
    // Step 3: Get or create submission
    const submissionOk = await getOrCreateSubmission();
    if (!submissionOk) {
        console.log('\n❌ Could not get/create submission, aborting diagnosis');
        return;
    }
    
    // Step 4: Test PUT request directly to service
    console.log('\n' + '='.repeat(60));
    console.log('CRITICAL TEST: Direct PUT request to questionnaire service');
    console.log('='.repeat(60));
    
    const directPutOk = await testPutRequestDirect();
    
    // Step 5: Check if service is still alive
    await sleep(2000); // Wait a bit for any crash to manifest
    const serviceAliveAfterDirect = await checkServiceStatusAfterTest();
    
    if (!serviceAliveAfterDirect) {
        console.log('\n🚨 DIAGNOSIS COMPLETE: Service crashed on direct PUT request!');
        await monitorServiceLogs();
        return;
    }
    
    // Step 6: Test PUT request via gateway
    if (directPutOk) {
        console.log('\n' + '='.repeat(60));
        console.log('Additional test: PUT request via API Gateway');
        console.log('='.repeat(60));
        
        await testPutRequestViaGateway();
        await sleep(2000);
        await checkServiceStatusAfterTest();
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    
    if (directPutOk && serviceAliveAfterDirect) {
        console.log('✅ PUT requests appear to be working correctly');
        console.log('   No service crash detected during testing');
        console.log('   The issue may be intermittent or fixed');
    } else if (!directPutOk) {
        console.log('🚨 PUT request failed but service may still be alive');
        console.log('   Check error details above for root cause');
    } else {
        console.log('🚨 Service crashed during PUT request processing');
        console.log('   This confirms the reported issue');
    }
    
    await monitorServiceLogs();
}

// Run the diagnosis
runDiagnosis().catch(error => {
    console.error('\n💥 Diagnosis script crashed:', error.message);
    console.error(error.stack);
});
