#!/usr/bin/env node

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
      console.log(`Cleared ${keys.length} rate limiting keys`);
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
