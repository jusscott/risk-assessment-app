#!/usr/bin/env node

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client for auth database
const authPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://authuser:authpass@localhost:5432/authdb'
    }
  }
});

const questionnairePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://questionnaireuser:questionnairepass@localhost:5433/questionnairedb'
    }
  }
});

async function main() {
  console.log('🔍 Diagnosing Current Login Issues');
  console.log('=====================================\n');

  const testEmails = ['good@test.com', 'jusscott@gmail.com'];
  
  for (const email of testEmails) {
    console.log(`\n📧 Testing login for: ${email}`);
    console.log('━'.repeat(50));
    
    try {
      // Step 1: Check if user exists in auth database
      console.log('1️⃣ Checking user existence in auth database...');
      const authUser = await authPrisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!authUser) {
        console.log(`❌ User ${email} NOT FOUND in auth database`);
        continue;
      }

      console.log(`✅ User found in auth database:`);
      console.log(`   - ID: ${authUser.id}`);
      console.log(`   - Email: ${authUser.email}`);
      console.log(`   - Role: ${authUser.role}`);
      console.log(`   - Active: ${authUser.isActive}`);
      console.log(`   - Password hash exists: ${authUser.password ? 'Yes' : 'No'}`);
      console.log(`   - Password hash length: ${authUser.password ? authUser.password.length : 0}`);
      console.log(`   - Created: ${authUser.createdAt}`);
      console.log(`   - Updated: ${authUser.updatedAt}`);

      // Step 2: Check if user exists in questionnaire database
      console.log('\n2️⃣ Checking user existence in questionnaire database...');
      const questionnaireUser = await questionnairePrisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      });

      if (questionnaireUser) {
        console.log(`✅ User found in questionnaire database:`);
        console.log(`   - ID: ${questionnaireUser.id}`);
        console.log(`   - Email: ${questionnaireUser.email}`);
        console.log(`   - Name: ${questionnaireUser.firstName} ${questionnaireUser.lastName}`);
        console.log(`   - Role: ${questionnaireUser.role}`);
      } else {
        console.log(`⚠️  User ${email} NOT FOUND in questionnaire database`);
      }

      // Step 3: Test direct auth service login
      console.log('\n3️⃣ Testing direct auth service login...');
      try {
        const authResponse = await axios.post('http://localhost:5001/api/auth/login', {
          email,
          password: 'password123' // Assuming this is the test password
        }, {
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500; // Don't throw for 4xx errors
          }
        });

        console.log(`Auth service response status: ${authResponse.status}`);
        console.log(`Auth service response:`, JSON.stringify(authResponse.data, null, 2));

        if (authResponse.data.success && authResponse.data.data?.token) {
          console.log('✅ Direct auth service login SUCCESSFUL');
          
          // Test token validation
          console.log('\n4️⃣ Testing token validation...');
          try {
            const validateResponse = await axios.get('http://localhost:5001/api/auth/validate', {
              headers: {
                'Authorization': `Bearer ${authResponse.data.data.token}`
              },
              timeout: 5000,
              validateStatus: function (status) {
                return status < 500;
              }
            });
            
            console.log(`Token validation status: ${validateResponse.status}`);
            console.log(`Token validation response:`, JSON.stringify(validateResponse.data, null, 2));
          } catch (validateErr) {
            console.log('❌ Token validation failed:', validateErr.message);
          }
        } else {
          console.log('❌ Direct auth service login FAILED');
        }
      } catch (authErr) {
        console.log('❌ Direct auth service login ERROR:', authErr.message);
        if (authErr.response) {
          console.log('Error response status:', authErr.response.status);
          console.log('Error response data:', JSON.stringify(authErr.response.data, null, 2));
        }
      }

      // Step 5: Test API Gateway login
      console.log('\n5️⃣ Testing API Gateway login...');
      try {
        const gatewayResponse = await axios.post('http://localhost:5000/api/auth/login', {
          email,
          password: 'password123'
        }, {
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500;
          }
        });

        console.log(`API Gateway response status: ${gatewayResponse.status}`);
        console.log(`API Gateway response:`, JSON.stringify(gatewayResponse.data, null, 2));

        if (gatewayResponse.data.success) {
          console.log('✅ API Gateway login SUCCESSFUL');
        } else {
          console.log('❌ API Gateway login FAILED');
        }
      } catch (gatewayErr) {
        console.log('❌ API Gateway login ERROR:', gatewayErr.message);
        if (gatewayErr.response) {
          console.log('Error response status:', gatewayErr.response.status);
          console.log('Error response data:', JSON.stringify(gatewayErr.response.data, null, 2));
        }
      }

      // Step 6: Check rate limiting status
      console.log('\n6️⃣ Checking rate limiting status for user...');
      try {
        const rateLimitResponse = await axios.get(`http://localhost:5000/api/auth/rate-limit-status?email=${email}`, {
          timeout: 5000,
          validateStatus: function (status) {
            return status < 500;
          }
        });
        
        if (rateLimitResponse.status === 200) {
          console.log('Rate limit status:', JSON.stringify(rateLimitResponse.data, null, 2));
        } else {
          console.log('Rate limit check not available or failed');
        }
      } catch (rateLimitErr) {
        console.log('Rate limit check failed (may not be implemented)');
      }

    } catch (error) {
      console.log(`❌ Critical error testing ${email}:`, error.message);
      if (error.stack) {
        console.log('Stack trace:', error.stack);
      }
    }
  }

  // Step 7: Check service health and circuit breaker status
  console.log('\n\n🏥 Service Health Check');
  console.log('======================');
  
  const services = [
    { name: 'API Gateway', url: 'http://localhost:5000/health' },
    { name: 'Auth Service', url: 'http://localhost:5001/health' },
    { name: 'Questionnaire Service', url: 'http://localhost:5002/health' }
  ];

  for (const service of services) {
    try {
      const healthResponse = await axios.get(service.url, { timeout: 5000 });
      console.log(`✅ ${service.name}: ${healthResponse.status} - ${JSON.stringify(healthResponse.data)}`);
    } catch (healthErr) {
      console.log(`❌ ${service.name}: ${healthErr.message}`);
    }
  }

  // Step 8: Check Redis connectivity
  console.log('\n\n🔴 Redis Connectivity Check');
  console.log('============================');
  
  try {
    const redis = require('redis');
    const client = redis.createClient({
      host: 'localhost',
      port: 6379
    });
    
    await client.connect();
    await client.ping();
    console.log('✅ Redis connection successful');
    
    // Check for any rate limiting keys
    const keys = await client.keys('ratelimit:*');
    console.log(`Found ${keys.length} rate limiting keys in Redis`);
    if (keys.length > 0) {
      console.log('Rate limiting keys:', keys.slice(0, 5)); // Show first 5
    }
    
    await client.disconnect();
  } catch (redisErr) {
    console.log('❌ Redis connection failed:', redisErr.message);
  }

  console.log('\n\n🎯 Diagnosis Complete');
  console.log('====================');
  console.log('Check the results above to identify the root cause of login issues.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await authPrisma.$disconnect();
    await questionnairePrisma.$disconnect();
  });
