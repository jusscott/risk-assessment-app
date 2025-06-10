const axios = require('axios');

async function diagnoseSaveProgressIssue() {
  console.log('🔍 SAVE PROGRESS DIAGNOSTIC TOOL');
  console.log('==================================\n');

  const API_BASE = 'http://localhost:5000/api';
  
  try {
    // Step 1: Login to get authentication token
    console.log('📝 Step 1: Logging in to get authentication token...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    if (loginResponse.data.success && loginResponse.data.data?.tokens?.accessToken) {
      console.log('✅ Login successful');
      const token = loginResponse.data.data.tokens.accessToken;
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Step 2: Get in-progress submissions
      console.log('\n📋 Step 2: Getting in-progress submissions...');
      const submissionsResponse = await axios.get(`${API_BASE}/questionnaires/submissions/in-progress`, {
        headers: authHeaders
      });
      
      if (submissionsResponse.data.success && submissionsResponse.data.data.length > 0) {
        console.log(`✅ Found ${submissionsResponse.data.data.length} in-progress submissions`);
        console.log('In-progress submissions:', JSON.stringify(submissionsResponse.data.data, null, 2));
        
        // Use the first in-progress submission for testing
        const testSubmission = submissionsResponse.data.data[0];
        console.log(`\n🎯 Using submission ID ${testSubmission.id} for testing save progress`);
        
        // Step 3: Get submission details
        console.log('\n📄 Step 3: Getting submission details...');
        const submissionDetailResponse = await axios.get(`${API_BASE}/questionnaires/submissions/${testSubmission.id}`, {
          headers: authHeaders
        });
        
        if (submissionDetailResponse.data.success) {
          console.log('✅ Got submission details successfully');
          const submission = submissionDetailResponse.data.data;
          console.log(`Submission status: ${submission.status}`);
          console.log(`Template: ${submission.template?.name}`);
          console.log(`Current answers: ${submission.Answer?.length || 0}`);
          console.log(`Available questions: ${submission.template?.questions?.length || 0}`);
          
          // Step 4: Test save progress with mock answer data
          console.log('\n💾 Step 4: Testing save progress functionality...');
          
          // Create test answers based on available questions
          let testAnswers = [];
          if (submission.template?.questions && submission.template.questions.length > 0) {
            // Get first few questions for testing
            const testQuestions = submission.template.questions.slice(0, 3);
            testAnswers = testQuestions.map(question => ({
              questionId: question.id,
              submissionId: submission.id,
              value: question.type === 'radio' ? (question.options?.[0] || 'Yes') : 'Test answer for diagnostics'
            }));
          } else {
            // Fallback mock answers if no questions found
            testAnswers = [
              {
                questionId: 1,
                submissionId: submission.id,
                value: 'Test diagnostic answer 1'
              },
              {
                questionId: 2,
                submissionId: submission.id,
                value: 'Test diagnostic answer 2'
              }
            ];
          }
          
          console.log('Test answers to save:', JSON.stringify(testAnswers, null, 2));
          
          // Attempt to save progress
          try {
            const saveResponse = await axios.put(`${API_BASE}/questionnaires/submissions/${testSubmission.id}`, {
              answers: testAnswers
            }, {
              headers: authHeaders
            });
            
            if (saveResponse.data.success) {
              console.log('✅ SAVE PROGRESS SUCCESSFUL!');
              console.log('Response:', JSON.stringify(saveResponse.data, null, 2));
              
              // Step 5: Verify the save by getting submission details again
              console.log('\n🔍 Step 5: Verifying saved answers...');
              const verifyResponse = await axios.get(`${API_BASE}/questionnaires/submissions/${testSubmission.id}`, {
                headers: authHeaders
              });
              
              if (verifyResponse.data.success) {
                const updatedSubmission = verifyResponse.data.data;
                console.log(`✅ Verification successful - now has ${updatedSubmission.Answer?.length || 0} answers`);
                
                if (updatedSubmission.Answer && updatedSubmission.Answer.length > 0) {
                  console.log('Saved answers:');
                  updatedSubmission.Answer.forEach((answer, index) => {
                    console.log(`  ${index + 1}. Question ${answer.questionId}: "${answer.value}"`);
                  });
                }
              } else {
                console.log('❌ Failed to verify saved answers');
                console.log('Verification response:', JSON.stringify(verifyResponse.data, null, 2));
              }
            } else {
              console.log('❌ SAVE PROGRESS FAILED!');
              console.log('Response:', JSON.stringify(saveResponse.data, null, 2));
            }
          } catch (saveError) {
            console.log('❌ SAVE PROGRESS ERROR!');
            console.log('Status:', saveError.response?.status);
            console.log('Status Text:', saveError.response?.statusText);
            console.log('Error Data:', JSON.stringify(saveError.response?.data, null, 2));
            console.log('Full Error:', saveError.message);
            
            // Additional debugging for specific error codes
            if (saveError.response?.status === 401) {
              console.log('\n🚨 AUTHENTICATION ERROR - Token might be expired or invalid');
              console.log('Token being used:', token.substring(0, 50) + '...');
            } else if (saveError.response?.status === 403) {
              console.log('\n🚨 AUTHORIZATION ERROR - User might not own this submission');
            } else if (saveError.response?.status === 404) {
              console.log('\n🚨 NOT FOUND ERROR - Submission might not exist');
            } else if (saveError.response?.status === 400) {
              console.log('\n🚨 BAD REQUEST ERROR - Data format might be incorrect');
            } else if (saveError.response?.status >= 500) {
              console.log('\n🚨 SERVER ERROR - Backend issue detected');
            }
          }
        } else {
          console.log('❌ Failed to get submission details');
          console.log('Response:', JSON.stringify(submissionDetailResponse.data, null, 2));
        }
      } else if (submissionsResponse.data.success && submissionsResponse.data.data.length === 0) {
        console.log('⚠️  No in-progress submissions found. Creating a new submission for testing...');
        
        // Step 2.5: Get available templates
        console.log('\n📚 Step 2.5: Getting available templates...');
        const templatesResponse = await axios.get(`${API_BASE}/questionnaires/templates`, {
          headers: authHeaders
        });
        
        if (templatesResponse.data.success && templatesResponse.data.data.length > 0) {
          console.log(`✅ Found ${templatesResponse.data.data.length} templates`);
          const firstTemplate = templatesResponse.data.data[0];
          console.log(`Using template: ${firstTemplate.name} (ID: ${firstTemplate.id})`);
          
          // Create a new submission
          console.log('\n🆕 Creating new submission for testing...');
          const createResponse = await axios.post(`${API_BASE}/questionnaires/submissions`, {
            templateId: firstTemplate.id
          }, {
            headers: authHeaders
          });
          
          if (createResponse.data.success) {
            console.log('✅ New submission created successfully');
            const newSubmission = createResponse.data.data;
            console.log('New submission ID:', newSubmission.id);
            
            // Continue with save progress test using the new submission
            console.log('\n💾 Testing save progress with new submission...');
            const testAnswers = [
              {
                questionId: 1,
                submissionId: newSubmission.id,
                value: 'Test answer for new submission'
              }
            ];
            
            try {
              const saveResponse = await axios.put(`${API_BASE}/questionnaires/submissions/${newSubmission.id}`, {
                answers: testAnswers
              }, {
                headers: authHeaders
              });
              
              if (saveResponse.data.success) {
                console.log('✅ SAVE PROGRESS SUCCESSFUL with new submission!');
                console.log('Response:', JSON.stringify(saveResponse.data, null, 2));
              } else {
                console.log('❌ SAVE PROGRESS FAILED with new submission!');
                console.log('Response:', JSON.stringify(saveResponse.data, null, 2));
              }
            } catch (saveError) {
              console.log('❌ SAVE PROGRESS ERROR with new submission!');
              console.log('Status:', saveError.response?.status);
              console.log('Error Data:', JSON.stringify(saveError.response?.data, null, 2));
            }
          } else {
            console.log('❌ Failed to create new submission');
            console.log('Response:', JSON.stringify(createResponse.data, null, 2));
          }
        } else {
          console.log('❌ No templates available for creating test submission');
        }
      } else {
        console.log('❌ Failed to get in-progress submissions');
        console.log('Response:', JSON.stringify(submissionsResponse.data, null, 2));
      }
    } else {
      console.log('❌ Login failed');
      console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
    }
  } catch (error) {
    console.log('❌ DIAGNOSTIC ERROR:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Full Error:', error.message);
  }
  
  console.log('\n🏁 DIAGNOSTIC COMPLETE');
  console.log('====================');
}

// Run the diagnostic
diagnoseSaveProgressIssue().catch(console.error);
