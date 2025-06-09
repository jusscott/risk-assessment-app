#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

console.log('=== USER SESSION & QUESTIONNAIRE LOADING DIAGNOSTIC ===');
console.log('Investigating in-progress questionnaire loading issue for jusscott@gmail.com');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Initialize Prisma clients for different services
const questionnairePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5433/questionnaires'
    }
  }
});

const authPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5432/auth'  
    }
  }
});

async function diagnoseBothDatabases() {
  try {
    console.log('🔍 PHASE 1: DATABASE CONNECTIVITY CHECK');
    console.log('============================================');
    
    // Test questionnaire database connection
    try {
      await questionnairePrisma.$connect();
      console.log('✅ Questionnaire database connection: SUCCESS');
    } catch (error) {
      console.log('❌ Questionnaire database connection: FAILED');
      console.log('Error:', error.message);
    }
    
    // Test auth database connection  
    try {
      await authPrisma.$connect();
      console.log('✅ Auth database connection: SUCCESS');
    } catch (error) {
      console.log('❌ Auth database connection: FAILED');
      console.log('Error:', error.message);
    }
    
    console.log('');
    console.log('🔍 PHASE 2: USER AUTHENTICATION DATA ANALYSIS');
    console.log('==============================================');
    
    // Find user in auth database
    const users = await authPrisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'jusscott', mode: 'insensitive' } },
          { email: { contains: 'justin', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log(`Found ${users.length} user(s) matching jusscott/justin:`);
    users.forEach((user, index) => {
      console.log(`  User ${index + 1}:`);
      console.log(`    ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Name: ${user.name}`);
      console.log(`    Created: ${user.createdAt}`);
      console.log(`    Updated: ${user.updatedAt}`);
    });
    
    if (users.length === 0) {
      console.log('⚠️  No users found with jusscott/justin in email');
      
      // Show all users in auth database
      const allUsers = await authPrisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true
        },
        take: 10
      });
      
      console.log('\nAll users in auth database (first 10):');
      allUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
      });
    }
    
    console.log('');
    console.log('🔍 PHASE 3: QUESTIONNAIRE SUBMISSIONS ANALYSIS');  
    console.log('===============================================');
    
    // Get all submissions from questionnaire database
    const allSubmissions = await questionnairePrisma.submission.findMany({
      select: {
        id: true,
        userId: true,
        status: true,
        templateId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            Answer: true
          }
        }
      },
      include: {
        Template: {
          select: {
            id: true,
            name: true,
            category: true
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
        console.log(`     User ID: "${submission.userId}"`);
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
        console.log(`  ${index + 1}. "${userId}" (${userSubmissions.length} submissions)`);
      });
    } else {
      console.log('⚠️  No submissions found in questionnaire database');
    }
    
    console.log('');
    console.log('🔍 PHASE 4: USER ID MATCHING ANALYSIS');
    console.log('======================================');
    
    // Cross-reference auth users with questionnaire submissions
    if (users.length > 0 && allSubmissions.length > 0) {
      users.forEach(user => {
        const userSubmissions = allSubmissions.filter(s => 
          s.userId === user.id || 
          s.userId === String(user.id) ||
          s.userId === user.email
        );
        
        console.log(`User ${user.email} (ID: ${user.id}):`);
        console.log(`  Matching submissions: ${userSubmissions.length}`);
        
        if (userSubmissions.length > 0) {
          userSubmissions.forEach((submission, index) => {
            console.log(`    ${index + 1}. ${submission.Template?.name} - ${submission.status} (${submission._count.Answer} answers)`);
          });
        } else {
          console.log('    No matching submissions found');
          console.log(`    Checking for partial matches...`);
          
          // Check for any submissions that might partially match
          const partialMatches = allSubmissions.filter(s => 
            s.userId.toLowerCase().includes(user.email.split('@')[0].toLowerCase()) ||
            user.email.toLowerCase().includes(s.userId.toLowerCase())
          );
          
          if (partialMatches.length > 0) {
            console.log(`    Found ${partialMatches.length} potential partial matches:`);
            partialMatches.forEach(match => {
              console.log(`      Submission userId: "${match.userId}" vs Auth userId: "${user.id}"`);
            });
          }
        }
        console.log('');
      });
    }
    
    console.log('🔍 PHASE 5: API GATEWAY TOKEN VALIDATION TEST');
    console.log('==============================================');
    
    // Test API Gateway endpoints to simulate real user flow
    try {
      console.log('Testing API Gateway health...');
      const healthResponse = await axios.get('http://localhost:5000/health', {
        timeout: 5000
      });
      console.log('✅ API Gateway health check: SUCCESS');
      console.log('Response:', healthResponse.data);
    } catch (error) {
      console.log('❌ API Gateway health check: FAILED');
      console.log('Error:', error.message);
    }
    
    console.log('');
    console.log('🔍 PHASE 6: DIRECT QUESTIONNAIRE SERVICE TEST');
    console.log('==============================================');
    
    try {
      console.log('Testing Questionnaire Service health...');
      const qServiceResponse = await axios.get('http://localhost:5002/api/health', {
        timeout: 5000
      });
      console.log('✅ Questionnaire Service health check: SUCCESS');
      console.log('Response:', qServiceResponse.data);
    } catch (error) {
      console.log('❌ Questionnaire Service health check: FAILED');
      console.log('Error:', error.message);
    }
    
    console.log('');
    console.log('🔍 PHASE 7: RECOMMENDATIONS');
    console.log('============================');
    
    // Provide recommendations based on findings
    if (users.length === 0) {
      console.log('❌ CRITICAL: No user found with jusscott@gmail.com');
      console.log('   → User may need to register or email might be different');
      console.log('   → Check if user exists with different email format');
    }
    
    if (users.length > 0 && allSubmissions.length === 0) {
      console.log('⚠️  User exists but no submissions found');
      console.log('   → User may not have started any questionnaires yet');
      console.log('   → Check if submissions are being created in different database');
    }
    
    if (users.length > 0 && allSubmissions.length > 0) {
      const hasMatchingSubmissions = users.some(user => 
        allSubmissions.some(s => s.userId === user.id || s.userId === String(user.id))
      );
      
      if (!hasMatchingSubmissions) {
        console.log('❌ CRITICAL: User ID mismatch between auth and questionnaire databases');
        console.log('   → Auth service may be providing different user ID than expected');
        console.log('   → Token validation middleware may be transforming user ID');
        console.log('   → Database schemas may be inconsistent');
        
        // Show specific ID format mismatches
        users.forEach(user => {
          console.log(`   → Auth User ID: "${user.id}" (type: ${typeof user.id})`);
        });
        allSubmissions.slice(0, 5).forEach(submission => {
          console.log(`   → Submission User ID: "${submission.userId}" (type: ${typeof submission.userId})`);
        });
      } else {
        console.log('✅ User ID matching appears correct');
      }
    }
    
    console.log('');
    console.log('📋 SUMMARY');
    console.log('==========');
    console.log(`• Auth DB Users Found: ${users.length}`);
    console.log(`• Questionnaire DB Submissions: ${allSubmissions.length}`);
    console.log(`• Unique User IDs in Submissions: ${allSubmissions.length > 0 ? [...new Set(allSubmissions.map(s => s.userId))].length : 0}`);
    
    if (users.length > 0) {
      const targetUser = users.find(u => u.email.includes('jusscott')) || users[0];
      const matchingSubmissions = allSubmissions.filter(s => 
        s.userId === targetUser.id || s.userId === String(targetUser.id)
      );
      console.log(`• Submissions for ${targetUser.email}: ${matchingSubmissions.length}`);
      
      if (matchingSubmissions.length > 0) {
        const inProgressSubmissions = matchingSubmissions.filter(s => s.status === 'draft');
        console.log(`• In-Progress Submissions: ${inProgressSubmissions.length}`);
        
        if (inProgressSubmissions.length > 0) {
          console.log('• In-Progress Details:');
          inProgressSubmissions.forEach(submission => {
            console.log(`  - ${submission.Template?.name}: ${submission._count.Answer} answers`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await questionnairePrisma.$disconnect();
    await authPrisma.$disconnect();
  }
}

// Run the diagnostic
diagnoseBothDatabases()
  .then(() => {
    console.log('');
    console.log('✅ Diagnostic completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
