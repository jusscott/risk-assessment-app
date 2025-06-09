/**
 * Path Mapping Validation Tool
 * 
 * This script validates the path rewriting configurations 
 * to ensure consistency and proper routing behavior.
 */

const pathConfig = require('../src/config/path-rewrite.config');
const serviceConfig = require('../src/config/service-url.config');

/**
 * Validate path mappings across all services
 * This script checks for inconsistencies and potential issues
 */
function validatePathMappings() {
  const services = Object.keys(pathConfig).filter(key => typeof pathConfig[key] === 'object');
  
  console.log('\n===== PATH MAPPING VALIDATION =====');
  console.log('Validating path mappings for services:', services);
  
  const issues = [];
  
  // Check for duplicate external paths
  const externalPaths = {};
  services.forEach(service => {
    const prefix = pathConfig[service].externalPrefix;
    if (externalPaths[prefix]) {
      issues.push(`Duplicate external path prefix: ${prefix} used by both ${service} and ${externalPaths[prefix]}`);
    }
    externalPaths[prefix] = service;
    
    // Check parameterized paths
    Object.keys(pathConfig[service].parameterizedPaths || {}).forEach(pattern => {
      // Validate regex is valid
      try {
        new RegExp(pattern);
      } catch (e) {
        issues.push(`Invalid regex pattern in ${service}: ${pattern}`);
      }
    });
  });
  
  // Report issues
  if (issues.length) {
    console.error('\n❌ Found issues with path mappings:');
    issues.forEach(issue => console.error(` - ${issue}`));
    return false;
  }
  
  console.log('\n✅ Path mapping validation successful!');
  
  // Test sample paths
  testSamplePaths(services);
  
  return true;
}

/**
 * Test sample paths against the rewrite rules
 * @param {string[]} services - List of service names to test
 */
function testSamplePaths(services) {
  // Create test paths for each service
  const testPaths = [
    // Auth service paths
    {
      service: 'auth',
      external: '/api/auth/login',
      expected: '/login'
    },
    {
      service: 'auth',
      external: '/api/auth/register',
      expected: '/register'
    },
    {
      service: 'auth',
      external: '/api/auth/me',
      expected: '/me'
    },
    
    // Questionnaire service paths
    {
      service: 'questionnaire',
      external: '/api/questionnaires/templates',
      expected: '/templates'
    },
    {
      service: 'questionnaire',
      external: '/api/questionnaires/templates/123',
      expected: '/templates/123'
    },
    {
      service: 'questionnaire',
      external: '/api/questionnaires/submissions/456/submit',
      expected: '/submissions/456/submit'
    },
    {
      service: 'questionnaire',
      external: '/api/questionnaires/submissions/789',
      expected: '/submissions/789'
    },
    
    // Payment service paths
    {
      service: 'payment',
      external: '/api/payments/transactions',
      expected: '/payments/transactions'
    },
    {
      service: 'payment',
      external: '/api/payments/subscriptions/123',
      expected: '/payments/subscriptions/123'
    },
    
    // Analysis service paths
    {
      service: 'analysis',
      external: '/api/analysis/process',
      expected: '/api/process'
    },
    {
      service: 'analysis',
      external: '/api/analysis/recommendations',
      expected: '/api/recommendations'
    },
    
    // Report service paths
    {
      service: 'report',
      external: '/api/reports/generate',
      expected: '/reports/generate'
    },
    {
      service: 'report',
      external: '/api/reports/download/pdf/123',
      expected: '/reports/download/pdf/123'
    }
  ];
  
  console.log('\n===== TESTING SAMPLE PATH MAPPINGS =====');
  
  // Filter test paths to only include services that exist in our config
  const filteredTests = testPaths.filter(test => services.includes(test.service));
  console.log(`Testing ${filteredTests.length} sample paths across ${services.length} services`);
  
  let passCount = 0;
  let failCount = 0;
  
  filteredTests.forEach(test => {
    const rewrite = pathConfig.generatePathRewrite(test.service);
    let transformed = test.external;
    
    // Apply each rewrite rule
    Object.entries(rewrite).forEach(([pattern, replacement]) => {
      transformed = transformed.replace(new RegExp(pattern), replacement);
    });
    
    const success = transformed === test.expected;
    
    if (success) {
      console.log(`✅ ${test.service}: ${test.external} -> ${transformed}`);
      passCount++;
    } else {
      console.error(`❌ ${test.service}: ${test.external} -> ${transformed} (Expected: ${test.expected})`);
      failCount++;
    }
  });
  
  console.log(`\nResults: ${passCount} passed, ${failCount} failed`);
  
  if (failCount > 0) {
    console.error('\nWARNING: Some path mappings are not working correctly!');
    return false;
  }
  
  console.log('\n✅ All path mappings are working as expected!');
  return true;
}

// Run validation
validatePathMappings();
