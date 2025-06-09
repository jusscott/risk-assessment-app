#!/usr/bin/env node

/**
 * Verify WS Module Installation
 */

console.log('🔍 Verifying WS Module Installation');
console.log('===================================');

try {
    // Test basic require
    console.log('Testing basic require...');
    const WebSocket = require('ws');
    console.log('✅ Basic require successful');
    
    // Test WebSocket creation
    console.log('Testing WebSocket creation...');
    const ws = new WebSocket.Server({ port: 0 });
    console.log('✅ WebSocket server creation successful');
    
    // Get version info
    const packagePath = require.resolve('ws/package.json');
    const wsPackage = require(packagePath);
    console.log('✅ WS Version:', wsPackage.version);
    
    ws.close();
    console.log('🎉 All WS module tests passed!');
    
} catch (error) {
    console.error('❌ WS Module verification failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('1. Run: npm install ws@^8.13.0');
    console.log('2. Clear npm cache: npm cache clean --force');
    console.log('3. Delete node_modules and package-lock.json, then npm install');
    console.log('4. Check for native compilation issues');
    
    process.exit(1);
}