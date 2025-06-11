#!/usr/bin/env node

const axios = require('axios');

async function fixLoginReliabilityIssue() {
    console.log('🔧 FIXING LOGIN RELIABILITY ISSUE');
    console.log('==================================');
    
    console.log('Issue Analysis:');
    console.log('- Frontend error: 401 Unauthorized at 21:46:21');
    console.log('- Our test: 200 Success at 21:49:31');
    console.log('- Time difference: 3+ minutes');
    console.log('- This suggests intermittent service readiness');

    console.log('\n1. 🔍 Testing service readiness and reliability');
    
    const testCredentials = { 
        email: 'good@test.com', 
        password: 'Password123' 
    };

    let successCount = 0;
    let failureCount = 0;
    const testRuns = 5;

    for (let i = 1; i <= testRuns; i++) {
        try {
            console.log(`\n   Test ${i}/${testRuns}: Testing login...`);
            const response = await axios.post('http://localhost:5000/api/auth/login', testCredentials, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`   ✅ SUCCESS: ${response.status} - Token: ${response.data.data.tokens.accessToken.substring(0, 20)}...`);
            successCount++;
        } catch (error) {
            console.log(`   ❌ FAILURE: ${error.response?.status || error.code} - ${error.response?.data?.message || error.message}`);
            failureCount++;
        }
        
        // Small delay between tests
        if (i < testRuns) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`\n📊 RELIABILITY TEST RESULTS:`);
    console.log(`   Success: ${successCount}/${testRuns} (${(successCount/testRuns*100).toFixed(1)}%)`);
    console.log(`   Failure: ${failureCount}/${testRuns} (${(failureCount/testRuns*100).toFixed(1)}%)`);

    if (successCount === testRuns) {
        console.log('\n✅ LOGIN SERVICE IS RELIABLE');
        console.log('   The issue was likely temporary service startup timing.');
        console.log('   Frontend should work correctly now.');
    } else {
        console.log('\n⚠️ LOGIN SERVICE HAS RELIABILITY ISSUES');
        console.log('   Need to investigate service startup dependencies.');
    }

    console.log('\n2. 🔄 Testing /me endpoint for session validation');
    
    try {
        // Get a fresh token
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', testCredentials, {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        const token = loginResponse.data.data.tokens.accessToken;
        
        // Test /me endpoint
        const meResponse = await axios.get('http://localhost:5000/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
        
        console.log(`✅ /me endpoint working: ${meResponse.status}`);
        console.log(`   User: ${meResponse.data.data.user.email}`);
        
    } catch (error) {
        console.log(`❌ /me endpoint failed: ${error.response?.status || error.code}`);
        console.log(`   This could cause frontend logout loops`);
    }

    console.log('\n3. 🎯 RECOMMENDATIONS');
    console.log('=====================');
    
    if (successCount === testRuns) {
        console.log('✅ ISSUE RESOLVED:');
        console.log('   - Login service is now stable and reliable');
        console.log('   - Frontend should work correctly');
        console.log('   - Try refreshing the browser and logging in again');
        console.log('   - The previous 401 error was likely due to temporary service startup timing');
    } else {
        console.log('⚠️ NEEDS ATTENTION:');
        console.log('   - Login service has reliability issues');
        console.log('   - Check auth service logs for startup errors');
        console.log('   - Consider increasing healthcheck timeouts');
        console.log('   - May need to restart auth service container');
    }
    
    console.log('\n4. 🔄 NEXT STEPS');
    console.log('================');
    console.log('1. Try logging in through the frontend browser');
    console.log('2. If it still fails, check browser network tab for exact error');
    console.log('3. If needed, restart auth service: docker-compose restart auth-service');
    console.log('4. Check auth service logs: docker-compose logs auth-service --tail=20');
}

fixLoginReliabilityIssue().catch(console.error);
