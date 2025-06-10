#!/usr/bin/env node

/**
 * Test script to verify the questionnaire submission fix
 * This script tests the exact functionality that was failing with the 500 error
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testSubmissionFix() {
  console.log('🧪 Testing Questionnaire Submission Fix Verification');
  console.log('=====================================\n');

  try {
    // Step 1: Login to get authentication token
    console.log('1. 🔐 Logging in to get authentication token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'good@test.com',
      password: 'Password123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const accessToken = loginResponse.data.data.tokens.accessToken;
    console.log('   ✅ Login successful, token obtained');

    // Step 2: Get available templates first
    console.log('\n2. 📋 Getting available templates...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/questionnaires/templates`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!templatesResponse.data.success || templatesResponse.data.data.length === 0) {
      throw new Error('No templates available');
    }

    const templateId = templatesResponse.data.data[0].id;
    console.log(`   ✅ Found ${templatesResponse.data.data.length} templates, using template ID: ${templateId}`);

    // Step 3: Test submission creation (this was the failing endpoint)
    console.log('\n3. 🚀 Testing submission creation (previously failing with 500 error)...');
    const submissionResponse = await axios.post(`${API_BASE_URL}/questionnaires/submissions`, {
      templateId: templateId
    }, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!submissionResponse.data.success) {
      throw new Error(`Submission creation failed: ${submissionResponse.data.error?.message || 'Unknown error'}`);
    }

    const submissionId = submissionResponse.data.data.id;
    console.log(`   ✅ Submission created successfully! ID: ${submissionId}`);

    // Step 4: Verify submission exists
    console.log('\n4. 🔍 Verifying submission exists...');
    const getSubmissionResponse = await axios.get(`${API_BASE_URL}/questionnaires/submissions/${submissionId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!getSubmissionResponse.data.success) {
      throw new Error('Submission verification failed');
    }

    console.log(`   ✅ Submission verified: Status = ${getSubmissionResponse.data.data.status}`);

    // Step 5: Test in-progress submissions endpoint
    console.log('\n5. 📊 Testing in-progress submissions endpoint...');
    const inProgressResponse = await axios.get(`${API_BASE_URL}/questionnaires/submissions/in-progress`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!inProgressResponse.data.success) {
      throw new Error('In-progress submissions failed');
    }

    console.log(`   ✅ In-progress submissions: Found ${inProgressResponse.data.data.length} submissions`);

    // Final success message
    console.log('\n🎉 SUCCESS: All questionnaire submission functionality is working!');
    console.log('=====================================');
    console.log('✅ Login working');
    console.log('✅ Templates loading');
    console.log('✅ Submission creation working (500 error FIXED)');
    console.log('✅ Submission retrieval working');
    console.log('✅ In-progress submissions working');
    console.log('\n🔧 The Prisma schema fix has successfully resolved the submission creation error.');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error('=====================================');
    
    if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  }
}

// Run the test
testSubmissionFix().catch(console.error);
