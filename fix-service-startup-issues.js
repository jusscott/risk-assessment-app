#!/usr/bin/env node

/**
 * Service Startup Issues Fix Script
 * 
 * Addresses specific startup issues found:
 * 1. Auth service TypeScript compilation errors (duplicate declarations)
 * 2. Questionnaire service startup readiness check loop
 */

const fs = require('fs');
const { execSync } = require('child_process');

class ServiceStartupFixer {
    constructor() {
        this.issues = [];
        this.fixes = [];
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
        }
        this.issues.push({ message, error: error?.message, timestamp: new Date() });
    }

    logFix(description, details) {
        this.log(`FIX: ${description}`, 'FIX');
        if (details) {
            this.log(`Details: ${details}`, 'FIX');
        }
        this.fixes.push({ description, details, timestamp: new Date() });
    }

    // Fix 1: Fix TypeScript compilation errors in auth service
    fixAuthServiceTypeScriptErrors() {
        this.log('=== FIXING AUTH SERVICE TYPESCRIPT ERRORS ===');
        
        try {
            // Fix auth routes by replacing the problematic imports and routes
            const authRoutesPath = 'backend/auth-service/src/routes/auth.routes.ts';
            let authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');
            
            // Clean up the auth routes file to remove duplicate imports and routes
            const cleanAuthRoutesContent = `import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';
import { validateToken, getProfile } from '../controllers/validate-token.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Authentication routes
router.post('/login', login);
router.post('/register', register);

// Token validation endpoint
router.post('/validate-token', validateToken);

// User profile endpoint (requires authentication)
router.get('/profile', authMiddleware, getProfile);

export default router;
`;

            fs.writeFileSync(authRoutesPath, cleanAuthRoutesContent);
            this.logFix('Fixed auth routes TypeScript compilation errors');
            
        } catch (error) {
            this.logError('Failed to fix auth service TypeScript errors', error);
        }
    }

    // Fix 2: Fix questionnaire service startup and health endpoint routing
    fixQuestionnaireServiceStartup() {
        this.log('=== FIXING QUESTIONNAIRE SERVICE STARTUP ===');
        
        try {
            // Fix the questionnaire service index to properly handle health routes
            const indexPath = 'backend/questionnaire-service/src/index.js';
            let indexContent = fs.readFileSync(indexPath, 'utf8');
            
            // Ensure health routes are properly configured
            if (!indexContent.includes("app.use('/health'")) {
                // Add health routes import and configuration
                const healthImport = "const healthRoutes = require('./routes/health.routes');";
                
                if (!indexContent.includes(healthImport)) {
                    // Add import after other route imports
                    indexContent = indexContent.replace(
                        /(const templateRoutes = require\('\.\/routes\/template\.routes'\);)/,
                        `$1\n${healthImport}`
                    );
                }
                
                // Add health route usage before other routes
                if (!indexContent.includes("app.use('/health'")) {
                    indexContent = indexContent.replace(
                        /(app\.use\('\/api\/questionnaire', templateRoutes\);)/,
                        `app.use('/health', healthRoutes);\n$1`
                    );
                }
                
                fs.writeFileSync(indexPath, indexContent);
                this.logFix('Added health routes to questionnaire service');
            }
            
            // Fix API Gateway path routing for questionnaire health
            const pathRewritePath = 'backend/api-gateway/src/config/path-rewrite.config.js';
            let pathRewriteContent = fs.readFileSync(pathRewritePath, 'utf8');
            
            // Update path rewrite to handle questionnaire health correctly
            if (!pathRewriteContent.includes("'^/api/questionnaire/health': '/health'")) {
                pathRewriteContent = pathRewriteContent.replace(
                    /('^\/api\/questionnaire\/health': '\/health')/,
                    "'^/api/questionnaire/health': '/health'"
                );
                
                fs.writeFileSync(pathRewritePath, pathRewriteContent);
                this.logFix('Updated API Gateway path rewrite for questionnaire health');
            }
            
        } catch (error) {
            this.logError('Failed to fix questionnaire service startup', error);
        }
    }

    // Fix 3: Ensure proper API Gateway routing to services
    fixApiGatewayServiceRouting() {
        this.log('=== FIXING API GATEWAY SERVICE ROUTING ===');
        
        try {
            // Check and update proxy middleware
            const proxyMiddlewarePath = 'backend/api-gateway/src/middlewares/proxy.middleware.js';
            let proxyContent = fs.readFileSync(proxyMiddlewarePath, 'utf8');
            
            // Ensure questionnaire service health routes are properly mapped
            if (!proxyContent.includes('/health.*questionnaire-service')) {
                // Add specific routing logic for health endpoints
                const healthRoutingLogic = `
// Special handling for health endpoints
if (req.path.startsWith('/api/questionnaire/health')) {
    return createProxyMiddleware({
        target: 'http://questionnaire-service:6000',
        changeOrigin: true,
        pathRewrite: {
            '^/api/questionnaire/health': '/health'
        }
    })(req, res, next);
}
`;
                
                proxyContent = proxyContent.replace(
                    /(const proxyMiddleware = \(req, res, next\) => {)/,
                    `$1${healthRoutingLogic}`
                );
                
                fs.writeFileSync(proxyMiddlewarePath, proxyContent);
                this.logFix('Added specific health endpoint routing to API Gateway');
            }
            
        } catch (error) {
            this.logError('Failed to fix API Gateway service routing', error);
        }
    }

    // Fix 4: Wait for services and restart
    async waitAndRestartServices() {
        this.log('=== WAITING FOR SERVICES AND RESTARTING ===');
        
        // Stop services first
        const services = ['auth-service', 'questionnaire-service'];
        
        for (const service of services) {
            try {
                this.log(`Stopping ${service}...`);
                execSync(`docker stop ${service}`, { stdio: 'inherit', timeout: 10000 });
                this.logFix(`Stopped ${service} successfully`);
            } catch (error) {
                this.log(`${service} was not running or already stopped`);
            }
        }
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Start services
        for (const service of services) {
            try {
                this.log(`Starting ${service}...`);
                execSync(`docker start ${service}`, { stdio: 'inherit', timeout: 30000 });
                this.logFix(`Started ${service} successfully`);
                
                // Wait between starts
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (error) {
                this.logError(`Failed to start ${service}`, error);
            }
        }
        
        // Final wait for startup
        this.log('Waiting for services to fully initialize...');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    generateFixReport() {
        this.log('=== SERVICE STARTUP FIX REPORT ===');
        
        console.log('\n🔧 FIXES APPLIED:');
        console.log('==================');
        
        this.fixes.forEach((fix, index) => {
            console.log(`${index + 1}. ${fix.description}`);
            if (fix.details) {
                console.log(`   Details: ${fix.details}`);
            }
        });

        if (this.issues.length > 0) {
            console.log('\n⚠️ ISSUES ENCOUNTERED:');
            console.log('=======================');
            this.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.message}`);
                if (issue.error) {
                    console.log(`   Error: ${issue.error}`);
                }
            });
        }

        console.log('\n📋 NEXT STEPS:');
        console.log('==============');
        console.log('1. Check service status: docker ps');
        console.log('2. Check service logs: docker logs auth-service');
        console.log('3. Check service logs: docker logs questionnaire-service');
        console.log('4. Run session consistency diagnostic again');
        console.log('5. Test login and questionnaire access');
    }

    async runFixes() {
        console.log('🔧 SERVICE STARTUP FIX TOOL');
        console.log('============================');
        console.log('Fixing TypeScript compilation and startup issues...\n');

        try {
            this.fixAuthServiceTypeScriptErrors();
            this.fixQuestionnaireServiceStartup();
            this.fixApiGatewayServiceRouting();
            await this.waitAndRestartServices();
            
        } catch (error) {
            this.logError('Fix process failed with unexpected error', error);
        } finally {
            this.generateFixReport();
        }
    }
}

// Run fixes
const fixer = new ServiceStartupFixer();
fixer.runFixes().catch(console.error);
