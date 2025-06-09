#!/usr/bin/env node

const jwt = require('jsonwebtoken');

console.log('🔍 Testing JWT Validation Inside Questionnaire Container');
console.log('======================================================\n');

// The exact same token that validates successfully outside
const REAL_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIxMTZmNWM2LWY2YzYtNDFlMC04OWMyLWFkNTczMDZiZDM4ZCIsImVtYWlsIjoiZ29vZEB0ZXN0LmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzQ5NDg3MTU5LCJleHAiOjE3NDk0ODgwNTl9.vb6SK_HxEDU5faSQsvLlhRY5KAaUiIZT_1y56beMpwM';

console.log('1. Environment Check');
console.log('-------------------');
console.log('🔍 JWT_SECRET from env:', process.env.JWT_SECRET);
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 Container hostname:', require('os').hostname());

const JWT_SECRET = process.env.JWT_SECRET || 'shared-security-risk-assessment-secret-key';
console.log('🔍 Using JWT_SECRET:', JWT_SECRET);

console.log('\n2. JWT Library Information');
console.log('-------------------------');
try {
    const jwtPackage = require('jsonwebtoken/package.json');
    console.log('🔍 JWT library version:', jwtPackage.version);
} catch (e) {
    console.log('⚠️ Could not get JWT library version');
}

console.log('\n3. Token Details');
console.log('---------------');
console.log('🔍 Token length:', REAL_TOKEN.length);
console.log('🔍 Token preview:', REAL_TOKEN.substring(0, 50) + '...');

console.log('\n4. Token Structure Check');
console.log('-----------------------');
try {
    const decoded = jwt.decode(REAL_TOKEN, { complete: true });
    console.log('✅ Token structure decoded successfully');
    console.log('🔍 Header:', JSON.stringify(decoded.header, null, 2));
    console.log('🔍 Payload:', JSON.stringify(decoded.payload, null, 2));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.payload.exp;
    console.log('🔍 Current timestamp:', now);
    console.log('🔍 Token expires at:', exp);
    console.log('🔍 Token expired?', now > exp ? '❌ YES' : '✅ NO');
    console.log('🔍 Time until expiry:', exp - now, 'seconds');
    
} catch (error) {
    console.log('❌ Failed to decode token structure:', error.message);
}

console.log('\n5. JWT Validation Test');
console.log('---------------------');
try {
    const verified = jwt.verify(REAL_TOKEN, JWT_SECRET);
    console.log('✅ JWT verification SUCCESSFUL inside container');
    console.log('🔍 Verified payload:', JSON.stringify(verified, null, 2));
} catch (error) {
    console.log('❌ JWT verification FAILED inside container:', error.message);
    console.log('🔍 Error type:', error.constructor.name);
    console.log('🔍 Error name:', error.name);
    console.log('🔍 Full error:', error);
}

console.log('\n6. Manual Signature Check');
console.log('-------------------------');
const crypto = require('crypto');
const [headerB64, payloadB64, signatureB64] = REAL_TOKEN.split('.');

console.log('🔍 Header (base64):', headerB64);
console.log('🔍 Payload (base64):', payloadB64);
console.log('🔍 Signature (base64):', signatureB64);

// Create expected signature manually
const data = headerB64 + '.' + payloadB64;
const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64url');

console.log('🔍 Expected signature:', expectedSignature);
console.log('🔍 Actual signature:  ', signatureB64);
console.log('🔍 Signatures match?', expectedSignature === signatureB64 ? '✅ YES' : '❌ NO');

// Additional crypto testing
console.log('\n7. Crypto Module Information');
console.log('----------------------------');
console.log('🔍 Crypto constants available:', !!crypto.constants);
console.log('🔍 Available hash algorithms:', crypto.getHashes().slice(0, 10));

console.log('\n8. Testing Different JWT Options');
console.log('-------------------------------');
const testOptions = [
    { algorithms: ['HS256'] },
    { algorithms: ['HS256'], ignoreExpiration: true },
    { algorithms: ['HS256'], clockTolerance: 60 },
    { algorithms: ['HS256'], ignoreNotBefore: true }
];

testOptions.forEach((options, index) => {
    try {
        jwt.verify(REAL_TOKEN, JWT_SECRET, options);
        console.log(`✅ Option ${index + 1} SUCCESS:`, JSON.stringify(options));
    } catch (error) {
        console.log(`❌ Option ${index + 1} FAILED:`, JSON.stringify(options), '-', error.message);
    }
});

console.log('\n🏁 Container JWT Validation Test Complete');
