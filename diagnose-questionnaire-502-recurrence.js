const axios = require('axios');

console.log('=== QUESTIONNAIRE 502 ERROR RECURRENCE DIAGNOSTIC ===\n');

async function checkServiceHealth() {
    console.log('1. CHECKING SERVICE HEALTH STATUS');
    console.log('=====================================');
    
    const services = [
        { name: 'API Gateway', url: 'http://localhost:5000/health' },
        { name: 'Auth Service', url: 'http://localhost:3001/health' },
        { name: 'Questionnaire Service', url: 'http://localhost:3002/health' }
    ];
    
    for (const service of services) {
        try {
            const start = Date.now();
            const response = await axios.get(service.url, { timeout: 5000 });
            const duration = Date.now() - start;
            console.log(`✅ ${service.name}: HEALTHY (${duration}ms)`);
            if (response.data) {
                console.log(`   Response: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            console.log(`❌ ${service.name}: UNHEALTHY`);
            console.log(`   Error: ${error.message}`);
            if (error.code) {
                console.log(`   Code: ${error.code}`);
            }
        }
    }
    console.log('');
}

async function checkContainerStatus() {
    console.log('2. CHECKING DOCKER CONTAINER STATUS');
    console.log('====================================');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
        const { stdout } = await execPromise('docker-compose ps --format "table {{.Name}}\\t{{.State}}\\t{{.Status}}"');
        console.log(stdout);
    } catch (error) {
        console.log(`❌ Error checking container status: ${error.message}`);
    }
    console.log('');
}

async function testQuestionnaireEndpoints() {
    console.log('3. TESTING QUESTIONNAIRE ENDPOINTS');
    console.log('===================================');
    
    // Test the specific failing endpoint
    const endpoints = [
        'http://localhost:5000/api/questionnaires/submissions/in-progress',
        'http://localhost:5000/api/questionnaires/templates',
        'http://localhost:3002/api/submissions/in-progress', // Direct questionnaire service
        'http://localhost:3002/health' // Direct health check
    ];
    
    for (const endpoint of endpoints) {
        try {
            const start = Date.now();
            const response = await axios.get(endpoint, { 
                timeout: 10000,
                headers: {
                    'Authorization': 'Bearer test-token-for-diagnostic'
                }
            });
            const duration = Date.now() - start;
            console.log(`✅ ${endpoint}: SUCCESS (${duration}ms)`);
            console.log(`   Status: ${response.status}`);
            if (response.data && typeof response.data === 'object') {
                console.log(`   Data length: ${Array.isArray(response.data) ? response.data.length : Object.keys(response.data).length}`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint}: FAILED`);
            console.log(`   Status: ${error.response?.status || 'No response'}`);
            console.log(`   Message: ${error.response?.data?.message || error.message}`);
            
            if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.message.includes('socket hang up')) {
                console.log(`   🔍 CONNECTION ISSUE DETECTED: ${error.code || 'Socket issue'}`);
            }
        }
    }
    console.log('');
}

async function checkApiGatewayLogs() {
    console.log('4. CHECKING API GATEWAY LOGS (LAST 20 LINES)');
    console.log('==============================================');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
        const { stdout } = await execPromise('docker-compose logs --tail=20 api-gateway');
        console.log(stdout);
    } catch (error) {
        console.log(`❌ Error checking API Gateway logs: ${error.message}`);
    }
    console.log('');
}

async function checkQuestionnaireServiceLogs() {
    console.log('5. CHECKING QUESTIONNAIRE SERVICE LOGS (LAST 20 LINES)');
    console.log('========================================================');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
        const { stdout } = await execPromise('docker-compose logs --tail=20 questionnaire-service');
        console.log(stdout);
    } catch (error) {
        console.log(`❌ Error checking Questionnaire Service logs: ${error.message}`);
    }
    console.log('');
}

async function runDiagnosis() {
    console.log(`Diagnostic started at: ${new Date().toISOString()}`);
    console.log('User reported: 502 Bad Gateway errors on questionnaire save after question 17\n');
    
    await checkServiceHealth();
    await checkContainerStatus();
    await testQuestionnaireEndpoints();
    await checkApiGatewayLogs();
    await checkQuestionnaireServiceLogs();
    
    console.log('=== DIAGNOSTIC SUMMARY ===');
    console.log('Based on previous fixes, this is likely a connection pool issue.');
    console.log('Previous resolution: Restart API Gateway to refresh stale connections.');
    console.log('Command to fix: docker-compose restart api-gateway');
    console.log('');
    console.log('Diagnostic completed at:', new Date().toISOString());
}

runDiagnosis().catch(console.error);
