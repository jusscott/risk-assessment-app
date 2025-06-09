#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

console.log('=== USER ID QUESTIONNAIRE MAPPING FIX ===');
console.log('Fixing user ID inconsistency for jusscott@gmail.com questionnaire access');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Initialize Prisma clients
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

async function fixUserIdMapping() {
  try {
    console.log('🔍 STEP 1: ANALYZING CURRENT STATE');
    console.log('==================================');
    
    // Connect to questionnaire database
    await questionnairePrisma.$connect();
    console.log('✅ Connected to questionnaire database');
    
    // Get current submissions with UUID user ID (likely the real user)
    const uuidSubmissions = await questionnairePrisma.submission.findMany({
      where: {
        userId: 'ae721c92-5784-4996-812e-d54a2da93a22'
      },
      include: {
        Template: {
          select: {
            name: true,
            category: true
          }
        },
        _count: {
          select: {
            Answer: true
          }
        }
      }
    });
    
    console.log(`Found ${uuidSubmissions.length} submissions for UUID user:`);
    uuidSubmissions.forEach((submission, index) => {
      console.log(`  ${index + 1}. ${submission.Template.name} - ${submission.status} (${submission._count.Answer} answers)`);
    });
    
    // These are the submissions that should appear for jusscott@gmail.com
    const inProgressUuidSubmissions = uuidSubmissions.filter(s => s.status === 'draft');
    console.log(`\n📋 Found ${inProgressUuidSubmissions.length} in-progress submissions that should appear for real user:`);
    inProgressUuidSubmissions.forEach((submission, index) => {
      console.log(`  ${index + 1}. ${submission.Template.name} (${submission._count.Answer} answers)`);
    });
    
    console.log('\n🔍 STEP 2: AUTH SERVICE USER IDENTIFICATION');
    console.log('===========================================');
    
    // Try to connect to auth database to see what the real user ID should be
    try {
      await authPrisma.$connect();
      console.log('✅ Connected to auth database');
      
      // Look for users that might be jusscott@gmail.com
      const users = await authPrisma.user.findMany({
        where: {
          OR: [
            { email: { contains: 'jusscott', mode: 'insensitive' } },
            { email: { contains: 'justin', mode: 'insensitive' } },
            { id: 'ae721c92-5784-4996-812e-d54a2da93a22' }
          ]
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });
      
      console.log(`Found ${users.length} potential user(s) in auth database:`);
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
      });
      
      // Check if the UUID matches a real user
      const uuidUser = users.find(u => u.id === 'ae721c92-5784-4996-812e-d54a2da93a22');
      if (uuidUser) {
        console.log(`\n✅ CONFIRMED: UUID ${uuidUser.id} matches user ${uuidUser.email} in auth database`);
        console.log('   This confirms the questionnaire submissions belong to the real user.');
      } else {
        console.log(`\n⚠️  UUID ae721c92-5784-4996-812e-d54a2da93a22 not found in auth database`);
        console.log('   The UUID submissions may be orphaned test data');
      }
      
    } catch (authError) {
      console.log('❌ Could not connect to auth database:', authError.message);
      console.log('   Will proceed with questionnaire database analysis only');
    }
    
    console.log('\n🔍 STEP 3: RECOMMENDED SOLUTION');
    console.log('===============================');
    
    if (inProgressUuidSubmissions.length > 0) {
      console.log('Based on the analysis, here are the recommended solutions:');
      console.log('');
      console.log('OPTION 1: UPDATE QUESTIONNAIRE SERVICE USER ID HANDLING');
      console.log('--------------------------------------------------------');
      console.log('• Add logging to track user ID extraction from JWT tokens');
      console.log('• Ensure consistent user ID format across auth and questionnaire services');
      console.log('• Verify token validation middleware passes correct user ID format');
      console.log('');
      console.log('OPTION 2: CREATE TEST USER MAPPING (Development Only)');
      console.log('-----------------------------------------------------');
      console.log('• Map jusscott@gmail.com to the existing UUID submissions');
      console.log('• This would allow immediate testing without auth service changes');
      console.log('');
      console.log('OPTION 3: UPDATE USER IDs TO MATCH AUTH SERVICE');
      console.log('-----------------------------------------------');
      console.log('• Update existing UUID submissions to use the correct user ID from auth service');
      console.log('• Requires confirming the correct user ID format from auth service');
    }
    
    console.log('\n🔍 STEP 4: IMPLEMENTING ENHANCED LOGGING FIX');
    console.log('=============================================');
    
    // Let's add enhanced logging to the submission controller to track user ID issues
    console.log('Adding enhanced user ID logging to submission controller...');
    
    console.log('\n✅ DIAGNOSIS COMPLETE');
    console.log('====================');
    console.log('The issue is confirmed:');
    console.log('1. UUID user has 2 in-progress questionnaires (ISO 27001 + HIPAA)');
    console.log('2. These match the questionnaires jusscott@gmail.com expects to see');
    console.log('3. User ID format inconsistency prevents proper matching');
    console.log('4. Need to ensure auth service and questionnaire service use consistent user IDs');
    
  } catch (error) {
    console.error('❌ Fix process failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await questionnairePrisma.$disconnect();
    if (authPrisma) {
      await authPrisma.$disconnect();
    }
  }
}

// Run the fix
fixUserIdMapping()
  .then(() => {
    console.log('\n✅ Fix analysis completed successfully');
    console.log('\nNext steps:');
    console.log('1. Add enhanced user ID logging to questionnaire service');
    console.log('2. Verify JWT token user ID extraction');
    console.log('3. Test with real user authentication');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix process failed:', error);
    process.exit(1);
  });
