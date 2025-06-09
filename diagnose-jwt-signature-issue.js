#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const axios = require('axios');

console.log('🔍 JWT Signature Issue Diagnostic');
console.log('=====================================\n');

// Test JWT secret consistency
const TEST_PAYLOAD = { userId: 'test-user', email: 'test@example.com' };
const JWT_SECRET = 'shared-security-risk-assessment-secret-key';

async function diagnoseJWTIssue() {
    try {
        console.log('1. Testing JWT Token Creation and Validation');
        console.log('--------------------------------------------');
        
        // Create a test token
        const testToken = jwt.sign(TEST_PAYLOAD, JWT_SECRET, { 
            expiresIn: '1h',
            algorithm: 'HS256'
        });
        
        console.log('✅ Test token created successfully');
        console.log('🔍 Token preview:', testToken.substring(0, 50) + '...');
        console.log('🔍 Token length:', testToken.length);
        
        // Verify the token we just created
        try {
            const decoded = jwt.verify(testToken, JWT_SECRET);
            console.log('✅ Token verification successful');
            console.log('🔍 Decoded payload:', decoded);
        } catch (error) {
            console.log('❌ Token verification failed:', error.message);
            return;
        }
        
        console.log('\n2. Testing Real Auth Service Token');
        console.log('----------------------------------');
        
        // Get a real token from auth service
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        if (loginResponse.data.success && loginResponse.data.tokens) {
            const realToken = loginResponse.data.tokens.accessToken;
            console.log('✅ Got real token from auth service');
            console.log('🔍 Real token preview:', realToken.substring(0, 50) + '...');
            console.log('🔍 Real token length:', realToken.length);
            
            // Try to verify the real token
            try {
                const decoded = jwt.verify(realToken, JWT_SECRET);
                console.log('✅ Real token verification successful');
                console.log('🔍 Real token payload:', decoded);
            } catch (error) {
                console.log('❌ Real token verification failed:', error.message);
                console.log('🔍 Error type:', error.constructor.name);
                
                // Decode without verification to see the structure
                try {
                    const decoded = jwt.decode(realToken, { complete: true });
                    console.log('🔍 Token header:', decoded.header);
                    console.log('🔍 Token payload (unverified):', decoded.payload);
                } catch (decodeError) {
                    console.log('❌ Cannot decode token structure:', decodeError.message);
                }
            }
            
            console.log('\n3. Testing Questionnaire Service Direct Validation');
            console.log('--------------------------------------------------');
            
            // Test the questionnaire service endpoint with the real token
            try {
                const questionnaireResponse = await axios.get('http://localhost:5000/api/questionnaire/templates', {
                    headers: {
                        'Authorization': `Bearer ${realToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('✅ Questionnaire service responded successfully');
                console.log('🔍 Response status:', questionnaireResponse.status);
            } catch (error) {
                console.log('❌ Questionnaire service request failed:', error.message);
                if (error.response) {
                    console.log('🔍 Response status:', error.response.status);
                    console.log('🔍 Response data:', error.response.data);
                }
            }
            
        } else {
            console.log('❌ Failed to get token from auth service');
            console.log('🔍 Login response:', loginResponse.data);
        }
        
        console.log('\n4. Checking Container JWT Environment');
        console.log('------------------------------------');
        
        // Check if there are any differences in JWT secrets across containers
        const containers = ['auth-service', 'questionnaire-service'];
        for (const container of containers) {
            try {
                const { exec } = require('child_process');
                exec(`docker-compose exec -T ${container} env | grep JWT`, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`❌ Error checking ${container}:`, error.message);
                    } else {
                        console.log(`✅ ${container} JWT_SECRET:`, stdout.trim());
                    }
                });
            } catch (error) {
                console.log(`❌ Failed to check ${container}:`, error.message);
            }
        }
        
        // Wait a bit for the container checks to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n5. Checking JWT Algorithm Consistency');
        console.log('------------------------------------');
        
        // Test different algorithms
        const algorithms = ['HS256', 'HS384', 'HS512'];
        for (const alg of algorithms) {
            try {
                const token = jwt.sign(TEST_PAYLOAD, JWT_SECRET, { 
                    algorithm: alg,
                    expiresIn: '1h'
                });
                
                try {
                    jwt.verify(token, JWT_SECRET, { algorithms: [alg] });
                    console.log(`✅ Algorithm ${alg}: Working`);
                } catch (verifyError) {
                    console.log(`❌ Algorithm ${alg}: Verification failed -`, verifyError.message);
                }
            } catch (signError) {
                console.log(`❌ Algorithm ${alg}: Signing failed -`, signError.message);
            }
        }
        
    } catch (error) {
        console.log('❌ Diagnostic failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the diagnostic
diagnoseJWTIssue().then(() => {
    console.log('\n🏁 JWT Diagnostic Complete');
}).catch(error => {
    console.error('❌ Diagnostic error:', error);
});
