#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

console.log('=== QUESTIONNAIRE DATABASE & USER ID ANALYSIS ===');
console.log('Investigating user ID inconsistency for jusscott@gmail.com');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Initialize Prisma client for questionnaire service only
const questionnairePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5433/questionnaires'
    }
  }
});

async function diagnoseQuestionnaireDatabaseOnly() {
  try {
    console.log('🔍 PHASE 1: QUESTIONNAIRE DATABASE ANALYSIS');
    console.log('============================================');
    
    // Test questionnaire database connection
    await questionnairePrisma.$connect();
    console.log('✅ Questionnaire database connection: SUCCESS');
    
    // Get all submissions from questionnaire database
    const allSubmissions = await questionnairePrisma.submission.findMany({
      include: {
        Template: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        _count: {
          select: {
            Answer: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`Total submissions in questionnaire database: ${allSubmissions.length}`);
    
    if (allSubmissions.length > 0) {
      console.log('\nAll submissions:');
      allSubmissions.forEach((submission, index) => {
        console.log(`  ${index + 1}. Submission ID: ${submission.id}`);
        console.log(`     User ID: "${submission.userId}" (type: ${typeof submission.userId})`);
        console.log(`     Status: ${submission.status}`);
        console.log(`     Template: ${submission.Template?.name || 'Unknown'} (${submission.Template?.category || 'Unknown'})`);
        console.log(`     Answers: ${submission._count.Answer}`);
        console.log(`     Created: ${submission.createdAt}`);
        console.log(`     Updated: ${submission.updatedAt}`);
        console.log('');
      });
      
      // Get unique user IDs from submissions
      const uniqueUserIds = [...new Set(allSubmissions.map(s => s.userId))];
      console.log('Unique User IDs in submissions:');
      uniqueUserIds.forEach((userId, index) => {
        const userSubmissions = allSubmissions.filter(s => s.userId === userId);
        const inProgressCount = userSubmissions.filter(s => s.status === 'draft').length;
        const completedCount = userSubmissions.filter(s => s.status !== 'draft').length;
        console.log(`  ${index + 1}. "${userId}" (${userSubmissions.length} total: ${inProgressCount} in-progress, ${completedCount} completed)`);
      });
    } else {
      console.log('⚠️  No submissions found in questionnaire database');
    }
    
    console.log('');
    console.log('🔍 PHASE 2: SERVICE HEALTH CHECK');
    console.log('=================================');
    
    // Test API Gateway health
    try {
      const healthResponse = await axios.get('http://localhost:5000/health', {
        timeout: 3000
      });
      console.log('✅ API Gateway health check: SUCCESS');
    } catch (error) {
      console.log('❌ API Gateway health check: FAILED');
      console.log('Error:', error.message);
    }
    
    // Test Questionnaire Service health
    try {
      const qServiceResponse = await axios.get('http://localhost:5002/api/health', {
        timeout: 3000
      });
      console.log('✅ Questionnaire Service health check: SUCCESS');
    } catch (error) {
      console.log('❌ Questionnaire Service health check: FAILED');
      console.log('Error:', error.message);
    }
    
    // Test Auth Service health
    try {
      const authServiceResponse = await axios.get('http://localhost:5001/health', {
        timeout: 3000
      });
      console.log('✅ Auth Service health check: SUCCESS');
    } catch (error) {
      console.log('❌ Auth Service health check: FAILED');
      console.log('Error:', error.message);
    }
    
    console.log('');
    console.log('🔍 PHASE 3: API ENDPOINT TESTING');
    console.log('=================================');
    
    // Test direct questionnaire service endpoints
    try {
      console.log('Testing direct questionnaire service with BYPASS_AUTH...');
      
      // Try to get in-progress submissions without authentication (since BYPASS_AUTH=true)
      const response = await axios.get('http://localhost:5002/api/submissions/in-progress', {
        headers: {
          'Authorization': 'Bearer fake-token-for-testing',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('✅ Direct questionnaire service call: SUCCESS');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('❌ Direct questionnaire service call: FAILED');
      console.log('Error:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', error.response.data);
      }
    }
    
    console.log('');
    console.log('🔍 PHASE 4: TOKEN VALIDATION ANALYSIS');
    console.log('======================================');
    
    // Test token validation with different user scenarios
    const testUsers = [
      'jusscott@gmail.com',
      'test-user-id',
      'dev-user',
      'system'
    ];
    
    for (const testUser of testUsers) {
      try {
        console.log(`Testing token validation for: ${testUser}`);
        
        const mockToken = Buffer.from(JSON.stringify({
          userId: testUser,
          email: testUser.includes('@') ? testUser : `${testUser}@example.com`,
          exp: Math.floor(Date.now() / 1000) + 3600
        })).toString('base64');
        
        const response = await axios.get('http://localhost:5002/api/submissions/in-progress', {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 3000
        });
        
        console.log(`  ✅ ${testUser}: SUCCESS`);
        console.log(`  Response: ${response.data?.data?.length || 0} submissions found`);
        
      } catch (error) {
        console.log(`  ❌ ${testUser}: FAILED - ${error.message}`);
      }
    }
    
    console.log('');
    console.log('📋 SUMMARY & DIAGNOSIS');
    console.log('======================');
    
    if (allSubmissions.length > 0) {
      const uniqueUserIds = [...new Set(allSubmissions.map(s => s.userId))];
      console.log(`• Total submissions: ${allSubmissions.length}`);
      console.log(`• Unique user IDs: ${uniqueUserIds.length}`);
      console.log(`• User ID formats found: ${uniqueUserIds.map(id => `"${id}" (${typeof id})`).join(', ')}`);
      
      const inProgressSubmissions = allSubmissions.filter(s => s.status === 'draft');
      console.log(`• In-progress submissions: ${inProgressSubmissions.length}`);
      
      if (inProgressSubmissions.length > 0) {
        console.log('• In-progress submission details:');
        inProgressSubmissions.forEach(submission => {
          console.log(`  - User: "${submission.userId}", Template: ${submission.Template?.name}, Answers: ${submission._count.Answer}`);
        });
      }
      
      console.log('');
      console.log('🔍 PROBABLE CAUSES:');
      console.log('-------------------');
      
      // Check if any user IDs look like emails vs UUIDs vs simple strings
      const emailUserIds = uniqueUserIds.filter(id => String(id).includes('@'));
      const uuidUserIds = uniqueUserIds.filter(id => String(id).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
      const stringUserIds = uniqueUserIds.filter(id => !String(id).includes('@') && !String(id).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
      
      if (emailUserIds.length > 0) {
        console.log(`• Found ${emailUserIds.length} email-based user IDs: ${emailUserIds.join(', ')}`);
      }
      if (uuidUserIds.length > 0) {
        console.log(`• Found ${uuidUserIds.length} UUID-based user IDs: ${uuidUserIds.join(', ')}`);
      }
      if (stringUserIds.length > 0) {
        console.log(`• Found ${stringUserIds.length} string-based user IDs: ${stringUserIds.join(', ')}`);
      }
      
      console.log('');
      console.log('The issue is likely:');
      console.log('1. Auth service provides one format of user ID (e.g., UUID from database)');
      console.log('2. But submissions were created with a different format (e.g., email or string)'); 
      console.log('3. When jusscott@gmail.com logs in, their token has auth DB user ID');
      console.log('4. But their submissions have a different user ID format');
      console.log('5. So the query filter doesn\'t match and returns empty results');
      
    } else {
      console.log('• No submissions found - user may need to create submissions first');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await questionnairePrisma.$disconnect();
  }
}

// Run the diagnostic
diagnoseQuestionnaireDatabaseOnly()
  .then(() => {
    console.log('');
    console.log('✅ Diagnostic completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
