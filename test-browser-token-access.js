// Browser token diagnostic - run this in browser console when you get auth error
// Copy and paste this entire script into browser console at http://localhost:3000

(function() {
    console.log('🔍 BROWSER TOKEN DIAGNOSTIC');
    console.log('='.repeat(60));
    
    // Check localStorage tokens
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const lastTokenRefresh = localStorage.getItem('lastTokenRefresh');
    
    console.log('\n1️⃣ LOCAL STORAGE STATUS');
    console.log('-'.repeat(30));
    console.log('Access Token:', token ? `EXISTS (${token.length} chars)` : 'MISSING');
    console.log('Refresh Token:', refreshToken ? `EXISTS (${refreshToken.length} chars)` : 'MISSING');
    console.log('Last Refresh:', lastTokenRefresh ? new Date(parseInt(lastTokenRefresh)).toISOString() : 'NEVER');
    
    if (token) {
        console.log('Token Preview:', token.substring(0, 30) + '...');
        
        // Try to decode token
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('\n2️⃣ TOKEN DECODED');
            console.log('-'.repeat(30));
            console.log('User ID:', payload.id);
            console.log('Email:', payload.email);
            console.log('Role:', payload.role);
            console.log('Issued:', new Date(payload.iat * 1000).toISOString());
            console.log('Expires:', new Date(payload.exp * 1000).toISOString());
            
            const now = Math.floor(Date.now() / 1000);
            const timeToExpiry = payload.exp - now;
            
            if (timeToExpiry > 0) {
                console.log(`⏱️ Time to expiry: ${timeToExpiry} seconds (${Math.floor(timeToExpiry/60)} minutes)`);
                console.log('✅ Token is VALID');
            } else {
                console.log('❌ Token is EXPIRED');
            }
        } catch (error) {
            console.log('❌ Failed to decode token:', error.message);
        }
    }
    
    // Test direct API call
    console.log('\n3️⃣ TESTING QUESTIONNAIRE API DIRECTLY');
    console.log('-'.repeat(30));
    
    if (token) {
        fetch('http://localhost:5000/api/questionnaires/templates', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('Direct API Response Status:', response.status);
            if (response.status === 200) {
                console.log('✅ Direct API call WORKS - token is valid');
                console.log('🔍 This means the issue is in React routing or component logic');
            } else if (response.status === 401) {
                console.log('❌ Direct API call FAILED - token rejected by backend');
                response.text().then(text => console.log('Error response:', text));
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                console.log('Templates returned:', Array.isArray(data) ? data.length : 'Not an array');
            }
        })
        .catch(error => {
            console.log('❌ API call failed:', error.message);
        });
    }
    
    // Check Redux store if available
    console.log('\n4️⃣ CHECKING REDUX STORE');
    console.log('-'.repeat(30));
    
    if (window.__REDUX_DEVTOOLS_EXTENSION__) {
        console.log('Redux DevTools available - check auth state there');
    }
    
    // Look for React store on window
    if (window.store) {
        const state = window.store.getState();
        if (state.auth) {
            console.log('Redux auth state:', state.auth);
        }
    } else {
        console.log('No Redux store found on window object');
    }
    
    // Check current URL and routing
    console.log('\n5️⃣ CURRENT PAGE CONTEXT');
    console.log('-'.repeat(30));
    console.log('Current URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    
    // Instructions for user
    console.log('\n' + '='.repeat(60));
    console.log('📋 NEXT STEPS:');
    console.log('1. If token is VALID and direct API works: Issue is in React component');
    console.log('2. If token is EXPIRED: You need to refresh your login');
    console.log('3. If token is MISSING: Check login process');
    console.log('4. Copy this entire output and share with developer');
    console.log('='.repeat(60));
    
})();
