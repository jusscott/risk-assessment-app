#!/usr/bin/env node

const jwt = require('jsonwebtoken');

console.log('🔍 Testing Real JWT Token Validation');
console.log('====================================\n');

// The actual token from the auth service (from the diagnostic output)
const REAL_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIxMTZmNWM2LWY2YzYtNDFlMC04OWMyLWFkNTczMDZiZDM4ZCIsImVtYWlsIjoiZ29vZEB0ZXN0LmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzQ5NDg3MTU5LCJleHAiOjE3NDk0ODgwNTl9.vb6SK_HxEDU5faSQsvLlhRY5KAaUiIZT_1y56beMpwM';

const JWT_SECRET = 'shared-security-risk-assessment-secret-key';

console.log('1. Token Details');
console.log('---------------');
console.log('🔍 Token length:', REAL_TOKEN.length);
console.log('🔍 Token preview:', REAL_TOKEN.substring(0, 50) + '...');

// Decode without verification to see structure
console.log('\n2. Token Structure (Unverified)');
console.log('------------------------------');
try {
    const decoded = jwt.decode(REAL_TOKEN, { complete: true });
    console.log('✅ Token structure decoded successfully');
    console.log('🔍 Header:', JSON.stringify(decoded.header, null, 2));
    console.log('🔍 Payload:', JSON.stringify(decoded.payload, null, 2));
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.payload.exp;
    console.log('🔍 Current timestamp:', now);
    console.log('🔍 Token expires at:', exp);
    console.log('🔍 Token expired?', now > exp ? '❌ YES' : '✅ NO');
    
} catch (error) {
    console.log('❌ Failed to decode token structure:', error.message);
}

console.log('\n3. Token Validation Test');
console.log('-----------------------');

try {
    const verified = jwt.verify(REAL_TOKEN, JWT_SECRET);
    console.log('✅ Token verification SUCCESSFUL');
    console.log('🔍 Verified payload:', JSON.stringify(verified, null, 2));
} catch (error) {
    console.log('❌ Token verification FAILED:', error.message);
    console.log('🔍 Error type:', error.constructor.name);
    console.log('🔍 Full error:', error);
}

console.log('\n4. Testing Different Verification Options');
console.log('----------------------------------------');

// Test with different verification options
const verificationOptions = [
    { algorithms: ['HS256'] },
    { algorithms: ['HS256'], ignoreExpiration: true },
    { algorithms: ['HS256', 'HS384', 'HS512'] },
    { algorithms: ['HS256'], clockTolerance: 60 }
];

verificationOptions.forEach((options, index) => {
    try {
        const verified = jwt.verify(REAL_TOKEN, JWT_SECRET, options);
        console.log(`✅ Option ${index + 1} SUCCESSFUL:`, JSON.stringify(options));
    } catch (error) {
        console.log(`❌ Option ${index + 1} FAILED:`, JSON.stringify(options), '-', error.message);
    }
});

console.log('\n5. Testing Manual Signature Validation');
console.log('-------------------------------------');

// Manual signature validation to understand the issue
const [headerB64, payloadB64, signatureB64] = REAL_TOKEN.split('.');
const crypto = require('crypto');

console.log('🔍 Header (base64):', headerB64);
console.log('🔍 Payload (base64):', payloadB64);
console.log('🔍 Signature (base64):', signatureB64);

// Create expected signature
const data = headerB64 + '.' + payloadB64;
const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64url');

console.log('🔍 Expected signature:', expectedSignature);
console.log('🔍 Actual signature:  ', signatureB64);
console.log('🔍 Signatures match?', expectedSignature === signatureB64 ? '✅ YES' : '❌ NO');

console.log('\n🏁 Real JWT Validation Test Complete');
