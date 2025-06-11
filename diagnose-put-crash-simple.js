const axios = require('axios');

console.log('=== QUESTIONNAIRE SERVICE PUT REQUEST CRASH DIAGNOSIS (BYPASS AUTH) ===\n');

// Configuration
const BASE_URL = 'http://localhost:5002';

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
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        return true;
    } catch (error) {
        console.log('❌ Questionnaire service health check failed:', error.message);
        return false;
    }
}

async function getExistingSubmissions() {
    console.log('\n📋 Getting existing submissions (bypassing auth)...');
    try {
        const response = await axios.get(`${BASE_URL}/submissions`, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': '1' // Fallback user ID for bypass auth
            },
            timeout: 10000
        });
        
        console.log(`   Found ${response.data.length} existing submissions`);
        response.data.forEach(submission => {
            console.log(`   - ID: ${submission.id}, Status: ${submission.status}, Template: ${submission.templateId}`);
        });
        
        // Look for an in-progress submission
        const inProgressSubmission = response.data.find(sub => sub.status === 'in_progress');
        if (inProgressSubmission) {
            submissionId = inProgressSubmission.id;
            console.log(`✅ Using existing in-progress submission: ${submissionId}`);
            return true;
        }
        
        // Use any existing submission for testing
        if (response.data.length > 0) {
            submissionId = response.data[0].id;
            console.log(`✅ Using existing submission: ${submissionId} (status: ${response.data[0].status})`);
            return true;
        }
        
        console.log('   No existing submissions found, will create new one...');
        return false;
        
    } catch (error) {
        console.log('⚠️  Could not fetch existing submissions:', error.message);
        console.log('   Will attempt to create new submission...');
        return false;
    }
}

async function createNewSubmission() {
    console.log('\n📝 Creating new submission (bypassing auth)...');
    try {
        const response = await axios.post(`${BASE_URL}/submissions`, {
            templateId: 1, // Assuming template ID 1 exists (ISO 27001:2013)
            userId: 1      // Test user ID
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': '1' // Fallback user ID for bypass auth
            },
            timeout: 10000
        });
        
        if (response.data && response.data.data && response.data.data.id) {
            submissionId = response.data.data.id;
        } else if (response.data && response.data.id) {
            submissionId = response.data.id;
        } else {
            console.log('❌ Could not extract submission ID from response');
            console.log('   Full response:', JSON.stringify(response.data, null, 2));
            return false;
        }
        
        console.log(`✅ Created new submission: ${submissionId}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
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

async function testPutRequestCrash() {
    console.log('\n🧪 Testing PUT request to trigger potential crash...');
    
    const testPayload = {
        answers: {
            "1": "Yes - We have implemented comprehensive security policies",
            "2": "No - Risk assessment is not performed regularly", 
            "3": "Partially - Some security controls are in place but not all"
        },
        currentStep: 3
    };
    
    console.log(`   Submission ID: ${submissionId}`);
    console.log('   Test payload:');
    console.log(JSON.stringify(testPayload, null, 4));
    
    // Monitor service before request
    console.log('\n   Checking service status before PUT request...');
    const preRequestHealth = await checkServiceHealthQuick();
    if (!preRequestHealth) {
        console.log('❌ Service is not healthy before PUT request');
        return false;
    }
    
    // Set up request monitoring
    const startTime = Date.now();
    let requestCompleted = false;
    
    // Set a timeout to detect hanging requests
    const timeoutId = setTimeout(() => {
        if (!requestCompleted) {
            console.log('🚨 PUT request has been hanging for 45 seconds - likely service crash or hang!');
        }
    }, 45000);
    
    try {
        console.log('   Sending PUT request...');
        
        const response = await axios.put(`${BASE_URL}/submissions/${submissionId}`, testPayload, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': '1' // Fallback user ID for bypass auth
            },
            timeout: 50000 // 50 second timeout
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
            console.log('🚨 ECONNRESET detected - service crashed during request processing!');
        } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            console.log('🚨 Request timeout - service likely hanging/crashed!');
        } else if (error.response) {
            console.log('   Response status:', error.response.status);
            console.log('   Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        return false;
    }
}

async function checkServiceHealthQuick() {
    try {
        const response = await axios.get(`${BASE_URL}/diagnostic/status`, {
            timeout: 3000
        });
        return true;
    } catch (error) {
        return false;
    }
}

async function checkServiceStatusAfterTest() {
    console.log('\n🔍 Checking service status after PUT test...');
    
    // Wait a moment for any crash to manifest
    await sleep(3000);
    
    try {
        const response = await axios.get(`${BASE_URL}/diagnostic/status`, {
            timeout: 5000
        });
        console.log('✅ Service is still responding after PUT test');
        console.log(`   Service appears stable`);
        return true;
    } catch (error) {
        console.log('❌ Service is not responding after PUT test - likely crashed!');
        console.log('   Error:', error.message);
        return false;
    }
}

async function checkDockerServiceStatus() {
    console.log('\n📊 Service status summary:');
    console.log('   Run these commands to check service status:');
    console.log('   1. docker-compose ps questionnaire-service');
    console.log('   2. docker-compose logs --tail=20 questionnaire-service');
    console.log('   3. curl -f http://localhost:5002/diagnostic/status');
}

async function testMultiplePutRequests() {
    console.log('\n🔄 Testing multiple PUT requests to identify crash pattern...');
    
    for (let i = 1; i <= 3; i++) {
        console.log(`\n--- PUT Request Test ${i}/3 ---`);
        
        const success = await testPutRequestCrash();
        
        if (!success) {
            console.log(`❌ PUT request ${i} failed`);
            
            // Check if service is still alive
            const serviceAlive = await checkServiceStatusAfterTest();
            if (!serviceAlive) {
                console.log(`🚨 Service crashed on PUT request ${i}!`);
                return false;
            }
        } else {
            console.log(`✅ PUT request ${i} successful`);
        }
        
        // Small delay between requests
        if (i < 3) {
            console.log('   Waiting 2 seconds before next test...');
            await sleep(2000);
        }
    }
    
    return true;
}

async function runDiagnosis() {
    console.log('Starting PUT request crash diagnosis (bypassing authentication)...\n');
    
    // Step 1: Check initial service health
    const healthOk = await checkServiceHealth();
    if (!healthOk) {
        console.log('\n❌ Service is not healthy, aborting diagnosis');
        return;
    }
    
    // Step 2: Get existing submissions or create new one
    const hasSubmissions = await getExistingSubmissions();
    if (!hasSubmissions) {
        const created = await createNewSubmission();
        if (!created) {
            console.log('\n❌ Could not create submission, aborting diagnosis');
            return;
        }
    }
    
    // Step 3: Test PUT requests
    console.log('\n' + '='.repeat(60));
    console.log('CRITICAL TEST: PUT request crash diagnosis');
    console.log('='.repeat(60));
    
    const multipleTestsOk = await testMultiplePutRequests();
    
    // Step 4: Final service health check
    await checkServiceStatusAfterTest();
    
    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    
    if (multipleTestsOk) {
        console.log('✅ PUT requests completed without causing service crash');
        console.log('   The service appears stable during PUT operations');
        console.log('   The crash issue may be intermittent or already resolved');
    } else {
        console.log('🚨 PUT request caused service crash or hang');
        console.log('   This confirms the reported issue');
        console.log('   Service restart will be required');
    }
    
    await checkDockerServiceStatus();
}

// Run the diagnosis
runDiagnosis().catch(error => {
    console.error('\n💥 Diagnosis script crashed:', error.message);
    console.error(error.stack);
});
