#!/usr/bin/env node

/**
 * Diagnose questionnaire progress restoration issues
 * This script will help identify why questionnaires aren't resuming from where users left off
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// Initialize Prisma client
const prisma = new PrismaClient();

const API_BASE_URL = 'http://localhost:3001'; // API Gateway URL

async function checkAuthToken() {
  // Check if we can get a valid auth token
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    });
    
    if (response.data && response.data.token) {
      console.log('✅ Successfully obtained auth token');
      return response.data.token;
    } else {
      console.log('❌ Failed to get auth token from login response');
      return null;
    }
  } catch (error) {
    console.log('❌ Failed to authenticate:', error.message);
    return null;
  }
}

async function checkDatabaseSubmissions() {
  console.log('\n=== Database Submissions Analysis ===');
  
  try {
    // Get all submissions from database
    const submissions = await prisma.submission.findMany({
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
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`Found ${submissions.length} total submissions in database`);
    
    if (submissions.length === 0) {
      console.log('⚠️  No submissions found in database');
      return;
    }
    
    // Analyze each submission
    for (const submission of submissions) {
      console.log(`\n--- Submission ID: ${submission.id} ---`);
      console.log(`User ID: ${submission.userId} (type: ${typeof submission.userId})`);
      console.log(`Status: ${submission.status}`);
      console.log(`Template: ${submission.Template?.name || 'Unknown'}`);
      console.log(`Created: ${submission.createdAt}`);
      console.log(`Updated: ${submission.updatedAt}`);
      
      // Analyze answers
      console.log(`\nAnswers (${submission.Answer.length} total):`);
      const answerMap = {};
      submission.Answer.forEach(answer => {
        answerMap[answer.questionId] = answer.value;
        console.log(`  Question ${answer.questionId}: "${answer.value}" (${answer.value.length} chars)`);
      });
      
      // Analyze template questions
      if (submission.Template && submission.Template.Question) {
        const questions = submission.Template.Question;
        console.log(`\nTemplate Questions (${questions.length} total):`);
        
        let answeredCount = 0;
        let firstUnansweredIndex = -1;
        
        questions.forEach((question, index) => {
          const isAnswered = answerMap[question.id] !== undefined;
          if (isAnswered) {
            answeredCount++;
          } else if (firstUnansweredIndex === -1) {
            firstUnansweredIndex = index;
          }
          
          console.log(`  ${index + 1}. Question ${question.id} (order: ${question.order}): ${isAnswered ? '✅ ANSWERED' : '❌ UNANSWERED'}`);
          console.log(`     "${question.text.substring(0, 60)}${question.text.length > 60 ? '...' : ''}"`);
        });
        
        // Calculate expected progress
        const progressPercentage = Math.round((answeredCount / questions.length) * 100);
        const expectedStartIndex = firstUnansweredIndex >= 0 ? firstUnansweredIndex : questions.length - 1;
        
        console.log(`\n📊 Progress Analysis:`);
        console.log(`  - Answered: ${answeredCount}/${questions.length} questions (${progressPercentage}%)`);
        console.log(`  - Should start at question index: ${expectedStartIndex} (question ${expectedStartIndex + 1})`);
        console.log(`  - First unanswered question: ${firstUnansweredIndex >= 0 ? firstUnansweredIndex + 1 : 'All answered'}`);
      } else {
        console.log('❌ No template or questions found for this submission');
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.error('❌ Database query failed:', error);
  }
}

async function testApiEndpoints(token) {
  console.log('\n=== API Endpoints Testing ===');
  
  if (!token) {
    console.log('❌ No auth token available, skipping API tests');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test in-progress submissions endpoint
    console.log('\n--- Testing In-Progress Submissions Endpoint ---');
    const inProgressResponse = await axios.get(`${API_BASE_URL}/api/submissions/in-progress`, { headers });
    
    if (inProgressResponse.data && inProgressResponse.data.success) {
      console.log(`✅ Got ${inProgressResponse.data.data.length} in-progress submissions`);
      inProgressResponse.data.data.forEach(submission => {
        console.log(`  - ID: ${submission.id}, Name: ${submission.name}, Progress: ${submission.progress}%`);
      });
    } else {
      console.log('❌ Failed to get in-progress submissions');
    }
    
    // Test completed submissions endpoint
    console.log('\n--- Testing Completed Submissions Endpoint ---');
    const completedResponse = await axios.get(`${API_BASE_URL}/api/submissions/completed`, { headers });
    
    if (completedResponse.data && completedResponse.data.success) {
      console.log(`✅ Got ${completedResponse.data.data.length} completed submissions`);
      completedResponse.data.data.forEach(submission => {
        console.log(`  - ID: ${submission.id}, Name: ${submission.name}, Score: ${submission.score}`);
      });
    } else {
      console.log('❌ Failed to get completed submissions');
    }
    
    // Test getting a specific submission by ID
    const allSubmissions = await prisma.submission.findMany({
      select: { id: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 3
    });
    
    if (allSubmissions.length > 0) {
      const testSubmissionId = allSubmissions[0].id;
      console.log(`\n--- Testing Submission Detail Endpoint (ID: ${testSubmissionId}) ---`);
      
      const submissionResponse = await axios.get(`${API_BASE_URL}/api/submissions/${testSubmissionId}`, { headers });
      
      if (submissionResponse.data && submissionResponse.data.success) {
        const submission = submissionResponse.data.data;
        console.log(`✅ Got submission details:`);
        console.log(`  - ID: ${submission.id}`);
        console.log(`  - Status: ${submission.status}`);
        console.log(`  - User ID: ${submission.userId} (type: ${typeof submission.userId})`);
        console.log(`  - Template: ${submission.template?.name || 'Unknown'}`);
        console.log(`  - Questions: ${submission.template?.questions?.length || 0}`);
        console.log(`  - Answers: ${submission.Answer?.length || 0}`);
        
        // Check if answers match question IDs
        if (submission.Answer && submission.template?.questions) {
          console.log(`\n🔍 Answer-Question Matching Analysis:`);
          const questionIds = new Set(submission.template.questions.map(q => q.id));
          const answerQuestionIds = new Set(submission.Answer.map(a => a.questionId));
          
          console.log(`  - Question IDs in template: [${Array.from(questionIds).join(', ')}]`);
          console.log(`  - Question IDs in answers: [${Array.from(answerQuestionIds).join(', ')}]`);
          
          // Check for mismatches
          const unmatchedAnswers = [...answerQuestionIds].filter(id => !questionIds.has(id));
          const unansweredQuestions = [...questionIds].filter(id => !answerQuestionIds.has(id));
          
          if (unmatchedAnswers.length > 0) {
            console.log(`  ⚠️  Answers for non-existent questions: [${unmatchedAnswers.join(', ')}]`);
          }
          
          if (unansweredQuestions.length > 0) {
            console.log(`  ℹ️  Unanswered questions: [${unansweredQuestions.join(', ')}]`);
          }
          
          if (unmatchedAnswers.length === 0 && unansweredQuestions.length < questionIds.size) {
            console.log(`  ✅ Answer-question matching looks good`);
          }
        }
        
      } else {
        console.log('❌ Failed to get submission details');
      }
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

async function checkUserIdConsistency() {
  console.log('\n=== User ID Consistency Check ===');
  
  try {
    // Get all unique user IDs from submissions
    const userIds = await prisma.submission.findMany({
      select: {
        userId: true
      },
      distinct: ['userId']
    });
    
    console.log('Unique user IDs in submissions:');
    userIds.forEach(user => {
      console.log(`  - "${user.userId}" (type: ${typeof user.userId})`);
    });
    
    // Check if there are mixed types
    const stringIds = userIds.filter(u => typeof u.userId === 'string');
    const numberIds = userIds.filter(u => typeof u.userId === 'number');
    
    if (stringIds.length > 0 && numberIds.length > 0) {
      console.log('⚠️  Mixed user ID types detected:');
      console.log(`  - String IDs: ${stringIds.length}`);
      console.log(`  - Number IDs: ${numberIds.length}`);
      console.log('  This could cause issues with user ID matching');
    } else {
      console.log(`✅ Consistent user ID types (all ${typeof userIds[0]?.userId})`);
    }
    
  } catch (error) {
    console.error('❌ User ID consistency check failed:', error);
  }
}

async function main() {
  console.log('🔍 Questionnaire Progress Restoration Diagnostic Tool');
  console.log('==================================================');
  
  try {
    // Check database submissions
    await checkDatabaseSubmissions();
    
    // Check user ID consistency
    await checkUserIdConsistency();
    
    // Test API endpoints
    const token = await checkAuthToken();
    await testApiEndpoints(token);
    
    console.log('\n✅ Diagnostic completed');
    console.log('\n📋 Summary of potential issues to check:');
    console.log('1. Are answers being loaded correctly from the backend?');
    console.log('2. Do question IDs in answers match question IDs in templates?');
    console.log('3. Are user IDs consistent in type (string vs number)?');
    console.log('4. Is the progress calculation logic working correctly?');
    console.log('5. Are questions being sorted correctly by order?');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(console.error);
