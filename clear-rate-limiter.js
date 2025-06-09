#!/usr/bin/env node

/**
 * Script to clear rate limiter cache from Redis
 * This will immediately resolve the "Too many authentication attempts" issue
 */

const path = require('path');
const fs = require('fs');

async function clearRateLimiter() {
  try {
    console.log('🔧 Clearing rate limiter cache...');
    
    // Try to load Redis configuration
    const redisConfigPath = path.join(__dirname, 'backend/api-gateway/src/config/redis.config.js');
    
    if (fs.existsSync(redisConfigPath)) {
      console.log('📍 Loading Redis configuration...');
      
      // Load Redis config
      const redisConfig = require('./backend/api-gateway/src/config/redis.config.js');
      
      // Initialize Redis client
      const client = await redisConfig.initRedisClient();
      
      if (client) {
        console.log('🔗 Connected to Redis');
        
        // Find and delete all rate limiter keys
        const keys = await client.keys('rl:*'); // Rate limiter keys typically start with 'rl:'
        
        if (keys.length > 0) {
          console.log(`🧹 Found ${keys.length} rate limiter keys to clear`);
          await client.del(...keys);
          console.log('✅ Rate limiter cache cleared successfully');
        } else {
          console.log('ℹ️  No rate limiter keys found in cache');
        }
        
        // Also clear any express-rate-limit keys (they might have different patterns)
        const expressKeys = await client.keys('*rate*');
        if (expressKeys.length > 0) {
          console.log(`🧹 Found ${expressKeys.length} additional rate limiting keys`);
          await client.del(...expressKeys);
          console.log('✅ Additional rate limiting keys cleared');
        }
        
        await client.quit();
        console.log('🔌 Redis connection closed');
      } else {
        console.log('⚠️  Could not connect to Redis, trying alternative approach...');
        
        // If Redis is not available, restart the API Gateway to clear memory-based rate limiting
        console.log('🔄 Restarting API Gateway to clear memory-based rate limiter...');
        const { spawn } = require('child_process');
        
        // Try to restart the API Gateway container
        const restartProcess = spawn('docker', ['restart', 'risk-assessment-app-api-gateway-1'], {
          stdio: 'inherit'
        });
        
        restartProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ API Gateway restarted successfully');
            console.log('🎉 Rate limiter should be cleared now');
          } else {
            console.log('⚠️  Docker restart failed, trying docker-compose...');
            
            // Try docker-compose restart as fallback
            const composeRestart = spawn('docker-compose', ['restart', 'api-gateway'], {
              cwd: __dirname,
              stdio: 'inherit'
            });
            
            composeRestart.on('close', (composeCode) => {
              if (composeCode === 0) {
                console.log('✅ API Gateway restarted via docker-compose');
                console.log('🎉 Rate limiter should be cleared now');
              } else {
                console.log('❌ Could not restart API Gateway automatically');
                console.log('Please manually restart the API Gateway service');
              }
            });
          }
        });
      }
    } else {
      console.log('⚠️  Redis config not found, trying service restart...');
      
      // Restart API Gateway as fallback
      console.log('🔄 Restarting API Gateway...');
      const { spawn } = require('child_process');
      
      const restartProcess = spawn('docker-compose', ['restart', 'api-gateway'], {
        cwd: __dirname,
        stdio: 'inherit'
      });
      
      restartProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ API Gateway restarted successfully');
          console.log('🎉 Rate limiter should be cleared now');
        } else {
          console.log('❌ Could not restart API Gateway');
          console.log('Please manually restart the service');
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error clearing rate limiter:', error.message);
    console.log('🔄 Attempting to restart API Gateway as fallback...');
    
    const { spawn } = require('child_process');
    const restartProcess = spawn('docker-compose', ['restart', 'api-gateway'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    restartProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ API Gateway restarted successfully');
        console.log('🎉 Rate limiter should be cleared now');
      } else {
        console.log('❌ Please manually restart the API Gateway service');
      }
    });
  }
}

// Run the script
clearRateLimiter().then(() => {
  console.log('🏁 Script completed');
}).catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
});
