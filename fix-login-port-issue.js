#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing login port mismatch issue...\n');

// Fix 1: Update API Gateway to run on port 5000 (what frontend expects)
console.log('1. Updating API Gateway port configuration...');
const apiGatewayPath = path.join(__dirname, 'backend/api-gateway/src/index.js');
let apiGatewayContent = fs.readFileSync(apiGatewayPath, 'utf8');

// Change port from 5050 to 5000
apiGatewayContent = apiGatewayContent.replace(
  'const port = process.env.PORT || 5050;',
  'const port = process.env.PORT || 5000;'
);

fs.writeFileSync(apiGatewayPath, apiGatewayContent);
console.log('✅ API Gateway now configured to run on port 5000');

// Fix 2: Update docker-compose to use port 5000 for API Gateway
console.log('\n2. Updating docker-compose port mapping...');
const dockerComposePath = path.join(__dirname, 'docker-compose.yml');
if (fs.existsSync(dockerComposePath)) {
  let dockerContent = fs.readFileSync(dockerComposePath, 'utf8');
  
  // Update API Gateway port mapping
  dockerContent = dockerContent.replace(
    /api-gateway:[\s\S]*?ports:[\s\S]*?- "5050:5050"/g,
    (match) => match.replace('5050:5050', '5000:5000')
  );
  
  // Also update any environment variable references
  dockerContent = dockerContent.replace(
    /PORT=5050/g,
    'PORT=5000'
  );
  
  fs.writeFileSync(dockerComposePath, dockerContent);
  console.log('✅ Docker Compose updated for port 5000');
} else {
  console.log('⚠️  Docker Compose file not found - skipping update');
}

// Fix 3: Temporarily relax rate limiting for development
console.log('\n3. Creating rate limiter bypass for development...');
const rateLimiterPath = path.join(__dirname, 'backend/api-gateway/src/middlewares/rate-limit.middleware.js');
if (fs.existsSync(rateLimiterPath)) {
  let rateLimiterContent = fs.readFileSync(rateLimiterPath, 'utf8');
  
  // Add development bypass at the top of each rate limiter
  const devBypass = `
  // Development bypass for login issues
  if (process.env.NODE_ENV === 'development' && req.url.includes('/auth/login')) {
    console.log('⚠️  Rate limiting bypassed for development login');
    return next();
  }
  `;
  
  // Insert bypass into authLimiter
  if (rateLimiterContent.includes('const authLimiter = ')) {
    rateLimiterContent = rateLimiterContent.replace(
      /(const authLimiter = [^{]*{[^}]*skip:\s*\([^)]*\)\s*=>\s*{)/,
      `$1${devBypass}`
    );
  }
  
  fs.writeFileSync(rateLimiterPath, rateLimiterContent);
  console.log('✅ Rate limiting bypass added for development');
}

// Fix 4: Clear any existing rate limiting blocks
console.log('\n4. Creating Redis rate limiter reset script...');
const resetScript = `#!/usr/bin/env node

const redis = require('redis');

async function clearRateLimits() {
  try {
    const client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD
    });
    
    await client.connect();
    console.log('Connected to Redis');
    
    // Clear all rate limiting keys
    const keys = await client.keys('ratelimit:*');
    if (keys.length > 0) {
      await client.del(keys);
      console.log(\`Cleared \${keys.length} rate limiting keys\`);
    } else {
      console.log('No rate limiting keys found');
    }
    
    await client.disconnect();
    console.log('✅ Rate limits cleared successfully');
  } catch (error) {
    console.error('Error clearing rate limits:', error.message);
    console.log('⚠️  This is normal if Redis is not running');
  }
}

clearRateLimits();
`;

fs.writeFileSync(path.join(__dirname, 'clear-rate-limits.js'), resetScript);
console.log('✅ Rate limiter reset script created');

// Fix 5: Create startup verification script
console.log('\n5. Creating login verification script...');
const verifyScript = `#!/usr/bin/env node

const axios = require('axios');

async function verifyLogin() {
  const API_URL = 'http://localhost:5000';
  
  console.log('🔍 Verifying login endpoints...');
  
  try {
    // Test API Gateway health
    console.log('Testing API Gateway health...');
    const healthResponse = await axios.get(\`\${API_URL}/health\`, { timeout: 5000 });
    console.log('✅ API Gateway is responding');
    
    // Test auth endpoints
    console.log('Testing auth endpoints...');
    try {
      const authResponse = await axios.post(\`\${API_URL}/api/auth/login\`, {
        email: 'test@example.com',
        password: 'testpassword'
      }, { timeout: 10000 });
    } catch (authError) {
      if (authError.response) {
        console.log(\`✅ Auth endpoint is responding (status: \${authError.response.status})\`);
        if (authError.response.status === 429) {
          console.log('⚠️  Rate limiting is active - this might be the login issue');
        }
      } else {
        console.log('❌ Auth service is not responding');
      }
    }
    
  } catch (error) {
    console.error('❌ API Gateway is not responding:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Make sure Docker services are running: docker-compose up -d');
    console.log('2. Check if API Gateway is running on port 5000: curl http://localhost:5000/health');
    console.log('3. Clear rate limits: node clear-rate-limits.js');
    console.log('4. Restart services: docker-compose restart api-gateway');
  }
}

verifyLogin();
`;

fs.writeFileSync(path.join(__dirname, 'verify-login.js'), verifyScript);
console.log('✅ Login verification script created');

console.log('\n🎉 Login port issue fix completed!');
console.log('\n📋 Next steps:');
console.log('1. Restart the API Gateway: docker-compose restart api-gateway');
console.log('2. Clear rate limits: node clear-rate-limits.js');
console.log('3. Verify login: node verify-login.js');
console.log('4. Test login on http://localhost:3000');
console.log('\n⚠️  If you still have issues, the auth-service might not be running properly.');
