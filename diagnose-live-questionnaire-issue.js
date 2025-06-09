#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// Create a Prisma client to connect to the questionnaire database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://questionnaire_user:questionnaire_password@localhost:5433/questionnaire_service_db'
    }
  }
});

async function diagnoseLiveQuestionnaireIssue() {
  console.log('🔍 Live Questionnaire Service Diagnostic Tool');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Check database connectivity
    console.log('\n1. Testing database connectivity...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Step 2: Check existing submissions in database
    console.log('\n2. Checking existing submissions...');
    const allSubmissions = await prisma.submission.findMany({
      include: {
        Template: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        Answer: {
          select: {
            id: true,
            questionId: true,
            value: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`📊 Total submissions in database: ${allSubmissions.length}`);
    
    if (allSubmissions.length > 0) {
      console.log('\n📝 Recent submissions:');
      allSubmissions.slice(0, 5).forEach((submission, index) => {
        console.log(`   ${index + 1}. ID: ${submission.id}, User: ${submission.userId}, Status: ${submission.status}`);
        console.log(`      Template: ${submission.Template?.name || 'Unknown'}`);
        console.log(`      Answers: ${submission.Answer.length}`);
        console.log(`      Updated: ${submission.updatedAt.toISOString()}`);
        
        if (submission.Answer.length > 0) {
          console.log(`      Sample answers: ${submission.Answer.slice(0, 3).map(a => `Q${a.questionId}="${a.value.substring(0, 20)}..."`).join(', ')}`);
        }
        console.log('');
      });
    } else {
      console.log('⚠️  No submissions found in database');
    }
    
    // Step 3: Check unique user IDs
    console.log('\n3. Checking unique user IDs in submissions...');
    const uniqueUsers = await prisma.submission.findMany({
      select: {
        userId: true
      },
      distinct: ['userId']
    });
    
    console.log('👥 Unique user IDs in database:');
    uniqueUsers.forEach(user => {
      console.log(`   - "${user.userId}"`);
    });
    
    // Step 4: Test API endpoints
    console.log('\n4. Testing API endpoints...');
    const baseURL = 'http://localhost:5000'; // API Gateway
    
    try {
      // Test the submissions endpoint (will need auth, but we can see the response)
      console.log('   Testing /api/questionnaire/submissions/in-progress...');
      
      // First try without auth to see what error we get
      const response = await axios.get(`${baseURL}/api/questionnaire/submissions/in-progress`, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      console.log(`   Response status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Endpoint responding (requires authentication as expected)');
      } else if (response.status === 200) {
        console.log('   ✅ Endpoint responding with data');
        console.log(`   Data: ${JSON.stringify(response.data, null, 2)}`);
      } else {
        console.log(`   ⚠️  Unexpected response: ${response.status} - ${response.data}`);
      }
    } catch (error) {
      console.log(`   ❌ API endpoint error: ${error.message}`);
    }
    
    // Step 5: Check for in-progress submissions with answers
    console.log('\n5. Analyzing in-progress submissions with answers...');
    const inProgressWithAnswers = await prisma.submission.findMany({
      where: {
        status: 'draft',
        Answer: {
          some: {} // Has at least one answer
        }
      },
      include: {
        Template: {
          include: {
            Question: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        Answer: true
      }
    });
    
    console.log(`📋 In-progress submissions with saved answers: ${inProgressWithAnswers.length}`);
    
    if (inProgressWithAnswers.length > 0) {
      console.log('\n🔍 Detailed analysis of submissions with answers:');
      inProgressWithAnswers.forEach((submission, index) => {
        const totalQuestions = submission.Template.Question.length;
        const answeredQuestions = submission.Answer.length;
        const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
        
        console.log(`\n   Submission ${index + 1}:`);
        console.log(`   - ID: ${submission.id}`);
        console.log(`   - User ID: "${submission.userId}"`);
        console.log(`   - Template: ${submission.Template.name}`);
        console.log(`   - Progress: ${progress}% (${answeredQuestions}/${totalQuestions} questions)`);
        console.log(`   - Last updated: ${submission.updatedAt.toISOString()}`);
        
        // Show sample answers
        if (submission.Answer.length > 0) {
          console.log(`   - Sample answers:`);
          submission.Answer.slice(0, 3).forEach(answer => {
            const question = submission.Template.Question.find(q => q.id === answer.questionId);
            console.log(`     * Q${answer.questionId}: "${answer.value.substring(0, 30)}${answer.value.length > 30 ? '...' : ''}"`);
            if (question) {
              console.log(`       Question: "${question.text.substring(0, 50)}${question.text.length > 50 ? '...' : ''}"`);
            }
          });
        }
      });
    }
    
    // Step 6: Real-time monitoring suggestion
    console.log('\n6. Real-time monitoring ready 🎯');
    console.log('   Now you can test in your browser while this runs...');
    console.log('');
    console.log('   📝 Testing steps for your browser:');
    console.log('   1. Navigate to the questionnaires page');
    console.log('   2. Look for any in-progress questionnaires');
    console.log('   3. Click "Continue" on an in-progress questionnaire');
    console.log('   4. Check browser console for the logs:');
    console.log('      - Look for: "📊 Restored questionnaire progress"');
    console.log('      - Check if answers are being loaded');
    console.log('      - Verify progress percentage');
    console.log('');
    console.log('   🔍 What to look for:');
    console.log('   - Does the progress bar show 0% or the correct percentage?');
    console.log('   - Are you positioned at question 1 or at the next unanswered question?');
    console.log('   - When you navigate back/forward, do previous answers appear?');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
diagnoseLiveQuestionnaireIssue().catch(console.error);
