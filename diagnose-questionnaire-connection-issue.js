const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function diagnoseQuestionnaireConnection() {
    console.log('🔍 QUESTIONNAIRE SERVICE CONNECTION DIAGNOSTIC');
    console.log('================================================');
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    // Test 1: Direct connection to questionnaire service
    console.log('📡 TEST 1: Direct connection to questionnaire service');
    try {
        const response = await axios.get('http://localhost:5002/health', { timeout: 5000 });
        console.log('✅ Direct connection successful');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data)}`);
    } catch (error) {
        console.log('❌ Direct connection failed');
        console.log(`   Error: ${error.message}`);
        if (error.code) console.log(`   Code: ${error.code}`);
    }

    // Test 2: Check Docker container status
    console.log('\n🐳 TEST 2: Docker container status');
    try {
        const { stdout } = await execAsync('cd risk-assessment-app && docker-compose ps questionnaire-service');
        console.log('✅ Container status:');
        console.log(stdout);
    } catch (error) {
        console.log('❌ Failed to get container status');
        console.log(`   Error: ${error.message}`);
    }

    // Test 3: Check recent logs for errors
    console.log('\n📋 TEST 3: Recent questionnaire service logs');
    try {
        const { stdout } = await execAsync('cd risk-assessment-app && docker-compose logs questionnaire-service --tail=20');
        console.log('✅ Recent logs:');
        console.log(stdout);
    } catch (error) {
        console.log('❌ Failed to get logs');
        console.log(`   Error: ${error.message}`);
    }

    // Test 4: Check API Gateway logs for questionnaire service errors
    console.log('\n🌐 TEST 4: API Gateway logs for questionnaire errors');
    try {
        const { stdout } = await execAsync('cd risk-assessment-app && docker-compose logs api-gateway --tail=30 | grep -i questionnaire');
        if (stdout.trim()) {
            console.log('✅ Found questionnaire-related logs in API Gateway:');
            console.log(stdout);
        } else {
            console.log('ℹ️  No questionnaire-related errors found in recent API Gateway logs');
        }
    } catch (error) {
        console.log('❌ Failed to check API Gateway logs');
        console.log(`   Error: ${error.message}`);
    }

    // Test 5: Network connectivity test
    console.log('\n🔗 TEST 5: Network connectivity test');
    try {
        // Try to ping questionnaire service from API gateway container
        const { stdout } = await execAsync('cd risk-assessment-app && docker-compose exec -T questionnaire-service ping -c 3 api-gateway');
        console.log('✅ Network connectivity test (questionnaire -> api-gateway):');
        console.log(stdout);
    } catch (error) {
        console.log('❌ Network connectivity test failed');
        console.log(`   Error: ${error.message}`);
    }

    // Test 6: Check if service is actually listening on port 5002
    console.log('\n🔌 TEST 6: Port listening check');
    try {
        const { stdout } = await execAsync('cd risk-assessment-app && docker-compose exec -T questionnaire-service netstat -tlnp | grep 5002');
        if (stdout.trim()) {
            console.log('✅ Service is listening on port 5002:');
            console.log(stdout);
        } else {
            console.log('❌ Service is NOT listening on port 5002');
        }
    } catch (error) {
        console.log('❌ Failed to check port listening');
        console.log(`   Error: ${error.message}`);
    }

    // Test 7: Test specific questionnaire endpoints
    console.log('\n🎯 TEST 7: Test specific questionnaire endpoints');
    const endpoints = [
        '/health',
        '/api/health',
        '/api/templates',
        '/diagnostic/status'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`http://localhost:5002${endpoint}`, { 
                timeout: 5000,
                validateStatus: () => true // Accept all status codes
            });
            console.log(`✅ ${endpoint}: Status ${response.status}`);
            if (response.status !== 200) {
                console.log(`   Response: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
    }

    // Test 8: Check Docker health check configuration
    console.log('\n🏥 TEST 8: Docker health check analysis');
    try {
        const { stdout } = await execAsync('cd risk-assessment-app && docker inspect questionnaire-service | grep -A 10 -B 2 "Healthcheck"');
        if (stdout.trim()) {
            console.log('✅ Health check configuration:');
            console.log(stdout);
        } else {
            console.log('ℹ️  No health check configuration found');
        }
    } catch (error) {
        console.log('❌ Failed to inspect health check configuration');
        console.log(`   Error: ${error.message}`);
    }

    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=====================');
    console.log('1. Check if questionnaire service responds to direct health checks');
    console.log('2. Verify Docker container status and recent restarts');
    console.log('3. Review logs for connection errors or service crashes');
    console.log('4. Confirm network connectivity between containers');
    console.log('5. Ensure service is properly listening on port 5002');
    console.log('6. Test all available endpoints for functionality');
    console.log('7. Review Docker health check configuration');
    console.log('\nIf service is running but showing as unhealthy, the issue is likely:');
    console.log('- Docker health check using wrong endpoint or configuration');
    console.log('- Service intermittently failing or taking too long to respond');
    console.log('- Network connectivity issues between containers');
    console.log('- Service startup timing issues');
}

// Run the diagnostic
diagnoseQuestionnaireConnection().catch(console.error);
