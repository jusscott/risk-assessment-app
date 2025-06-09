#!/usr/bin/env node

/**
 * Session Consistency Fix Script
 * 
 * Addresses the root causes identified in the diagnostic:
 * 1. API Gateway routing failures (404s on all protected endpoints)
 * 2. Enhanced client connectivity issues
 * 3. Service-to-service communication problems
 * 4. Authentication bypass fallbacks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SessionConsistencyFixer {
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

    // Fix 1: Add missing health endpoint to questionnaire service
    fixQuestionnaireHealthEndpoint() {
        this.log('=== FIXING QUESTIONNAIRE SERVICE HEALTH ENDPOINT ===');
        
        const healthRouteContent = `/**
 * Health check routes for questionnaire service
 */
const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        data: {
            service: 'questionnaire-service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }
    });
});

module.exports = router;
`;

        try {
            const healthRoutePath = 'backend/questionnaire-service/src/routes/health.routes.js';
            fs.writeFileSync(healthRoutePath, healthRouteContent);
            this.logFix('Added health endpoint to questionnaire service', healthRoutePath);
            
            // Update questionnaire service index to include health routes
            const indexPath = 'backend/questionnaire-service/src/index.js';
            let indexContent = fs.readFileSync(indexPath, 'utf8');
            
            if (!indexContent.includes("app.use('/health'")) {
                // Add health routes before other routes
                const healthRouteImport = "const healthRoutes = require('./routes/health.routes');\n";
                const healthRouteUse = "app.use('/health', healthRoutes);\n";
                
                // Add import at the top with other imports
                if (!indexContent.includes(healthRouteImport.trim())) {
                    indexContent = indexContent.replace(
                        /const express = require\('express'\);/,
                        `const express = require('express');\n${healthRouteImport.trim()}`
                    );
                }
                
                // Add route usage
                if (!indexContent.includes(healthRouteUse.trim())) {
                    indexContent = indexContent.replace(
                        /app\.use\('\/api\/questionnaire'/,
                        `${healthRouteUse}\napp.use('/api/questionnaire'`
                    );
                }
                
                fs.writeFileSync(indexPath, indexContent);
                this.logFix('Updated questionnaire service index to include health routes');
            }
            
        } catch (error) {
            this.logError('Failed to fix questionnaire health endpoint', error);
        }
    }

    // Fix 2: Fix enhanced client connectivity issues
    fixEnhancedClientConnectivity() {
        this.log('=== FIXING ENHANCED CLIENT CONNECTIVITY ===');
        
        try {
            const enhancedClientPath = 'backend/questionnaire-service/src/utils/enhanced-client.js';
            
            if (fs.existsSync(enhancedClientPath)) {
                let content = fs.readFileSync(enhancedClientPath, 'utf8');
                
                // Fix the enhancedClient.request is not a function error
                const fixedContent = `const axios = require('axios');
const CircuitBreaker = require('opossum');

class EnhancedClient {
    constructor() {
        this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:4000';
        this.analysisServiceUrl = process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:7000';
        
        // Circuit breaker options
        const circuitBreakerOptions = {
            timeout: 10000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
            monitoringPeriod: 10000
        };
        
        // Create circuit breakers for each service
        this.authServiceBreaker = new CircuitBreaker(this._makeAuthRequest.bind(this), circuitBreakerOptions);
        this.analysisServiceBreaker = new CircuitBreaker(this._makeAnalysisRequest.bind(this), circuitBreakerOptions);
        
        // Error handlers
        this.authServiceBreaker.on('open', () => console.log('[CIRCUIT-BREAKER] Auth service circuit opened'));
        this.authServiceBreaker.on('halfOpen', () => console.log('[CIRCUIT-BREAKER] Auth service circuit half-open'));
        this.authServiceBreaker.on('close', () => console.log('[CIRCUIT-BREAKER] Auth service circuit closed'));
        
        this.analysisServiceBreaker.on('open', () => console.log('[CIRCUIT-BREAKER] Analysis service circuit opened'));
        this.analysisServiceBreaker.on('halfOpen', () => console.log('[CIRCUIT-BREAKER] Analysis service circuit half-open'));
        this.analysisServiceBreaker.on('close', () => console.log('[CIRCUIT-BREAKER] Analysis service circuit closed'));
    }
    
    async _makeAuthRequest(config) {
        const url = \`\${this.authServiceUrl}\${config.url}\`;
        return await axios({
            ...config,
            url,
            timeout: 8000
        });
    }
    
    async _makeAnalysisRequest(config) {
        const url = \`\${this.analysisServiceUrl}\${config.url}\`;
        return await axios({
            ...config,
            url,
            timeout: 8000
        });
    }
    
    // Main request method that was missing
    async request(config) {
        const { service, ...requestConfig } = config;
        
        try {
            switch (service) {
                case 'auth':
                    console.log(\`[ENHANCED-CLIENT] Making auth service request to: \${requestConfig.url}\`);
                    return await this.authServiceBreaker.fire(requestConfig);
                    
                case 'analysis':
                    console.log(\`[ENHANCED-CLIENT] Making analysis service request to: \${requestConfig.url}\`);
                    return await this.analysisServiceBreaker.fire(requestConfig);
                    
                default:
                    throw new Error(\`Unknown service: \${service}\`);
            }
        } catch (error) {
            console.error(\`[ENHANCED-CLIENT] Request failed for service \${service}:\`, error.message);
            throw error;
        }
    }
    
    // Convenience methods
    async validateToken(token) {
        return await this.request({
            service: 'auth',
            method: 'POST',
            url: '/api/auth/validate-token',
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Content-Type': 'application/json'
            }
        });
    }
    
    async analyzeSubmission(submissionData, token) {
        return await this.request({
            service: 'analysis',
            method: 'POST',
            url: '/api/analysis/analyze',
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Content-Type': 'application/json'
            },
            data: submissionData
        });
    }
}

// Create singleton instance
const enhancedClient = new EnhancedClient();

module.exports = enhancedClient;
`;

                fs.writeFileSync(enhancedClientPath, fixedContent);
                this.logFix('Fixed enhanced client connectivity and missing request method');
            }
            
        } catch (error) {
            this.logError('Failed to fix enhanced client connectivity', error);
        }
    }

    // Fix 3: Add missing auth endpoints to auth service
    fixAuthServiceEndpoints() {
        this.log('=== FIXING AUTH SERVICE ENDPOINTS ===');
        
        try {
            // Add missing validate-token endpoint
            const validateTokenControllerContent = `import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const validateToken = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'No valid token provided'
                }
            });
        }
        
        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            
            // Get user from database to ensure they still exist
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                include: {
                    organization: true
                }
            });
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'User not found'
                    }
                });
            }
            
            res.status(200).json({
                success: true,
                data: {
                    valid: true,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        organization: user.organization
                    }
                }
            });
            
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid token'
                }
            });
        }
        
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to validate token'
            }
        });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated'
                }
            });
        }
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                organization: true
            }
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'User not found'
                }
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    organization: user.organization
                }
            }
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get user profile'
            }
        });
    }
};
`;

            const validateControllerPath = 'backend/auth-service/src/controllers/validate-token.controller.ts';
            fs.writeFileSync(validateControllerPath, validateTokenControllerContent);
            this.logFix('Added validate-token controller to auth service');
            
            // Update auth routes
            const authRoutesPath = 'backend/auth-service/src/routes/auth.routes.ts';
            let authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');
            
            if (!authRoutesContent.includes('/validate-token')) {
                // Add validate token imports and routes
                if (!authRoutesContent.includes('validateToken, getProfile')) {
                    authRoutesContent = authRoutesContent.replace(
                        /import { login, register } from/,
                        'import { login, register, validateToken, getProfile } from'
                    );
                    
                    authRoutesContent = authRoutesContent.replace(
                        /from '\.\.\/controllers\/auth\.controller';/,
                        "from '../controllers/auth.controller';\nimport { validateToken, getProfile } from '../controllers/validate-token.controller';"
                    );
                }
                
                if (!authRoutesContent.includes('router.post(\'/validate-token\'')) {
                    authRoutesContent += `
// Token validation endpoint
router.post('/validate-token', validateToken);

// User profile endpoint  
router.get('/profile', validateToken, getProfile);
`;
                }
                
                fs.writeFileSync(authRoutesPath, authRoutesContent);
                this.logFix('Updated auth routes to include validate-token and profile endpoints');
            }
            
        } catch (error) {
            this.logError('Failed to fix auth service endpoints', error);
        }
    }

    // Fix 4: Fix API Gateway routing configuration
    fixApiGatewayRouting() {
        this.log('=== FIXING API GATEWAY ROUTING ===');
        
        try {
            const pathRewriteConfigPath = 'backend/api-gateway/src/config/path-rewrite.config.js';
            
            const pathRewriteConfig = `/**
 * Path rewriting configuration for API Gateway
 * Maps incoming requests to appropriate backend services
 */

const pathRewriteConfig = {
    // Auth service routes
    '^/api/auth/(.*)': '/api/auth/$1',
    
    // Questionnaire service routes  
    '^/api/questionnaire/(.*)': '/api/questionnaire/$1',
    
    // Analysis service routes
    '^/api/analysis/(.*)': '/api/analysis/$1',
    
    // Report service routes
    '^/api/reports/(.*)': '/api/reports/$1',
    
    // Payment service routes
    '^/api/payments/(.*)': '/api/payments/$1',
    '^/api/plans/(.*)': '/api/plans/$1',
    
    // Health endpoints - direct pass-through
    '^/api/auth/health': '/health',
    '^/api/questionnaire/health': '/health',
    '^/api/analysis/health': '/health',
    '^/api/reports/health': '/health',
    '^/api/payments/health': '/health'
};

module.exports = pathRewriteConfig;
`;

            fs.writeFileSync(pathRewriteConfigPath, pathRewriteConfig);
            this.logFix('Updated API Gateway path rewrite configuration');
            
            // Update proxy middleware to use correct routing
            const proxyMiddlewarePath = 'backend/api-gateway/src/middlewares/proxy.middleware.js';
            let proxyContent = fs.readFileSync(proxyMiddlewarePath, 'utf8');
            
            // Ensure proper service URLs and routing
            const fixedProxyContent = proxyContent
                .replace(/const pathRewriteConfig = require\('\.\.\/config\/path-rewrite\.config'\);?/g, '')
                .replace(/const pathRewriteConfig = {[^}]*};/gs, '')
                .replace(
                    /const { createProxyMiddleware } = require\('http-proxy-middleware'\);/,
                    `const { createProxyMiddleware } = require('http-proxy-middleware');
const pathRewriteConfig = require('../config/path-rewrite.config');`
                );
            
            fs.writeFileSync(proxyMiddlewarePath, fixedProxyContent);
            this.logFix('Updated proxy middleware to use path rewrite config');
            
        } catch (error) {
            this.logError('Failed to fix API Gateway routing', error);
        }
    }

    // Fix 5: Remove authentication bypass in questionnaire service
    fixAuthenticationBypass() {
        this.log('=== FIXING AUTHENTICATION BYPASS ===');
        
        try {
            const authMiddlewarePath = 'backend/questionnaire-service/src/middlewares/auth.middleware.js';
            
            if (fs.existsSync(authMiddlewarePath)) {
                let content = fs.readFileSync(authMiddlewarePath, 'utf8');
                
                // Remove development authentication bypass
                if (content.includes('BYPASSING AUTHENTICATION')) {
                    content = content.replace(
                        /\/\/ Development bypass[\s\S]*?return next\(\);/g,
                        '// Authentication bypass removed for security'
                    );
                    
                    content = content.replace(
                        /console\.log\('⚠️ BYPASSING AUTHENTICATION.*?\);/g,
                        ''
                    );
                    
                    fs.writeFileSync(authMiddlewarePath, content);
                    this.logFix('Removed authentication bypass from questionnaire service');
                }
            }
            
        } catch (error) {
            this.logError('Failed to fix authentication bypass', error);
        }
    }

    // Fix 6: Restart services to apply fixes
    async restartServices() {
        this.log('=== RESTARTING SERVICES ===');
        
        const services = [
            'api-gateway',
            'auth-service', 
            'questionnaire-service'
        ];
        
        for (const service of services) {
            try {
                this.log(`Restarting ${service}...`);
                execSync(`docker restart ${service}`, { stdio: 'inherit', timeout: 30000 });
                this.logFix(`Restarted ${service} successfully`);
                
                // Wait a moment between restarts
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                this.logError(`Failed to restart ${service}`, error);
            }
        }
    }

    generateFixReport() {
        this.log('=== SESSION CONSISTENCY FIX REPORT ===');
        
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
        console.log('1. Verify services are running: docker ps');
        console.log('2. Test login flow: curl -X POST http://localhost:5000/api/auth/login');
        console.log('3. Test questionnaire access after login');
        console.log('4. Run session consistency diagnostic again to verify fixes');
        console.log('5. If issues persist, check Docker logs: docker logs <service-name>');
    }

    async runFixes() {
        console.log('🔧 SESSION CONSISTENCY FIX TOOL');
        console.log('================================');
        console.log('Applying fixes for routing and connectivity issues...\n');

        try {
            this.fixQuestionnaireHealthEndpoint();
            this.fixEnhancedClientConnectivity();
            this.fixAuthServiceEndpoints();
            this.fixApiGatewayRouting();
            this.fixAuthenticationBypass();
            await this.restartServices();
            
        } catch (error) {
            this.logError('Fix process failed with unexpected error', error);
        } finally {
            this.generateFixReport();
        }
    }
}

// Helper function to wait
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run fixes
const fixer = new SessionConsistencyFixer();
fixer.runFixes().catch(console.error);
