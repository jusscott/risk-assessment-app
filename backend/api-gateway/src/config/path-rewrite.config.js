/**
 * Path rewriting configuration for API Gateway
 * Maps incoming requests to appropriate backend services
 * FIXED: Added support for both singular and plural endpoint forms
 */

const pathRewriteConfig = {
    // Auth service routes - support both forms
    '^/api/auth/(.*)': '/$1',
    
    // Questionnaire service routes - support both singular and plural
    '^/api/questionnaire/(.*)': '/$1',
    '^/api/questionnaires/(.*)': '/$1',
    
    // Submission service routes (part of questionnaire service)
    '^/api/submission/(.*)': '/submissions/$1',
    '^/api/submissions/(.*)': '/submissions/$1',
    
    // Analysis service routes
    '^/api/analysis/(.*)': '/api/$1',
    
    // Report service routes - support both singular and plural
    '^/api/report/(.*)': '/api/reports/$1',
    '^/api/reports/(.*)': '/api/reports/$1',
    
    // Payment service routes
    '^/api/payment/(.*)': '/api/payments/$1',
    '^/api/payments/(.*)': '/api/payments/$1',
    '^/api/plans/(.*)': '/api/plans/$1',
    
    // Health endpoints - direct pass-through with proper mapping
    '^/api/auth/health': '/health',
    '^/api/questionnaire/health': '/health',
    '^/api/questionnaires/health': '/health',
    '^/api/submission/health': '/health',
    '^/api/submissions/health': '/health',
    '^/api/analysis/health': '/api/health',
    '^/api/report/health': '/health',
    '^/api/reports/health': '/health',
    '^/api/payment/health': '/health',
    '^/api/payments/health': '/health'
};

// Function to generate standardized path rewrite rules
const generatePathRewrite = (serviceId) => {
    const rules = {};
    
    switch(serviceId.toLowerCase()) {
        case 'auth':
            rules['^/api/auth/(.*)'] = '/$1';
            rules['^/api/auth/health'] = '/health';
            break;
            
        case 'questionnaire':
            rules['^/api/questionnaire/(.*)'] = '/$1';
            rules['^/api/questionnaires/(.*)'] = '/$1';
            rules['^/api/questionnaire/health'] = '/health';
            rules['^/api/questionnaires/health'] = '/health';
            break;
            
        case 'payment':
            rules['^/api/payment/(.*)'] = '/api/payments/$1';
            rules['^/api/payments/(.*)'] = '/api/payments/$1';
            rules['^/api/plans/(.*)'] = '/api/plans/$1';
            rules['^/api/payment/health'] = '/health';
            rules['^/api/payments/health'] = '/health';
            break;
            
        case 'analysis':
            rules['^/api/analysis/(.*)'] = '/api/$1';
            rules['^/api/analysis/health'] = '/api/health';
            break;
            
        case 'report':
            rules['^/api/report/(.*)'] = '/api/reports/$1';
            rules['^/api/reports/(.*)'] = '/api/reports/$1';
            rules['^/api/report/health'] = '/health';
            rules['^/api/reports/health'] = '/health';
            break;
            
        default:
            throw new Error(`Unknown service ID: ${serviceId}`);
    }
    
    return rules;
};

pathRewriteConfig.generatePathRewrite = generatePathRewrite;

module.exports = pathRewriteConfig;
