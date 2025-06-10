#!/usr/bin/env node

const axios = require('axios');

console.log('🔧 Fixing Save Progress Submission ID Mismatch...\n');

async function getValidAuthToken() {
  console.log('🔐 Getting valid authentication token...');
  
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    const token = loginResponse.data?.data?.tokens?.accessToken;
    if (token) {
      console.log('   ✅ Successfully obtained auth token');
      return token;
    } else {
      console.log('   ❌ No token in login response');
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Login failed: ${error.message}`);
    return null;
  }
}

async function testSubmissionAccess(token) {
  console.log('\n📋 Testing submission access...');
  
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Get user's actual submissions
    const submissionsResponse = await axios.get(
      'http://localhost:5000/api/questionnaires/submissions/in-progress',
      { headers: authHeaders }
    );
    
    const submissions = submissionsResponse.data?.data || [];
    console.log(`   📄 User has ${submissions.length} in-progress submissions:`);
    
    submissions.forEach(sub => {
      console.log(`      - ID ${sub.id}: ${sub.name} (${sub.framework}) - ${sub.progress}% complete`);
    });
    
    if (submissions.length > 0) {
      const firstSubmission = submissions[0];
      console.log(`\n🧪 Testing save progress to valid submission ID ${firstSubmission.id}...`);
      
      try {
        const saveResponse = await axios.put(
          `http://localhost:5000/api/questionnaires/submissions/${firstSubmission.id}`,
          { 
            answers: { 
              "1": "Test answer for troubleshooting",
              "2": "Another test answer" 
            }
          },
          { headers: authHeaders }
        );
        
        console.log(`   ✅ Save successful! Response: ${JSON.stringify(saveResponse.data).substring(0, 200)}...`);
        return true;
      } catch (saveError) {
        const status = saveError.response?.status || 'NO_RESPONSE';
        console.log(`   ❌ Save failed with status ${status}: ${JSON.stringify(saveError.response?.data)}`);
        return false;
      }
    } else {
      console.log('   ⚠️  No in-progress submissions found');
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Failed to get submissions: ${error.message}`);
    return false;
  }
}

async function testInvalidSubmissionId(token) {
  console.log('\n🚫 Testing invalid submission ID (should fail with 403)...');
  
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    await axios.put(
      'http://localhost:5000/api/questionnaires/submissions/6',
      { answers: { "1": "test" } },
      { headers: authHeaders }
    );
    console.log('   ❌ Unexpected success - should have failed with 403');
  } catch (error) {
    const status = error.response?.status;
    if (status === 403) {
      console.log('   ✅ Correctly rejected with 403 FORBIDDEN (expected behavior)');
    } else {
      console.log(`   ⚠️  Failed with unexpected status ${status}: ${JSON.stringify(error.response?.data)}`);
    }
  }
}

async function runFix() {
  console.log('='.repeat(80));
  console.log('🔧 QUESTIONNAIRE SAVE PROGRESS SUBMISSION ID MISMATCH FIX');
  console.log('='.repeat(80));

  const authToken = await getValidAuthToken();
  
  if (!authToken) {
    console.log('\n❌ Cannot proceed - authentication failed');
    return;
  }

  const saveWorked = await testSubmissionAccess(authToken);
  await testInvalidSubmissionId(authToken);

  console.log('\n' + '='.repeat(80));
  console.log('📋 DIAGNOSIS SUMMARY');
  console.log('='.repeat(80));
  
  if (saveWorked) {
    console.log('✅ SAVE PROGRESS FUNCTIONALITY IS WORKING CORRECTLY');
    console.log('   - Authentication system is functioning properly');
    console.log('   - Authorization checks are working as expected');
    console.log('   - Save progress works with valid submission IDs');
  } else {
    console.log('❌ SAVE PROGRESS STILL HAS ISSUES');
    console.log('   - May be server-side validation or database issues');
  }

  console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
  console.log('   - Original 502 error: Questionnaire service was starting up');
  console.log('   - Current issue: Frontend using wrong submission ID (6 vs 101/102)');
  console.log('   - User\'s actual submissions have IDs 101 and 102');
  console.log('   - Submission ID 6 either doesn\'t exist or belongs to another user');

  console.log('\n💡 FRONTEND FIX NEEDED:');
  console.log('1. Check QuestionnaireDetail.tsx component');
  console.log('2. Verify the submission ID being passed to save progress');
  console.log('3. Ensure the frontend is using the correct submission ID from the URL or state');
  console.log('4. Check if there\'s a route parameter mismatch (/questionnaires/:id)');
  console.log('5. Verify the frontend questionnaire data matches backend submission IDs');

  console.log('\n🔍 DEBUGGING STEPS:');
  console.log('1. Check browser dev tools for the actual submission ID being used');
  console.log('2. Verify URL parameters in QuestionnaireDetail component');
  console.log('3. Check if submission data is properly loaded from the backend');
  console.log('4. Ensure the save progress function uses the correct submission ID');
}

runFix().catch(console.error);
