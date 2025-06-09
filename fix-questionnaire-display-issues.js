#!/usr/bin/env node

/**
 * Questionnaire Display Issue Fix Script
 * Fixes critical issues preventing questionnaires from displaying for authenticated users
 * Focus: Docker service names, connectivity, and authentication flow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class QuestionnaireDisplayFixer {
    constructor() {
        this.fixes = [];
        this.errors = [];
        
        console.log('🔧 Starting Questionnaire Display Critical Fixes...');
        console.log('Target: Restore questionnaire display for authenticated users');
        console.log('User: jusscott@gmail.com\n');
    }

    async runAllFixes() {
        try {
            await this.fixDockerServiceNames();
            await this.fixAPIGatewayServiceUrls();
            await this.fixQuestionnaireServiceAuth();
            await this.updateEnvironmentFiles();
            await this.restartServices();
            await this.verifyFixes();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Fix process failed:', error.message);
            this.errors.push({
                type: 'FIX_ERROR',
                description: `Fix process error: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }

    async fixDockerServiceNames() {
        console.log('🐳 Fixing Docker Service Names...');
        
        const envFiles = [
            {
                path: 'backend/questionnaire-service/.env',
                fixes: [
                    { from: 'AUTH_SERVICE_URL=http://localhost:3001', to: 'AUTH_SERVICE_URL=http://auth-service:3001' },
                    { from: 'DATABASE_URL=postgresql://postgres:password@localhost:5432/questionnaire_db', to: 'DATABASE_URL=postgresql://postgres:password@questionnaire-db:5432/questionnaire_db' }
                ]
            },
            {
                path: 'backend/questionnaire-service/.env.development',
                fixes: [
                    { from: 'AUTH_SERVICE_URL=http://localhost:3001', to: 'AUTH_SERVICE_URL=http://auth-service:3001' },
                    { from: 'DATABASE_URL=postgresql://postgres:password@localhost:5432/questionnaire_db', to: 'DATABASE_URL=postgresql://postgres:password@questionnaire-db:5432/questionnaire_db' }
                ]
            },
            {
                path: 'backend/api-gateway/.env',
                fixes: [
                    { from: 'AUTH_SERVICE_URL=http://localhost:3001', to: 'AUTH_SERVICE_URL=http://auth-service:3001' },
                    { from: 'QUESTIONNAIRE_SERVICE_URL=http://localhost:3002', to: 'QUESTIONNAIRE_SERVICE_URL=http://questionnaire-service:3002' },
                    { from: 'ANALYSIS_SERVICE_URL=http://localhost:3003', to: 'ANALYSIS_SERVICE_URL=http://analysis-service:3003' },
                    { from: 'REPORT_SERVICE_URL=http://localhost:3004', to: 'REPORT_SERVICE_URL=http://report-service:3004' },
                    { from: 'PAYMENT_SERVICE_URL=http://localhost:3005', to: 'PAYMENT_SERVICE_URL=http://payment-service:3005' }
                ]
            }
        ];

        for (const envFile of envFiles) {
            const filePath = path.join(__dirname, envFile.path);
            
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                let changed = false;
                
                for (const fix of envFile.fixes) {
                    if (content.includes(fix.from)) {
                        content = content.replace(new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.to);
                        changed = true;
                        console.log(`  ✅ Fixed ${envFile.path}: ${fix.from} -> ${fix.to}`);
                    }
                }
                
                if (changed) {
                    fs.writeFileSync(filePath, content);
                    this.fixes.push({
                        type: 'DOCKER_SERVICE_NAMES',
                        file: envFile.path,
                        description: 'Updated Docker service names from localhost to service names'
                    });
                }
            } else {
                console.log(`  ⚠️  File not found: ${envFile.path}`);
            }
        }
        console.log();
    }

    async fixAPIGatewayServiceUrls() {
        console.log('🌐 Fixing API Gateway Service URLs...');
        
        const serviceUrlConfigPath = 'backend/api-gateway/src/config/service-url.config.js';
        const fullPath = path.join(__dirname, serviceUrlConfigPath);
        
        if (fs.existsSync(fullPath)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Replace localhost URLs with Docker service names
            const replacements = [
                { from: 'http://localhost:3001', to: 'http://auth-service:3001' },
                { from: 'http://localhost:3002', to: 'http://questionnaire-service:3002' },
                { from: 'http://localhost:3003', to: 'http://analysis-service:3003' },
                { from: 'http://localhost:3004', to: 'http://report-service:3004' },
                { from: 'http://localhost:3005', to: 'http://payment-service:3005' }
            ];
            
            let changed = false;
            for (const replacement of replacements) {
                if (content.includes(replacement.from)) {
                    content = content.replace(new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.to);
                    changed = true;
                    console.log(`  ✅ Updated service URL: ${replacement.from} -> ${replacement.to}`);
                }
            }
            
            if (changed) {
                fs.writeFileSync(fullPath, content);
                this.fixes.push({
                    type: 'API_GATEWAY_SERVICE_URLS',
                    file: serviceUrlConfigPath,
                    description: 'Updated API Gateway service URLs to use Docker service names'
                });
            }
        } else {
            console.log('  ⚠️  API Gateway service URL config not found');
        }
        console.log();
    }

    async fixQuestionnaireServiceAuth() {
        console.log('🔐 Fixing Questionnaire Service Authentication...');
        
        // Fix auth middleware to use proper service names
        const authMiddlewarePath = 'backend/questionnaire-service/src/middlewares/auth.middleware.js';
        const fullPath = path.join(__dirname, authMiddlewarePath);
        
        if (fs.existsSync(fullPath)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Ensure AUTH_SERVICE_URL is properly configured
            const authServicePattern = /const\s+AUTH_SERVICE_URL\s*=\s*process\.env\.AUTH_SERVICE_URL\s*\|\|\s*['"]http:\/\/localhost:3001['"]/g;
            const newAuthServiceUrl = `const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'`;
            
            if (authServicePattern.test(content)) {
                content = content.replace(authServicePattern, newAuthServiceUrl);
                console.log('  ✅ Updated AUTH_SERVICE_URL fallback to use Docker service name');
            } else if (!content.includes('AUTH_SERVICE_URL')) {
                // Add AUTH_SERVICE_URL configuration if missing
                const configInsert = `\nconst AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';\n`;
                content = configInsert + content;
                console.log('  ✅ Added AUTH_SERVICE_URL configuration');
            }
            
            // Ensure proper error handling for auth service connectivity
            if (!content.includes('ECONNREFUSED') && content.includes('axios')) {
                const errorHandlingPattern = /catch\s*\(\s*error\s*\)\s*{/g;
                const enhancedErrorHandling = `catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Cannot connect to auth service at:', AUTH_SERVICE_URL);
            return res.status(503).json({ 
                error: 'Authentication service unavailable',
                message: 'Please try again later'
            });
        }`;
                
                content = content.replace(errorHandlingPattern, enhancedErrorHandling);
                console.log('  ✅ Enhanced error handling for auth service connectivity');
            }
            
            fs.writeFileSync(fullPath, content);
            this.fixes.push({
                type: 'QUESTIONNAIRE_AUTH',
                file: authMiddlewarePath,
                description: 'Fixed questionnaire service authentication configuration'
            });
        } else {
            console.log('  ⚠️  Auth middleware file not found');
        }
        console.log();
    }

    async updateEnvironmentFiles() {
        console.log('🔧 Updating Environment Files...');
        
        // Ensure questionnaire service has proper environment variables
        const questionnaireEnvPath = 'backend/questionnaire-service/.env';
        const fullPath = path.join(__dirname, questionnaireEnvPath);
        
        const requiredEnvVars = [
            'AUTH_SERVICE_URL=http://auth-service:3001',
            'API_GATEWAY_URL=http://api-gateway:3000',
            'DATABASE_URL=postgresql://postgres:password@questionnaire-db:5432/questionnaire_db',
            'JWT_SECRET=your-jwt-secret-key',
            'PORT=3002'
        ];
        
        let content = '';
        if (fs.existsSync(fullPath)) {
            content = fs.readFileSync(fullPath, 'utf8');
        }
        
        let changed = false;
        for (const envVar of requiredEnvVars) {
            const [key] = envVar.split('=');
            if (!content.includes(key + '=')) {
                content += '\n' + envVar;
                changed = true;
                console.log(`  ✅ Added missing environment variable: ${key}`);
            }
        }
        
        if (changed) {
            fs.writeFileSync(fullPath, content);
            this.fixes.push({
                type: 'ENVIRONMENT_VARIABLES',
                file: questionnaireEnvPath,
                description: 'Added missing environment variables'
            });
        }
        console.log();
    }

    async restartServices() {
        console.log('🔄 Restarting Services...');
        
        const servicesToRestart = [
            'questionnaire-service',
            'api-gateway',
            'auth-service'
        ];
        
        for (const service of servicesToRestart) {
            try {
                console.log(`  Restarting ${service}...`);
                execSync(`docker-compose restart ${service}`, { stdio: 'inherit', cwd: __dirname });
                console.log(`  ✅ ${service} restarted successfully`);
                
                // Wait a moment between restarts
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.log(`  ❌ Failed to restart ${service}: ${error.message}`);
                this.errors.push({
                    type: 'SERVICE_RESTART',
                    service: service,
                    error: error.message
                });
            }
        }
        console.log();
    }

    async verifyFixes() {
        console.log('🔍 Verifying Fixes...');
        
        // Wait for services to start up
        console.log('  Waiting for services to start up...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const axios = require('axios');
        const verificationTests = [
            {
                name: 'API Gateway Health',
                url: 'http://localhost:3000/health',
                expected: 200
            },
            {
                name: 'Auth Service Health',
                url: 'http://localhost:3001/health',
                expected: 200
            },
            {
                name: 'Questionnaire Service Health',
                url: 'http://localhost:3002/health',
                expected: 200
            },
            {
                name: 'Questionnaire Templates via API Gateway',
                url: 'http://localhost:3000/api/questionnaire/templates',
                expected: [200, 401] // 401 is expected for auth-required endpoints
            }
        ];
        
        for (const test of verificationTests) {
            try {
                const response = await axios.get(test.url, { timeout: 5000 });
                const expectedCodes = Array.isArray(test.expected) ? test.expected : [test.expected];
                
                if (expectedCodes.includes(response.status)) {
                    console.log(`  ✅ ${test.name}: ${response.status} (${response.data?.status || 'OK'})`);
                } else {
                    console.log(`  ❌ ${test.name}: ${response.status} (expected ${test.expected})`);
                }
            } catch (error) {
                if (error.response?.status === 401 && Array.isArray(test.expected) && test.expected.includes(401)) {
                    console.log(`  ✅ ${test.name}: 401 (expected for auth-required endpoint)`);
                } else {
                    console.log(`  ❌ ${test.name}: ${error.code || error.message}`);
                }
            }
        }
        console.log();
    }

    generateReport() {
        console.log('📊 FIX REPORT');
        console.log('='.repeat(50));
        
        console.log(`\n✅ Successfully Applied Fixes (${this.fixes.length}):`);
        this.fixes.forEach((fix, index) => {
            console.log(`${index + 1}. ${fix.type}: ${fix.description}`);
            if (fix.file) console.log(`   File: ${fix.file}`);
        });
        
        if (this.errors.length > 0) {
            console.log(`\n❌ Errors Encountered (${this.errors.length}):`);
            this.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.type}: ${error.description || error.error}`);
                if (error.service) console.log(`   Service: ${error.service}`);
            });
        }
        
        console.log('\n🎯 NEXT STEPS:');
        console.log('-'.repeat(30));
        console.log('1. Check if questionnaires are now displaying in the UI');
        console.log('2. Test with real user: jusscott@gmail.com');
        console.log('3. If issues persist, run: node diagnose-questionnaire-display-critical.js');
        console.log('4. Check Docker logs: docker-compose logs questionnaire-service');
        console.log('5. Verify API Gateway proxy: docker-compose logs api-gateway');
        
        console.log('\n📝 VERIFICATION COMMANDS:');
        console.log('- Test questionnaire templates: curl http://localhost:3000/api/questionnaire/templates');
        console.log('- Check service connectivity: docker exec questionnaire-service curl http://auth-service:3001/health');
        console.log('- Monitor logs: docker-compose logs -f questionnaire-service api-gateway');
        
        // Save report
        const report = {
            timestamp: new Date().toISOString(),
            fixes: this.fixes,
            errors: this.errors,
            summary: `Applied ${this.fixes.length} fixes with ${this.errors.length} errors`
        };
        
        fs.writeFileSync('questionnaire-display-fix-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Full fix report saved to: questionnaire-display-fix-report.json');
    }
}

// Run fixes
const fixer = new QuestionnaireDisplayFixer();
fixer.runAllFixes().catch(console.error);
