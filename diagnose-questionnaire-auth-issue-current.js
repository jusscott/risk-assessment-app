const axios = require('axios');

async function diagnoseQuestionnaireAuthIssue() {
    console.log('🔍 DIAGNOSING QUESTIONNAIRE AUTHENTICATION ISSUE');
    console.log('='.repeat(60));
    
    const baseURL = 'http://localhost:5000';
    let authToken = null;
    
    try {
        // Step 1: Test login
        console.log('\n1️⃣ TESTING LOGIN FLOW');
        console.log('-'.repeat(30));
        
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'jusscott@gmail.com',
            password: 'Password123'
        });
        
        if (loginResponse.status === 200 && loginResponse.data.success && loginResponse.data.data.tokens.accessToken) {
            authToken = loginResponse.data.data.tokens.accessToken;
            console.log('✅ Login successful');
            console.log(`   Token (first 20 chars): ${authToken.substring(0, 20)}...`);
            console.log(`   User: ${loginResponse.data.data.user?.email || 'Unknown'}`);
        } else {
            console.log('❌ Login failed:', loginResponse.status);
            return;
        }
        
        // Step 2: Test /auth/me endpoint 
        console.log('\n2️⃣ TESTING /auth/me ENDPOINT');
        console.log('-'.repeat(30));
        
        try {
            const meResponse = await axios.get(`${baseURL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ /auth/me endpoint working');
            console.log(`   User: ${meResponse.data.email || meResponse.data.user?.email}`);
        } catch (error) {
            console.log('❌ /auth/me endpoint failed:', error.response?.status, error.response?.data);
        }
        
        // Step 3: Test questionnaire endpoints
        console.log('\n3️⃣ TESTING QUESTIONNAIRE ENDPOINTS');
        console.log('-'.repeat(30));
        
        // Test templates endpoint
        try {
            const templatesResponse = await axios.get(`${baseURL}/api/questionnaires/templates`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Questionnaire templates endpoint working');
            console.log(`   Templates found: ${templatesResponse.data.length || 0}`);
        } catch (error) {
            console.log('❌ Questionnaire templates endpoint failed:', error.response?.status);
            console.log(`   Error: ${error.response?.data?.message || error.message}`);
            
            // Check if it's an auth error specifically
            if (error.response?.status === 401) {
                console.log('   🔴 AUTHENTICATION ERROR - This is the issue!');
            }
        }
        
        // Test submissions endpoint
        try {
            const submissionsResponse = await axios.get(`${baseURL}/api/questionnaires/submissions`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Questionnaire submissions endpoint working');
            console.log(`   Submissions found: ${submissionsResponse.data.length || 0}`);
        } catch (error) {
            console.log('❌ Questionnaire submissions endpoint failed:', error.response?.status);
            console.log(`   Error: ${error.response?.data?.message || error.message}`);
        }
        
        // Step 4: Check API Gateway routing
        console.log('\n4️⃣ CHECKING API GATEWAY ROUTING');
        console.log('-'.repeat(30));
        
        // Test direct questionnaire service (if accessible)
        try {
            const directResponse = await axios.get(`http://localhost:3002/templates`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Direct questionnaire service accessible');
        } catch (error) {
            console.log('❌ Direct questionnaire service not accessible:', error.code || error.response?.status);
        }
        
        // Step 5: Test token structure
        console.log('\n5️⃣ ANALYZING TOKEN STRUCTURE');
        console.log('-'.repeat(30));
        
        try {
            // Decode JWT token (without verification)
            const [header, payload, signature] = authToken.split('.');
            const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
            
            console.log('Token payload:');
            console.log(`   User ID: ${decodedPayload.userId || decodedPayload.id}`);
            console.log(`   Email: ${decodedPayload.email}`);
            console.log(`   Issued at: ${new Date(decodedPayload.iat * 1000).toISOString()}`);
            console.log(`   Expires at: ${new Date(decodedPayload.exp * 1000).toISOString()}`);
            
            // Check if token is expired
            const now = Math.floor(Date.now() / 1000);
            if (decodedPayload.exp < now) {
                console.log('🔴 TOKEN IS EXPIRED!');
            } else {
                console.log('✅ Token is valid (not expired)');
            }
            
        } catch (error) {
            console.log('❌ Could not decode token:', error.message);
        }
        
    } catch (error) {
        console.log('❌ Critical error during diagnosis:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 DIAGNOSIS COMPLETE');
}

diagnoseQuestionnaireAuthIssue().catch(console.error);
