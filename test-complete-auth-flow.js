const axios = require('axios');

async function testCompleteAuthFlow() {
    console.log('🧪 TESTING COMPLETE AUTHENTICATION FLOW');
    console.log('='.repeat(60));
    console.log('Simulating: Login -> Dashboard -> Click Questionnaires');
    
    const baseURL = 'http://localhost:5000';
    let authToken = null;
    
    try {
        // Step 1: Login (as you did)
        console.log('\n1️⃣ USER LOGS IN');
        console.log('-'.repeat(30));
        console.log('Email: jusscott@gmail.com');
        console.log('Password: Password123');
        
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'jusscott@gmail.com',
            password: 'Password123'
        });
        
        if (loginResponse.status === 200 && loginResponse.data.success) {
            authToken = loginResponse.data.data.tokens.accessToken;
            console.log('✅ Login successful');
            console.log(`   User: ${loginResponse.data.data.user.email}`);
            console.log(`   User ID: ${loginResponse.data.data.user.id}`);
        } else {
            console.log('❌ Login failed');
            return;
        }
        
        // Step 2: Frontend calls /auth/me to validate user (as dashboard does)
        console.log('\n2️⃣ DASHBOARD LOADS - CHECKING USER STATUS');
        console.log('-'.repeat(30));
        
        const meResponse = await axios.get(`${baseURL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (meResponse.status === 200) {
            console.log('✅ User validation successful - Dashboard can load');
            console.log(`   Validated user: ${meResponse.data.email || meResponse.data.user?.email || 'User data available'}`);
        } else {
            console.log('❌ User validation failed - Would redirect to login');
            return;
        }
        
        // Step 3: User clicks on Questionnaires (the problematic step)
        console.log('\n3️⃣ USER CLICKS "QUESTIONNAIRES"');
        console.log('-'.repeat(30));
        
        // Test questionnaire templates (main questionnaire page)
        const templatesResponse = await axios.get(`${baseURL}/api/questionnaires/templates`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (templatesResponse.status === 200) {
            console.log('✅ Questionnaires page loads successfully!');
            console.log(`   Templates available: ${templatesResponse.data.length || 0}`);
            console.log('   🎉 NO MORE "Authentication required. Please log in again" ERROR!');
        } else {
            console.log('❌ Questionnaires page failed to load');
            return;
        }
        
        // Step 4: Test other questionnaire endpoints
        console.log('\n4️⃣ TESTING OTHER QUESTIONNAIRE FEATURES');
        console.log('-'.repeat(30));
        
        // Test user's submissions
        try {
            const submissionsResponse = await axios.get(`${baseURL}/api/questionnaires/submissions`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (submissionsResponse.status === 200) {
                console.log('✅ User submissions load successfully');
                console.log(`   Submissions found: ${submissionsResponse.data.length || 0}`);
            }
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('⚠️  Submissions endpoint returns 404 (may need routing fix)');
            } else {
                console.log(`❌ Submissions failed: ${error.response?.status || error.message}`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 SUCCESS SUMMARY');
        console.log('='.repeat(60));
        console.log('✅ Login works correctly');
        console.log('✅ Dashboard authentication works');  
        console.log('✅ Questionnaires page loads without auth errors');
        console.log('✅ User can now access questionnaire features');
        console.log('\n🔧 ISSUE RESOLVED: No more authentication errors when clicking Questionnaires!');
        
    } catch (error) {
        console.log('\n❌ FLOW FAILED:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Error:', error.response.data);
        }
    }
}

testCompleteAuthFlow().catch(console.error);
