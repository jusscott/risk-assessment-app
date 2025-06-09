#!/usr/bin/env node

/**
 * Critical Questionnaire Display Diagnostic Tool
 * Analyzes why questionnaires are not displaying for authenticated users
 * Focus: Real user jusscott@gmail.com authentication and service connectivity
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class QuestionnaireDisplayDiagnostic {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            issues: [],
            fixes: [],
            summary: ''
        };
        
        // Test configuration for real user
        this.testUser = {
            email: 'jusscott@gmail.com',
            // We'll need to extract this from auth or use test credentials
        };
        
        this.services = {
            apiGateway: 'http://localhost:3000',
            authService: 'http://localhost:3001', 
            questionnaireService: 'http://localhost:3002',
            frontend: 'http://localhost:5173'
        };
        
        console.log('🔍 Starting Critical Questionnaire Display Diagnostic...');
        console.log(`Target User: ${this.testUser.email}`);
        console.log('Focus: Service connectivity and authentication flow\n');
    }

    async runDiagnostic() {
        try {
            await this.checkServiceHealth();
            await this.checkDockerServiceNames();
            await this.checkAuthFlow();
            await this.checkQuestionnaireServiceConnectivity();
            await this.checkAPIGatewayProxying();
            await this.checkDatabaseConnectivity();
            await this.analyzeFrontendRequests();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Diagnostic failed:', error.message);
            this.results.issues.push({
                type: 'DIAGNOSTIC_ERROR',
                severity: 'HIGH',
                description: `Diagnostic tool error: ${error.message}`,
                location: 'diagnostic-tool'
            });
        }
    }

    async checkServiceHealth() {
        console.log('🏥 Checking Service Health...');
        
        const services = [
            { name: 'API Gateway', url: `${this.services.apiGateway}/health` },
            { name: 'Auth Service', url: `${this.services.authService}/health` },
            { name: 'Questionnaire Service', url: `${this.services.questionnaireService}/health` }
        ];
        
        for (const service of services) {
            try {
                const response = await axios.get(service.url, { timeout: 5000 });
                console.log(`  ✅ ${service.name}: ${response.status} - ${response.data?.status || 'OK'}`);
            } catch (error) {
                console.log(`  ❌ ${service.name}: ${error.code || error.message}`);
                this.results.issues.push({
                    type: 'SERVICE_HEALTH',
                    severity: 'HIGH',
                    description: `${service.name} is not responding`,
                    location: service.url,
                    error: error.message,
                    fix: `Check ${service.name.toLowerCase().replace(' ', '-')} container status and logs`
                });
            }
        }
        console.log();
    }

    async checkDockerServiceNames() {
        console.log('🐳 Checking Docker Service Name Configuration...');
        
        const envFiles = [
            'backend/questionnaire-service/.env',
            'backend/questionnaire-service/.env.development', 
            'backend/api-gateway/.env',
            'backend/auth-service/.env'
        ];
        
        const localhostPattern = /localhost/gi;
        const serviceNameIssues = [];
        
        for (const envFile of envFiles) {
            const filePath = path.join(__dirname, envFile);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if (localhostPattern.test(line) && !line.startsWith('#')) {
                        serviceNameIssues.push({
                            file: envFile,
                            line: index + 1,
                            content: line.trim(),
                            issue: 'Uses localhost instead of Docker service name'
                        });
                    }
                });
            }
        }
        
        if (serviceNameIssues.length > 0) {
            console.log('  ❌ Found Docker service name issues:');
            serviceNameIssues.forEach(issue => {
                console.log(`    - ${issue.file}:${issue.line} -> ${issue.content}`);
            });
            
            this.results.issues.push({
                type: 'DOCKER_SERVICE_NAMES',
                severity: 'HIGH',
                description: 'Environment files use localhost instead of Docker service names',
                details: serviceNameIssues,
                fix: 'Replace localhost with proper Docker service names (auth-service, questionnaire-service, etc.)'
            });
        } else {
            console.log('  ✅ Docker service names appear correctly configured');
        }
        console.log();
    }

    async checkAuthFlow() {
        console.log('🔐 Checking Authentication Flow...');
        
        try {
            // Check auth service validate-token endpoint
            const validateTokenUrl = `${this.services.authService}/api/auth/validate-token`;
            console.log(`  Testing validate-token endpoint: ${validateTokenUrl}`);
            
            // This will fail without a token, but we can check if the endpoint exists
            try {
                await axios.post(validateTokenUrl, {}, { timeout: 5000 });
            } catch (error) {
                if (error.response?.status === 401 || error.response?.status === 400) {
                    console.log('  ✅ Auth validate-token endpoint is responding (expected 401/400)');
                } else {
                    console.log(`  ❌ Auth validate-token endpoint error: ${error.message}`);
                    this.results.issues.push({
                        type: 'AUTH_ENDPOINT',
                        severity: 'HIGH',
                        description: 'Auth service validate-token endpoint not responding properly',
                        location: validateTokenUrl,
                        error: error.message
                    });
                }
            }
            
            // Check if questionnaire service can reach auth service
            const questionnaireAuthCheck = `${this.services.questionnaireService}/api/diagnostic/auth-connectivity`;
            try {
                const response = await axios.get(questionnaireAuthCheck, { timeout: 5000 });
                console.log('  ✅ Questionnaire service can reach auth service');
            } catch (error) {
                console.log('  ❌ Questionnaire service cannot reach auth service');
                this.results.issues.push({
                    type: 'SERVICE_CONNECTIVITY',
                    severity: 'HIGH',
                    description: 'Questionnaire service cannot reach auth service for token validation',
                    location: 'questionnaire-service -> auth-service',
                    error: error.message,
                    fix: 'Check service-to-service connectivity and Docker networking'
                });
            }
            
        } catch (error) {
            console.log(`  ❌ Auth flow check failed: ${error.message}`);
        }
        console.log();
    }

    async checkQuestionnaireServiceConnectivity() {
        console.log('📋 Checking Questionnaire Service Connectivity...');
        
        const endpoints = [
            { name: 'Templates', path: '/api/questionnaire/templates' },
            { name: 'Submissions', path: '/api/questionnaire/submissions' },
            { name: 'Diagnostic', path: '/api/diagnostic/health' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                const url = `${this.services.questionnaireService}${endpoint.path}`;
                const response = await axios.get(url, { 
                    timeout: 5000,
                    headers: {
                        'Authorization': 'Bearer test-token-check-endpoint'
                    }
                });
                console.log(`  ✅ ${endpoint.name}: ${response.status}`);
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log(`  🔒 ${endpoint.name}: Requires authentication (expected)`);
                } else {
                    console.log(`  ❌ ${endpoint.name}: ${error.code || error.message}`);
                    this.results.issues.push({
                        type: 'QUESTIONNAIRE_ENDPOINT',
                        severity: 'MEDIUM',
                        description: `Questionnaire ${endpoint.name} endpoint error`,
                        location: `questionnaire-service${endpoint.path}`,
                        error: error.message
                    });
                }
            }
        }
        console.log();
    }

    async checkAPIGatewayProxying() {
        console.log('🌐 Checking API Gateway Proxying...');
        
        const proxyRoutes = [
            { name: 'Auth Routes', path: '/api/auth/health' },
            { name: 'Questionnaire Routes', path: '/api/questionnaire/templates' }
        ];
        
        for (const route of proxyRoutes) {
            try {
                const url = `${this.services.apiGateway}${route.path}`;
                const response = await axios.get(url, { timeout: 5000 });
                console.log(`  ✅ ${route.name}: ${response.status} (proxied successfully)`);
            } catch (error) {
                console.log(`  ❌ ${route.name}: ${error.code || error.message}`);
                this.results.issues.push({
                    type: 'API_GATEWAY_PROXY',
                    severity: 'HIGH', 
                    description: `API Gateway not properly proxying ${route.name}`,
                    location: `api-gateway${route.path}`,
                    error: error.message,
                    fix: 'Check API Gateway proxy configuration and service URLs'
                });
            }
        }
        console.log();
    }

    async checkDatabaseConnectivity() {
        console.log('🗄️ Checking Database Connectivity...');
        
        try {
            const dbHealthUrl = `${this.services.questionnaireService}/api/diagnostic/database`;
            const response = await axios.get(dbHealthUrl, { timeout: 10000 });
            
            if (response.data?.database?.status === 'connected') {
                console.log('  ✅ Questionnaire service database connection healthy');
            } else {
                console.log('  ❌ Questionnaire service database connection issues');
                this.results.issues.push({
                    type: 'DATABASE_CONNECTIVITY',
                    severity: 'HIGH',
                    description: 'Questionnaire service database connection problems',
                    details: response.data,
                    fix: 'Check Prisma client configuration and database container'
                });
            }
        } catch (error) {
            console.log(`  ❌ Database connectivity check failed: ${error.message}`);
            this.results.issues.push({
                type: 'DATABASE_CHECK',
                severity: 'HIGH',
                description: 'Unable to check database connectivity',
                error: error.message,
                fix: 'Ensure questionnaire service diagnostic endpoints are available'
            });
        }
        console.log();
    }

    async analyzeFrontendRequests() {
        console.log('🖥️ Analyzing Frontend Request Patterns...');
        
        // Check questionnaire service integration patterns
        const serviceFiles = [
            'frontend/src/services/questionnaire.service.ts',
            'frontend/src/services/questionnaire-wrapper.ts',
            'frontend/src/pages/Questionnaires.tsx'
        ];
        
        for (const file of serviceFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check for potential request issues
                if (content.includes('localhost')) {
                    this.results.issues.push({
                        type: 'FRONTEND_HARDCODED_URL',
                        severity: 'MEDIUM',
                        description: `Frontend file ${file} contains hardcoded localhost URLs`,
                        location: file,
                        fix: 'Use environment variables or relative URLs'
                    });
                }
                
                // Check for proper error handling
                if (!content.includes('catch') && content.includes('axios')) {
                    this.results.issues.push({
                        type: 'FRONTEND_ERROR_HANDLING',
                        severity: 'LOW',
                        description: `Frontend file ${file} may lack proper error handling`,
                        location: file,
                        fix: 'Add comprehensive error handling for API requests'
                    });
                }
            }
        }
        
        console.log('  ✅ Frontend request pattern analysis complete');
        console.log();
    }

    generateReport() {
        console.log('📊 DIAGNOSTIC REPORT');
        console.log('='.repeat(50));
        
        const highPriorityIssues = this.results.issues.filter(i => i.severity === 'HIGH');
        const mediumPriorityIssues = this.results.issues.filter(i => i.severity === 'MEDIUM');
        const lowPriorityIssues = this.results.issues.filter(i => i.severity === 'LOW');
        
        console.log(`\n🔴 HIGH Priority Issues (${highPriorityIssues.length}):`);
        highPriorityIssues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue.type}: ${issue.description}`);
            if (issue.location) console.log(`   Location: ${issue.location}`);
            if (issue.fix) console.log(`   Fix: ${issue.fix}`);
            console.log();
        });
        
        if (mediumPriorityIssues.length > 0) {
            console.log(`\n🟡 MEDIUM Priority Issues (${mediumPriorityIssues.length}):`);
            mediumPriorityIssues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.type}: ${issue.description}`);
                if (issue.fix) console.log(`   Fix: ${issue.fix}`);
            });
            console.log();
        }
        
        // Generate summary and recommendations
        this.generateRecommendations();
        
        // Save results to file
        fs.writeFileSync('questionnaire-display-diagnostic-report.json', JSON.stringify(this.results, null, 2));
        console.log('📄 Full diagnostic report saved to: questionnaire-display-diagnostic-report.json');
    }

    generateRecommendations() {
        console.log('\n🎯 RECOMMENDED FIXES (Priority Order):');
        console.log('-'.repeat(50));
        
        const fixes = [
            {
                priority: 1,
                title: 'Fix Docker Service Names',
                description: 'Replace localhost with Docker service names in environment files',
                command: 'node fix-docker-service-names.js'
            },
            {
                priority: 2,
                title: 'Verify Service Connectivity',
                description: 'Test auth-service to questionnaire-service communication',
                command: 'docker exec questionnaire-service curl http://auth-service:3001/health'
            },
            {
                priority: 3,
                title: 'Check API Gateway Configuration',
                description: 'Verify proxy middleware and routing configuration',
                command: 'node verify-api-gateway-routing.js'
            },
            {
                priority: 4,
                title: 'Test Authentication Flow',
                description: 'Verify token validation between services',
                command: 'node test-auth-token-validation.js'
            }
        ];
        
        fixes.forEach(fix => {
            console.log(`${fix.priority}. ${fix.title}`);
            console.log(`   ${fix.description}`);
            console.log(`   Command: ${fix.command}`);
            console.log();
        });
        
        console.log('🔧 To apply automated fixes, run:');
        console.log('   node fix-questionnaire-display-issues.js');
        console.log();
    }
}

// Run diagnostic
const diagnostic = new QuestionnaireDisplayDiagnostic();
diagnostic.runDiagnostic().catch(console.error);
