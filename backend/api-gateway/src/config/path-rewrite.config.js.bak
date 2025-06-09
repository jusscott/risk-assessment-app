/**
 * Standardized path rewriting configuration
 * Ensures consistent handling of paths across all services
 */
module.exports = {
  // Configuration for each service with standardized pattern
  auth: {
    externalPrefix: '/api/auth',
    internalPrefix: '',
    // Special parameter handling if needed
    parameterizedPaths: {
      // 'pattern': 'transformation'
    }
  },
  questionnaire: {
    externalPrefix: '/api/questionnaires',
    internalPrefix: '',
    parameterizedPaths: {
      '^/api/questionnaires/templates/([^/]*)$': '/templates/$1',
      '^/api/questionnaires/submissions/([^/]*)/submit$': '/submissions/$1/submit',
      '^/api/questionnaires/submissions/([^/]*)$': '/submissions/$1',
    }
  },
  payment: {
    externalPrefix: '/api/payments',
    internalPrefix: '/payments',
    parameterizedPaths: {}
  },
  // Dedicated config for plans endpoint
plans: {
  externalPrefix: '/api/plans',
  internalPrefix: '/plans',
  parameterizedPaths: {}
},
  usage: {
    externalPrefix: '/api/usage',
    internalPrefix: '/api/usage',
    parameterizedPaths: {
      '^/api/usage/user/([^/]*)$': '/api/usage/user/$1',
      '^/api/usage/subscription/([^/]*)$': '/api/usage/subscription/$1'
    }
  },
  analysis: {
    externalPrefix: '/api/analysis',
    internalPrefix: '/api',
    parameterizedPaths: {}
  },
  benchmark: {
    externalPrefix: '/api/benchmarks',
    internalPrefix: '/api/benchmarks',
    parameterizedPaths: {
      '^/api/benchmarks/industries/([^/]*)/frameworks/([^/]*)$': '/api/benchmarks/industries/$1/frameworks/$2',
      '^/api/benchmarks/analyses/([^/]*)/compare$': '/api/benchmarks/analyses/$1/compare'
    }
  },
  report: {
    externalPrefix: '/api/reports',
    internalPrefix: '/reports',
    parameterizedPaths: {}
  },
  rules: {
    externalPrefix: '/api/rules',
    internalPrefix: '/api/rules',
    parameterizedPaths: {
      '^/api/rules/analyses/([^/]*)/evaluate$': '/api/rules/analyses/$1/evaluate',
      '^/api/rules/analyses/([^/]*)/results$': '/api/rules/analyses/$1/results'
    }
  }
};

/**
 * Generate path rewriting configuration for a service
 * @param {string} serviceName - Name of the service
 * @returns {Object} Path rewriting configuration for http-proxy-middleware
 */
function generatePathRewrite(serviceName) {
  const config = module.exports[serviceName];
  if (!config) {
    throw new Error(`No path rewriting configuration found for service: ${serviceName}`);
  }
  
  // Start with basic prefix rewriting
  const rewriteRules = {
    [`^${config.externalPrefix}`]: config.internalPrefix
  };
  
  // Add parameterized paths if any
  Object.entries(config.parameterizedPaths).forEach(([pattern, replacement]) => {
    rewriteRules[pattern] = replacement;
  });
  
  return rewriteRules;
}

module.exports.generatePathRewrite = generatePathRewrite;
