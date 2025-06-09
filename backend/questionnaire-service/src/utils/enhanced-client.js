const axios = require('axios');
const CircuitBreaker = require('opossum');

class EnhancedClient {
    constructor() {
        this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:5001';
        this.analysisServiceUrl = process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:5004';
        
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
        const url = `${this.authServiceUrl}${config.url}`;
        return await axios({
            ...config,
            url,
            timeout: 8000
        });
    }
    
    async _makeAnalysisRequest(config) {
        const url = `${this.analysisServiceUrl}${config.url}`;
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
                    console.log(`[ENHANCED-CLIENT] Making auth service request to: ${requestConfig.url}`);
                    return await this.authServiceBreaker.fire(requestConfig);
                    
                case 'analysis':
                    console.log(`[ENHANCED-CLIENT] Making analysis service request to: ${requestConfig.url}`);
                    return await this.analysisServiceBreaker.fire(requestConfig);
                    
                default:
                    throw new Error(`Unknown service: ${service}`);
            }
        } catch (error) {
            console.error(`[ENHANCED-CLIENT] Request failed for service ${service}:`, error.message);
            throw error;
        }
    }
    
    // Convenience methods
    async validateToken(token) {
        console.log('[ENHANCED-CLIENT] validateToken called with token length:', token ? token.length : 'null');
        
        // Use direct auth service call instead of going through request method to avoid service parameter issues
        try {
            console.log('[ENHANCED-CLIENT] Making direct auth service validation request');
            const response = await this.authServiceBreaker.fire({
                method: 'POST',
                url: '/auth/validate-token',  // Fixed: removed /api prefix since AUTH_SERVICE_URL already includes it
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('[ENHANCED-CLIENT] Token validation successful');
            return response;
        } catch (error) {
            console.error('[ENHANCED-CLIENT] Token validation failed:', error.message);
            throw error;
        }
    }
    
    async analyzeSubmission(submissionData, token) {
        return await this.request({
            service: 'analysis',
            method: 'POST',
            url: '/api/analysis/analyze',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: submissionData
        });
    }
}

// Create singleton instance
const enhancedClient = new EnhancedClient();

module.exports = enhancedClient;
