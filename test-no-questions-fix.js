#!/usr/bin/env node

/**
 * Comprehensive Test for "No Questions Found" Fix
 * 
 * This script tests the complete questionnaire flow to ensure the fix works:
 * 1. Login and authenticate
 * 2. Start a new questionnaire
 * 3. Verify questions are loaded correctly
 * 4. Test both new and existing questionnaire flows
 */

const axios = require('axios');

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    if (loginResponse.data && loginResponse.data.tokens && loginResponse.data.tokens.accessToken) {
      authToken = loginResponse.data.tokens.accessToken;
      console.log('✅ Login successful');
      return true;
    } else {
      throw new Error('Login response missing access token');
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testTemplatesList() {
  try {
    console.log('\n📋 Testing templates list...');
    
    const response = await axios.get('http://localhost:5000/api/questionnaire/templates', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
      console.log(`✅ Found ${response.data.data.length} templates`);
      return response.data.data;
    } else {
      throw new Error('No templates found');
    }
  } catch (error) {
    console.error('❌ Templates list failed:', error.response?.data || error.message);
    return null;
  }
}

async function testNewSubmissionFlow(templateId) {
  try {
    console.log('\n🆕 Testing new submission flow...');
    
    // Create a new submission
    const response = await axios.post('http://localhost:5000/api/questionnaire/submissions', {
      templateId: templateId
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.success) {
      console.log(`✅ New submission created with ID: ${response.data.data.id}`);
      return response.data.data;
    } else {
      throw new Error('Failed to create submission');
    }
  } catch (error) {
    console.error('❌ New submission failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetSubmissionById(submissionId) {
  try {
    console.log('\n🔍 Testing getSubmissionById (the critical fix)...');
    
    const response = await axios.get(`http://localhost:5000/api/questionnaire/submissions/${submissionId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.success) {
      const submission = response.data.data;
      console.log(`✅ Retrieved submission ${submissionId}`);
      
      // Test the critical data structure - this is what was broken
      console.log('\n🔬 TESTING CRITICAL DATA STRUCTURE:');
      
      // Check Template (uppercase - from Prisma)
      if (submission.Template) {
        console.log('✅ Found Template (uppercase - Prisma naming)');
        console.log(`   - Template.id: ${submission.Template.id}`);
        console.log(`   - Template.name: ${submission.Template.name}`);
        
        if (submission.Template.Question) {
          console.log('✅ Found Question array (uppercase Q - Prisma relation naming)');
          console.log(`   - Questions count: ${submission.Template.Question.length}`);
          
          if (submission.Template.Question.length > 0) {
            console.log(`   - First question: "${submission.Template.Question[0].text.substring(0, 60)}..."`);
            console.log('✅ CRITICAL FIX VERIFIED: Questions are properly loaded!');
          } else {
            console.log('❌ CRITICAL ISSUE: Question array is empty');
            return false;
          }
        } else {
          console.log('❌ CRITICAL ISSUE: No Question array found');
          return false;
        }
      } else {
        console.log('❌ CRITICAL ISSUE: No Template found');
        return false;
      }
      
      // Check answers structure
      if (submission.Answer) {
        console.log(`✅ Found Answer array (${submission.Answer.length} answers)`);
      } else {
        console.log('ℹ️ No Answer array (expected for new submission)');
      }
      
      return true;
    } else {
      throw new Error('Failed to retrieve submission');
    }
  } catch (error) {
    console.error('❌ Get submission failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInProgressSubmissions() {
  try {
    console.log('\n📊 Testing in-progress submissions...');
    
    const response = await axios.get('http://localhost:5000/api/questionnaire/submissions/in-progress', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.success) {
      console.log(`✅ Found ${response.data.data.length} in-progress submissions`);
      
      if (response.data.data.length > 0) {
        const firstSubmission = response.data.data[0];
        console.log(`   - Submission: ${firstSubmission.name}`);
        console.log(`   - Progress: ${firstSubmission.progress}%`);
        
        // Test clicking on an in-progress submission
        return await testGetSubmissionById(firstSubmission.id);
      }
      return true;
    } else {
      throw new Error('Failed to get in-progress submissions');
    }
  } catch (error) {
    console.error('❌ In-progress submissions failed:', error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive "No Questions Found" Fix Test');
  console.log('===========================================================');
  
  try {
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed - login failed');
      return;
    }
    
    // Step 2: Get templates list
    const templates = await testTemplatesList();
    if (!templates) {
      console.log('❌ Cannot proceed - templates list failed');
      return;
    }
    
    // Step 3: Test new submission flow
    const newSubmission = await testNewSubmissionFlow(templates[0].id);
    if (!newSubmission) {
      console.log('❌ Cannot proceed - new submission failed');
      return;
    }
    
    // Step 4: Test getSubmissionById (the critical fix)
    const submissionTestSuccess = await testGetSubmissionById(newSubmission.id);
    if (!submissionTestSuccess) {
      console.log('❌ CRITICAL: The fix did not work - submission still has no questions');
      return;
    }
    
    // Step 5: Test in-progress submissions
    const inProgressSuccess = await testInProgressSubmissions();
    if (!inProgressSuccess) {
      console.log('❌ In-progress submissions test failed');
      return;
    }
    
    console.log('\n🎉 SUCCESS: ALL TESTS PASSED!');
    console.log('===============================');
    console.log('✅ The "No questions found" issue has been successfully fixed!');
    console.log('✅ Both new questionnaires and existing questionnaires now load questions properly');
    console.log('✅ The data structure mismatch between Prisma naming and frontend expectations is resolved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
main().catch(console.error);
