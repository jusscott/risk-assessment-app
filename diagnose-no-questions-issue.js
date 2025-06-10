#!/usr/bin/env node

/**
 * Comprehensive Diagnosis for "No Questions Found" Issue
 * 
 * This script diagnoses the recurring "No questions found" issue by:
 * 1. Testing the backend API responses directly
 * 2. Checking the data structure returned by getSubmissionById
 * 3. Identifying the mismatch between backend and frontend expectations
 */

const axios = require('axios');

async function getAuthToken() {
  try {
    console.log('🔐 Attempting login to get authentication token...');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    if (loginResponse.data && loginResponse.data.tokens && loginResponse.data.tokens.accessToken) {
      console.log('✅ Login successful, got access token');
      return loginResponse.data.tokens.accessToken;
    } else {
      throw new Error('Login response missing access token');
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testTemplateEndpoint(token) {
  try {
    console.log('\n📋 Testing templates endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/questionnaire/templates/1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.success) {
      console.log('✅ Template endpoint working');
      console.log(`📊 Template ID: ${response.data.data.id}`);
      console.log(`📝 Template Name: ${response.data.data.name}`);
      console.log(`🔢 Questions Count: ${response.data.data.questions?.length || 0}`);
      console.log(`📄 Total Questions: ${response.data.data.totalQuestions}`);
      
      if (response.data.data.questions && response.data.data.questions.length > 0) {
        console.log('✅ Template has questions available');
        console.log(`🎯 First question: "${response.data.data.questions[0].text.substring(0, 50)}..."`);
      } else {
        console.log('❌ Template has no questions');
      }
      
      return response.data.data;
    } else {
      throw new Error('Template endpoint returned unsuccessful response');
    }
  } catch (error) {
    console.error('❌ Template endpoint failed:', error.response?.data || error.message);
    return null;
  }
}

async function testSubmissionCreation(token, templateId) {
  try {
    console.log('\n🆕 Testing submission creation...');
    
    const response = await axios.post('http://localhost:5000/api/questionnaire/submissions', {
      templateId: templateId
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.success) {
      console.log('✅ Submission created successfully');
      console.log(`🆔 Submission ID: ${response.data.data.id}`);
      console.log(`🏷️ Template ID: ${response.data.data.templateId}`);
      console.log(`📊 Status: ${response.data.data.status}`);
      return response.data.data;
    } else {
      throw new Error('Submission creation returned unsuccessful response');
    }
  } catch (error) {
    console.error('❌ Submission creation failed:', error.response?.data || error.message);
    return null;
  }
}

async function testSubmissionById(token, submissionId) {
  try {
    console.log('\n🔍 Testing getSubmissionById endpoint...');
    
    const response = await axios.get(`http://localhost:5000/api/questionnaire/submissions/${submissionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.success) {
      console.log('✅ getSubmissionById endpoint working');
      
      const submission = response.data.data;
      console.log(`🆔 Submission ID: ${submission.id}`);
      console.log(`👤 User ID: ${submission.userId}`);
      console.log(`📊 Status: ${submission.status}`);
      
      // Critical: Check the data structure
      console.log('\n🔬 CRITICAL DATA STRUCTURE ANALYSIS:');
      console.log('📋 Checking template field availability:');
      console.log(`   - submission.template: ${submission.template ? 'EXISTS' : 'MISSING'}`);
      console.log(`   - submission.Template: ${submission.Template ? 'EXISTS' : 'MISSING'}`);
      
      if (submission.Template) {
        console.log('✅ Found Template (uppercase T)');
        console.log(`   - Template.id: ${submission.Template.id}`);
        console.log(`   - Template.name: ${submission.Template.name}`);
        console.log(`   - Template.questions: ${submission.Template.questions ? 'EXISTS' : 'MISSING'}`);
        console.log(`   - Template.Question: ${submission.Template.Question ? 'EXISTS' : 'MISSING'}`);
        
        if (submission.Template.Question) {
          console.log(`   - Template.Question.length: ${submission.Template.Question.length}`);
          console.log('✅ Found Questions (uppercase Q) array');
          
          if (submission.Template.Question.length > 0) {
            console.log(`🎯 First question: "${submission.Template.Question[0].text.substring(0, 50)}..."`);
          }
        }
        
        if (submission.Template.questions) {
          console.log(`   - Template.questions.length: ${submission.Template.questions.length}`);
          console.log('✅ Found questions (lowercase q) array');
        }
      }
      
      if (submission.template) {
        console.log('✅ Found template (lowercase t)');
        console.log(`   - template.questions: ${submission.template.questions ? 'EXISTS' : 'MISSING'}`);
        console.log(`   - template.Question: ${submission.template.Question ? 'EXISTS' : 'MISSING'}`);
      }
      
      // Check answers
      console.log('\n📝 Checking answers:');
      console.log(`   - submission.Answer: ${submission.Answer ? `EXISTS (${submission.Answer.length} answers)` : 'MISSING'}`);
      console.log(`   - submission.answers: ${submission.answers ? `EXISTS (${submission.answers.length} answers)` : 'MISSING'}`);
      
      return submission;
    } else {
      throw new Error('getSubmissionById returned unsuccessful response');
    }
  } catch (error) {
    console.error('❌ getSubmissionById failed:', error.response?.data || error.message);
    return null;
  }
}

async function diagnoseDataStructureMismatch(submission) {
  console.log('\n🔬 DIAGNOSING DATA STRUCTURE MISMATCH:');
  console.log('=====================================');
  
  console.log('🔍 FRONTEND EXPECTATIONS (from QuestionnaireDetail.tsx):');
  console.log('   - response.data.template (lowercase t)');
  console.log('   - template.questions (lowercase q)');
  
  console.log('\n🔍 BACKEND RESPONSE (from submission controller):');
  console.log('   - response.data.Template (uppercase T)');
  console.log('   - Template.Question (uppercase Q)');
  
  console.log('\n❗ MISMATCH IDENTIFIED:');
  if (submission.Template && !submission.template) {
    console.log('   ❌ Frontend looks for "template" but backend returns "Template"');
  }
  
  if (submission.Template && submission.Template.Question && !submission.Template.questions) {
    console.log('   ❌ Frontend looks for "questions" but backend returns "Question"');
  }
  
  console.log('\n💡 PROPOSED SOLUTION:');
  console.log('   1. Fix frontend to use "Template" instead of "template"');
  console.log('   2. Fix frontend to use "Question" instead of "questions"');
  console.log('   3. OR modify backend to transform data structure to match frontend expectations');
}

async function main() {
  console.log('🚀 Starting Comprehensive "No Questions Found" Diagnosis');
  console.log('========================================================');
  
  try {
    // Step 1: Get authentication token
    const token = await getAuthToken();
    
    // Step 2: Test template endpoint to ensure questions exist
    const template = await testTemplateEndpoint(token);
    if (!template) {
      console.log('❌ Cannot proceed - template endpoint failed');
      return;
    }
    
    // Step 3: Create a new submission
    const submission = await testSubmissionCreation(token, template.id);
    if (!submission) {
      console.log('❌ Cannot proceed - submission creation failed');
      return;
    }
    
    // Step 4: Test getSubmissionById to check data structure
    const retrievedSubmission = await testSubmissionById(token, submission.id);
    if (!retrievedSubmission) {
      console.log('❌ Cannot proceed - getSubmissionById failed');
      return;
    }
    
    // Step 5: Diagnose the data structure mismatch
    await diagnoseDataStructureMismatch(retrievedSubmission);
    
    console.log('\n✅ DIAGNOSIS COMPLETE');
    console.log('=====================');
    console.log('The "No questions found" issue is caused by a data structure mismatch');
    console.log('between the backend Prisma model naming and frontend expectations.');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

// Run the diagnosis
main().catch(console.error);
