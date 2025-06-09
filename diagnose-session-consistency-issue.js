#!/usr/bin/env node

/**
 * Session Consistency Diagnostic Tool
 * 
 * Diagnoses inconsistent authentication sessions where users can login
 * but questionnaire access fails intermittently, requiring logout/login cycles.
 * 
 * Focus: Token validation consistency across services
 */

const axios = require('axios');
const { execSync } = require('child_process');

class SessionConsistencyDiagnostic {
    constructor() {
        this.apiGatewayUrl = 'http://localhost:5000';
        this.testEmail = 'jusscott@gmail.com';
        this.testPassword = 'lamasass12';
        this.authToken = null;
        this.issues = [];
        this.diagnosticResults = {};
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}]`;
        console.log(`${prefix} ${message}`);
    }

    logError(message, error) {
        this.log(`ERROR: ${message}`, 'ERROR');
        if (error) {
            this.log(`Details: ${error.message}`, 'ERROR');
            if (error.response) {
                this.log(`Status: ${error.response.status}`, 'ERROR');
                this.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'ERROR');
            }
        }
        this.issues.push({ message, error: error?.message, timestamp: new Date() });
    }

    async checkServiceHealth() {
        this.log('=== CHECKING SERVICE HEALTH ===');
        const services = [
            { name: 'API Gateway', url: `${this.apiGatewayUrl}/health` },
            { name: 'Auth Service', url: `${this.apiGatewayUrl}/api/auth/health` },
            { name: 'Questionnaire Service', url: `${this.apiGatewayUrl}/api/questionnaire/health` }
        ];

        for (const service of services) {
            try {
                const response = await axios.get(service.url, { timeout: 5000 });
                this.log(`✓ ${service.name}: ${response.status} - ${JSON.stringify(response.data)}`);
                this.diagnosticResults[`${service.name}_health`] = 'OK';
            } catch (error) {
                this.logError(`✗ ${service.name} health check failed`, error);
                this.diagnosticResults[`${service.name}_health`] = 'FAILED';
            }
        }
    }

    async testLoginFlow() {
        this.log('=== TESTING LOGIN FLOW ===');
        
        try {
            // Test login
            this.log(`Attempting login for: ${this.testEmail}`);
            const loginResponse = await axios.post(`${this.apiGatewayUrl}/api/auth/login`, {
                email: this.testEmail,
                password: this.testPassword
            }, {
                timeout: 10000,
                validateStatus: () => true // Accept all status codes
            });

            this.log(`Login response status: ${loginResponse.status}`);
            this.log(`Login response: ${JSON.stringify(loginResponse.data, null, 2)}`);

            if (loginResponse.status === 200 && loginResponse.data.data && loginResponse.data.data.tokens && loginResponse.data.data.tokens.accessToken) {
                this.authToken = loginResponse.data.data.tokens.accessToken;
                this.log(`✓ Login successful - Token received`);
                this.log(`Token preview: ${this.authToken.substring(0, 50)}...`);
                this.diagnosticResults.login_flow = 'SUCCESS';
                return true;
            } else {
                this.logError('✗ Login failed - No token received');
                this.diagnosticResults.login_flow = 'FAILED';
                return false;
            }
        } catch (error) {
            this.logError('✗ Login request failed', error);
            this.diagnosticResults.login_flow = 'ERROR';
            return false;
        }
    }

    async testTokenValidation() {
        this.log('=== TESTING TOKEN VALIDATION ACROSS SERVICES ===');
        
        if (!this.authToken) {
            this.logError('No auth token available for validation tests');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };

        // Test auth service token validation
        await this.testAuthServiceValidation(headers);
        
        // Test questionnaire service token validation
        await this.testQuestionnaireServiceValidation(headers);
        
        // Test API Gateway auth middleware
        await this.testApiGatewayAuth(headers);
    }

    async testAuthServiceValidation(headers) {
        try {
            this.log('Testing Auth Service token validation...');
            const response = await axios.get(`${this.apiGatewayUrl}/api/auth/validate-token`, {
                headers,
                timeout: 10000,
                validateStatus: () => true
            });

            this.log(`Auth service validation status: ${response.status}`);
            this.log(`Auth service response: ${JSON.stringify(response.data, null, 2)}`);

            if (response.status === 200) {
                this.log('✓ Auth service token validation successful');
                this.diagnosticResults.auth_service_validation = 'SUCCESS';
            } else {
                this.logError('✗ Auth service token validation failed');
                this.diagnosticResults.auth_service_validation = 'FAILED';
            }
        } catch (error) {
            this.logError('✗ Auth service validation request failed', error);
            this.diagnosticResults.auth_service_validation = 'ERROR';
        }
    }

    async testQuestionnaireServiceValidation(headers) {
        try {
            this.log('Testing Questionnaire Service token validation...');
            
            // Test getting questionnaire templates (should require auth)
            const response = await axios.get(`${this.apiGatewayUrl}/api/questionnaire/templates`, {
                headers,
                timeout: 10000,
                validateStatus: () => true
            });

            this.log(`Questionnaire service status: ${response.status}`);
            this.log(`Questionnaire service response: ${JSON.stringify(response.data, null, 2)}`);

            if (response.status === 200) {
                this.log('✓ Questionnaire service authentication successful');
                this.diagnosticResults.questionnaire_service_auth = 'SUCCESS';
            } else if (response.status === 401) {
                this.logError('✗ Questionnaire service authentication failed - 401 Unauthorized');
                this.diagnosticResults.questionnaire_service_auth = 'UNAUTHORIZED';
            } else {
                this.logError(`✗ Questionnaire service unexpected response: ${response.status}`);
                this.diagnosticResults.questionnaire_service_auth = 'FAILED';
            }
        } catch (error) {
            this.logError('✗ Questionnaire service request failed', error);
            this.diagnosticResults.questionnaire_service_auth = 'ERROR';
        }
    }

    async testApiGatewayAuth(headers) {
        try {
            this.log('Testing API Gateway auth middleware...');
            
            // Test a protected route through API Gateway
            const response = await axios.get(`${this.apiGatewayUrl}/api/auth/profile`, {
                headers,
                timeout: 10000,
                validateStatus: () => true
            });

            this.log(`API Gateway auth status: ${response.status}`);
            this.log(`API Gateway response: ${JSON.stringify(response.data, null, 2)}`);

            if (response.status === 200) {
                this.log('✓ API Gateway authentication successful');
                this.diagnosticResults.api_gateway_auth = 'SUCCESS';
            } else if (response.status === 401) {
                this.logError('✗ API Gateway authentication failed - 401 Unauthorized');
                this.diagnosticResults.api_gateway_auth = 'UNAUTHORIZED';
            } else {
                this.logError(`✗ API Gateway unexpected response: ${response.status}`);
                this.diagnosticResults.api_gateway_auth = 'FAILED';
            }
        } catch (error) {
            this.logError('✗ API Gateway request failed', error);
            this.diagnosticResults.api_gateway_auth = 'ERROR';
        }
    }

    async testInProgressQuestionnaires() {
        this.log('=== TESTING IN-PROGRESS QUESTIONNAIRES ACCESS ===');
        
        if (!this.authToken) {
            this.logError('No auth token available for questionnaire tests');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };

        try {
            // Test getting user's questionnaire submissions (in-progress)
            this.log('Testing in-progress questionnaires access...');
            const response = await axios.get(`${this.apiGatewayUrl}/api/questionnaire/submissions`, {
                headers,
                timeout: 10000,
                validateStatus: () => true
            });

            this.log(`In-progress questionnaires status: ${response.status}`);
            this.log(`In-progress questionnaires response: ${JSON.stringify(response.data, null, 2)}`);

            if (response.status === 200) {
                this.log('✓ In-progress questionnaires access successful');
                this.diagnosticResults.in_progress_questionnaires = 'SUCCESS';
                
                if (response.data && response.data.length > 0) {
                    this.log(`Found ${response.data.length} questionnaire submissions`);
                } else {
                    this.log('No questionnaire submissions found for user');
                }
            } else if (response.status === 401) {
                this.logError('✗ In-progress questionnaires access failed - 401 Unauthorized');
                this.diagnosticResults.in_progress_questionnaires = 'UNAUTHORIZED';
            } else {
                this.logError(`✗ In-progress questionnaires unexpected response: ${response.status}`);
                this.diagnosticResults.in_progress_questionnaires = 'FAILED';
            }
        } catch (error) {
            this.logError('✗ In-progress questionnaires request failed', error);
            this.diagnosticResults.in_progress_questionnaires = 'ERROR';
        }
    }

    async checkDockerLogs() {
        this.log('=== ANALYZING DOCKER LOGS ===');
        
        const services = [
            'api-gateway',
            'auth-service',
            'questionnaire-service'
        ];

        for (const service of services) {
            try {
                this.log(`Checking logs for ${service}...`);
                
                // Get recent logs (last 50 lines)
                const logs = execSync(`docker logs --tail=50 ${service} 2>&1`, {
                    encoding: 'utf8',
                    timeout: 10000
                });

                // Look for authentication-related patterns
                const authPatterns = [
                    'bypassing authentication',
                    'authentication required',
                    'token validation',
                    'unauthorized',
                    'jusscott@gmail.com',
                    'JWT',
                    'Bearer',
                    'auth middleware'
                ];

                const relevantLines = logs.split('\n').filter(line => 
                    authPatterns.some(pattern => 
                        line.toLowerCase().includes(pattern.toLowerCase())
                    )
                );

                if (relevantLines.length > 0) {
                    this.log(`Found ${relevantLines.length} authentication-related log entries in ${service}:`);
                    relevantLines.slice(-10).forEach(line => {
                        this.log(`  ${line.trim()}`);
                    });
                } else {
                    this.log(`No recent authentication-related logs found in ${service}`);
                }

                this.diagnosticResults[`${service}_logs`] = relevantLines.length > 0 ? 'FOUND' : 'CLEAN';

            } catch (error) {
                this.logError(`Failed to check logs for ${service}`, error);
                this.diagnosticResults[`${service}_logs`] = 'ERROR';
            }
        }
    }

    async testSessionConsistency() {
        this.log('=== TESTING SESSION CONSISTENCY ===');
        
        if (!this.authToken) {
            this.logError('No auth token available for session consistency tests');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };

        // Make multiple rapid requests to different services to test consistency
        const requests = [
            { name: 'Auth Profile', url: `${this.apiGatewayUrl}/api/auth/profile` },
            { name: 'Questionnaire Templates', url: `${this.apiGatewayUrl}/api/questionnaire/templates` },
            { name: 'Questionnaire Submissions', url: `${this.apiGatewayUrl}/api/questionnaire/submissions` },
            { name: 'Auth Profile (repeat)', url: `${this.apiGatewayUrl}/api/auth/profile` }
        ];

        const results = [];

        for (const request of requests) {
            try {
                this.log(`Testing ${request.name}...`);
                const startTime = Date.now();
                
                const response = await axios.get(request.url, {
                    headers,
                    timeout: 10000,
                    validateStatus: () => true
                });

                const responseTime = Date.now() - startTime;
                
                results.push({
                    name: request.name,
                    status: response.status,
                    responseTime,
                    success: response.status === 200
                });

                this.log(`${request.name}: ${response.status} (${responseTime}ms)`);

            } catch (error) {
                results.push({
                    name: request.name,
                    status: 'ERROR',
                    responseTime: 0,
                    success: false,
                    error: error.message
                });
                this.logError(`${request.name} failed`, error);
            }
        }

        // Analyze consistency
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        this.log(`Session consistency: ${successCount}/${totalCount} requests successful`);
        
        if (successCount === totalCount) {
            this.log('✓ Session appears consistent across services');
            this.diagnosticResults.session_consistency = 'CONSISTENT';
        } else {
            this.logError('✗ Session inconsistency detected');
            this.diagnosticResults.session_consistency = 'INCONSISTENT';
        }

        return results;
    }

    async checkRateLimiting() {
        this.log('=== CHECKING RATE LIMITING IMPACT ===');
        
        try {
            // Check rate limiting headers from a simple request
            const response = await axios.get(`${this.apiGatewayUrl}/health`, {
                timeout: 5000,
                validateStatus: () => true
            });

            const rateLimitHeaders = {};
            Object.keys(response.headers).forEach(header => {
                if (header.toLowerCase().includes('rate') || header.toLowerCase().includes('limit')) {
                    rateLimitHeaders[header] = response.headers[header];
                }
            });

            if (Object.keys(rateLimitHeaders).length > 0) {
                this.log('Rate limiting headers found:');
                Object.entries(rateLimitHeaders).forEach(([key, value]) => {
                    this.log(`  ${key}: ${value}`);
                });
                this.diagnosticResults.rate_limiting = 'ACTIVE';
            } else {
                this.log('No rate limiting headers detected');
                this.diagnosticResults.rate_limiting = 'INACTIVE';
            }

        } catch (error) {
            this.logError('Failed to check rate limiting', error);
            this.diagnosticResults.rate_limiting = 'ERROR';
        }
    }

    generateDiagnosticReport() {
        this.log('=== DIAGNOSTIC REPORT ===');
        
        console.log('\n📊 DIAGNOSTIC RESULTS SUMMARY:');
        console.log('================================');
        
        Object.entries(this.diagnosticResults).forEach(([key, value]) => {
            const status = value === 'SUCCESS' || value === 'OK' || value === 'CONSISTENT' ? '✓' : 
                          value === 'ERROR' || value === 'FAILED' || value === 'INCONSISTENT' ? '✗' : '⚠';
            console.log(`${status} ${key.replace(/_/g, ' ').toUpperCase()}: ${value}`);
        });

        if (this.issues.length > 0) {
            console.log('\n🚨 ISSUES IDENTIFIED:');
            console.log('=====================');
            this.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.message}`);
                if (issue.error) {
                    console.log(`   Error: ${issue.error}`);
                }
            });
        }

        console.log('\n🔍 SESSION CONSISTENCY ANALYSIS:');
        console.log('=================================');
        
        const authFlow = this.diagnosticResults.login_flow;
        const authValidation = this.diagnosticResults.auth_service_validation;
        const questionnaireAuth = this.diagnosticResults.questionnaire_service_auth;
        const sessionConsistency = this.diagnosticResults.session_consistency;

        if (authFlow === 'SUCCESS' && questionnaireAuth === 'UNAUTHORIZED') {
            console.log('⚠ IDENTIFIED ISSUE: Login succeeds but questionnaire access fails');
            console.log('  → This matches the reported intermittent authentication issue');
            console.log('  → Token validation appears inconsistent between services');
        }

        if (sessionConsistency === 'INCONSISTENT') {
            console.log('⚠ CONFIRMED: Session inconsistency detected across services');
            console.log('  → This explains why logout/login cycles resolve the issue');
        }

        console.log('\n💡 RECOMMENDATIONS:');
        console.log('===================');
        
        if (questionnaireAuth === 'UNAUTHORIZED') {
            console.log('1. Check questionnaire service auth middleware configuration');
            console.log('2. Verify token validation consistency between auth and questionnaire services');
            console.log('3. Review API Gateway token forwarding to questionnaire service');
        }

        if (this.diagnosticResults.session_consistency === 'INCONSISTENT') {
            console.log('4. Implement token refresh mechanism for service-to-service calls');
            console.log('5. Add session synchronization between frontend and backend');
            console.log('6. Review circuit breaker impact on authentication flow');
        }

        const logIssues = Object.entries(this.diagnosticResults)
            .filter(([key, value]) => key.includes('_logs') && value === 'FOUND')
            .length;

        if (logIssues > 0) {
            console.log('7. Investigate authentication bypass patterns in service logs');
            console.log('8. Ensure proper token validation in all authentication middlewares');
        }
    }

    async runDiagnostic() {
        console.log('🔍 SESSION CONSISTENCY DIAGNOSTIC TOOL');
        console.log('=====================================');
        console.log('Diagnosing inconsistent authentication sessions...\n');

        try {
            await this.checkServiceHealth();
            await this.checkRateLimiting();
            
            const loginSuccess = await this.testLoginFlow();
            
            if (loginSuccess) {
                await this.testTokenValidation();
                await this.testInProgressQuestionnaires();
                await this.testSessionConsistency();
            }
            
            await this.checkDockerLogs();
            
        } catch (error) {
            this.logError('Diagnostic failed with unexpected error', error);
        } finally {
            this.generateDiagnosticReport();
        }
    }
}

// Run diagnostic
const diagnostic = new SessionConsistencyDiagnostic();
diagnostic.runDiagnostic().catch(console.error);
