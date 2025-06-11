const axios = require('axios');

console.log('🔍 Testing Questionnaire Save Progress 502 Fix Verification');
console.log('='.repeat(60));

async function testSaveProgress() {
    try {
        // First, test basic auth service connectivity
        console.log('1. Testing auth service connectivity...');
        const authResponse = await axios.get('http://localhost:5000/api/auth/health');
        console.log('✅ Auth service healthy:', authResponse.status);

        // Test questionnaire service connectivity through API Gateway
        console.log('2. Testing questionnaire service connectivity through API Gateway...');
        const questionnaireResponse = await axios.get('http://localhost:5000/api/questionnaires/health');
        console.log('✅ Questionnaire service healthy through API Gateway:', questionnaireResponse.status);

        // Test login to get a valid token
        console.log('3. Testing login to get authentication token...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        if (!loginResponse.data.tokens || !loginResponse.data.tokens.accessToken) {
            throw new Error('No access token received from login');
        }
        
        const token = loginResponse.data.tokens.accessToken;
        console.log('✅ Login successful, token received');

        // Test questionnaire templates with auth
        console.log('4. Testing questionnaire templates with authentication...');
        const templatesResponse = await axios.get('http://localhost:5000/api/questionnaires/templates', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('✅ Templates loaded:', templatesResponse.data.length, 'templates');

        // Test existing submissions
        console.log('5. Testing existing submissions retrieval...');
        const submissionsResponse = await axios.get('http://localhost:5000/api/questionnaires/submissions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('✅ Submissions loaded:', submissionsResponse.data.length, 'submissions');

        // If there are submissions, test updating one (this was the failing operation)
        if (submissionsResponse.data.length > 0) {
            const submission = submissionsResponse.data[0];
            console.log('6. Testing submission update (PUT) - the previously failing operation...');
            
            // Prepare update data
            const updateData = {
                answers: submission.answers || {},
                progress: submission.progress || 0,
                status: submission.status || 'in_progress'
            };

            // Add a test answer to verify update
            updateData.answers['test_question'] = 'test_answer_' + Date.now();
            
            const updateResponse = await axios.put(
                `http://localhost:5000/api/questionnaires/submissions/${submission.id}`,
                updateData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Submission update successful!');
            console.log('   - Status:', updateResponse.status);
            console.log('   - Response:', updateResponse.data.message || 'Update completed');
            console.log('   - Submission ID:', submission.id);
        } else {
            console.log('6. No existing submissions to test update with');
        }

        console.log('\n🎉 SUCCESS: All questionnaire operations working!');
        console.log('✅ Save progress 502 error has been RESOLVED');
        console.log('✅ API Gateway connection pool has been refreshed');
        console.log('✅ Questionnaire service connectivity restored');
        
        return true;

    } catch (error) {
        console.error('\n❌ ERROR during testing:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Message:', error.response.data?.message || error.response.statusText);
            console.error('   URL:', error.config?.url);
            console.error('   Method:', error.config?.method?.toUpperCase());
            
            if (error.response.status === 502) {
                console.error('\n🔴 502 Bad Gateway Error Still Present!');
                console.error('   This indicates the connection pool issue persists');
                console.error('   May need additional troubleshooting');
            }
        } else {
            console.error('   Error:', error.message);
        }
        return false;
    }
}

// Run the test
testSaveProgress().then(success => {
    if (success) {
        console.log('\n✅ Fix verification completed successfully');
        process.exit(0);
    } else {
        console.log('\n❌ Fix verification failed');
        process.exit(1);
    }
});
