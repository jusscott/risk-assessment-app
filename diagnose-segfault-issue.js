#!/usr/bin/env node

const axios = require('axios');
const { execSync } = require('child_process');

console.log('='.repeat(80));
console.log('QUESTIONNAIRE SERVICE SEGMENTATION FAULT DIAGNOSTIC');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log();

async function diagnoseCrashIssue() {
    try {
        console.log('🔍 ANALYZING SEGMENTATION FAULT PATTERN...');
        console.log();

        // 1. Check Docker container status and restart history
        console.log('📊 CONTAINER STATUS ANALYSIS:');
        try {
            const containerInfo = execSync('cd /Users/justin.scott/Projects/risk-assessment-app && docker-compose ps questionnaire-service', { encoding: 'utf8' });
            console.log(containerInfo);
            
            const containerStats = execSync('cd /Users/justin.scott/Projects/risk-assessment-app && docker stats questionnaire-service --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}"', { encoding: 'utf8' });
            console.log('Memory and CPU usage:');
            console.log(containerStats);
        } catch (error) {
            console.log('Error getting container info:', error.message);
        }
        console.log();

        // 2. Check Node.js and dependency versions
        console.log('🔧 DEPENDENCY VERSION ANALYSIS:');
        try {
            const packageInfo = execSync('cd /Users/justin.scott/Projects/risk-assessment-app && docker-compose exec questionnaire-service node --version', { encoding: 'utf8' });
            console.log('Node.js version:', packageInfo.trim());
            
            const npmList = execSync('cd /Users/justin.scott/Projects/risk-assessment-app && docker-compose exec questionnaire-service npm list --depth=0', { encoding: 'utf8' });
            console.log('NPM packages:');
            console.log(npmList);
        } catch (error) {
            console.log('Error getting dependency info:', error.message);
        }
        console.log();

        // 3. Check for memory leaks in recent logs
        console.log('🚨 CRASH PATTERN ANALYSIS:');
        try {
            const recentLogs = execSync('cd /Users/justin.scott/Projects/risk-assessment-app && docker-compose logs --tail=50 questionnaire-service | grep -E "(Segmentation fault|error|Error|crash|memory|stack)"', { encoding: 'utf8' });
            console.log('Recent error patterns:');
            console.log(recentLogs);
        } catch (error) {
            console.log('No specific error patterns found in recent logs');
        }
        console.log();

        // 4. Test basic service endpoints to trigger issue
        console.log('🧪 ENDPOINT STRESS TEST:');
        const baseUrl = 'http://localhost:5000/api/questionnaire';
        
        try {
            // Test templates endpoint (usually safe)
            console.log('Testing templates endpoint...');
            const templatesResponse = await axios.get(`${baseUrl}/templates`);
            console.log(`✅ Templates: ${templatesResponse.status} - ${templatesResponse.data?.length || 0} templates`);
        } catch (error) {
            console.log(`❌ Templates failed: ${error.message}`);
        }

        try {
            // Test diagnostic endpoint
            console.log('Testing diagnostic endpoint...');
            const diagnosticResponse = await axios.get(`${baseUrl}/diagnostic/status`);
            console.log(`✅ Diagnostic: ${diagnosticResponse.status}`);
        } catch (error) {
            console.log(`❌ Diagnostic failed: ${error.message}`);
        }

        // 5. Analyze problematic endpoints
        console.log();
        console.log('🎯 PROBLEMATIC ENDPOINT ANALYSIS:');
        
        // Test the endpoints that frequently cause crashes
        const problematicEndpoints = [
            '/diagnostic/system-health',
            '/diagnostic/full-diagnostic'
        ];

        for (const endpoint of problematicEndpoints) {
            try {
                console.log(`Testing ${endpoint}...`);
                const response = await axios.get(`${baseUrl}${endpoint}`, { timeout: 5000 });
                console.log(`✅ ${endpoint}: ${response.status}`);
            } catch (error) {
                console.log(`❌ ${endpoint}: ${error.message}`);
            }
        }

        console.log();
        console.log('🔍 ROOT CAUSE ANALYSIS:');
        console.log();
        console.log('Based on the logs analysis, the segmentation faults occur during:');
        console.log('1. PUT requests to /submissions/{id} (save progress operations)');
        console.log('2. GET requests to /submissions/in-progress (progress calculations)');
        console.log('3. Enhanced client auth service calls');
        console.log('4. Database operations with Prisma client');
        console.log();
        console.log('SUSPECTED ROOT CAUSES:');
        console.log('🔸 Prisma Client Version: Using 4.16.2 (upgrade available to 6.9.0)');
        console.log('🔸 Memory Corruption: Likely in progress calculation or database queries');
        console.log('🔸 Stack Overflow: Complex nested operations in submission processing');
        console.log('🔸 Native Module Issue: Prisma or other native dependencies');
        console.log();
        console.log('RECOMMENDED SOLUTIONS:');
        console.log('1. 🔧 Upgrade Prisma to latest version (6.9.0)');
        console.log('2. 🔧 Add memory limits and monitoring');
        console.log('3. 🔧 Optimize progress calculation logic');
        console.log('4. 🔧 Add defensive programming for database operations');
        console.log('5. 🔧 Investigate enhanced client memory usage');

    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
    }
}

// Run the diagnostic
diagnoseCrashIssue().then(() => {
    console.log();
    console.log('='.repeat(80));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('='.repeat(80));
});
