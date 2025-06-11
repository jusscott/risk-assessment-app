const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function diagnoseAnswerSavingError() {
  console.log('🔍 DIAGNOSING ANSWER SAVING ERROR IN IN-PROGRESS QUESTIONNAIRES');
  console.log('================================================================');
  
  try {
    // Step 1: Login to get authentication token
    console.log('\n1️⃣ Testing Authentication...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    if (loginResponse.status === 200 && loginResponse.data.success && loginResponse.data.data?.tokens?.accessToken) {
      console.log('✅ Authentication successful');
      console.log('Token type:', typeof loginResponse.data.data.tokens.accessToken);
    } else {
      console.log('❌ Authentication failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.tokens.accessToken;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Get in-progress submissions to find one to test with
    console.log('\n2️⃣ Fetching In-Progress Submissions...');
    const inProgressResponse = await axios.get(`${API_BASE_URL}/questionnaires/submissions/in-progress`, {
      headers: authHeaders
    });
    
    console.log('In-progress submissions response status:', inProgressResponse.status);
    console.log('In-progress submissions response data:', JSON.stringify(inProgressResponse.data, null, 2));
    
    if (!inProgressResponse.data?.success || !inProgressResponse.data?.data || inProgressResponse.data.data.length === 0) {
      console.log('ℹ️ No in-progress submissions found. Creating a new one...');
      
      // Get available templates first
      const templatesResponse = await axios.get(`${API_BASE_URL}/questionnaires/templates`, {
        headers: authHeaders
      });
      
      console.log('Templates response status:', templatesResponse.status);
      console.log('Templates response data:', JSON.stringify(templatesResponse.data, null, 2));
      
      if (templatesResponse.data?.success && templatesResponse.data?.data?.length > 0) {
        const templateId = templatesResponse.data.data[0].id;
        console.log('📝 Creating new submission with template ID:', templateId);
        
        // Start a new submission
        const newSubmissionResponse = await axios.post(`${API_BASE_URL}/questionnaires/submissions/start`, {
          templateId: templateId
        }, {
          headers: authHeaders
        });
        
        console.log('New submission response status:', newSubmissionResponse.status);
        console.log('New submission response data:', JSON.stringify(newSubmissionResponse.data, null, 2));
        
        if (newSubmissionResponse.status === 200 || newSubmissionResponse.status === 201) {
          console.log('✅ New submission created');
          inProgressResponse.data = [newSubmissionResponse.data];
        } else {
          console.log('❌ Failed to create new submission');
          return;
        }
      } else {
        console.log('❌ No templates available or templates data structure unexpected');
        console.log('Available templates data:', templatesResponse.data);
        return;
      }
    }
    
    const testSubmission = inProgressResponse.data.data[0];
    console.log('🎯 Testing with submission ID:', testSubmission.id);
    
    // Step 3: Get the submission details to understand its structure
    console.log('\n3️⃣ Fetching Submission Details...');
    const submissionResponse = await axios.get(`${API_BASE_URL}/questionnaires/submissions/${testSubmission.id}`, {
      headers: authHeaders
    });
    
    console.log('Submission details response status:', submissionResponse.status);
    console.log('Full submission response:', JSON.stringify(submissionResponse.data, null, 2));
    
    const submission = submissionResponse.data.data;
    console.log('Submission data structure:');
    console.log('- ID:', submission.id);
    console.log('- Status:', submission.status);
    console.log('- Template ID:', submission.Template?.id || submission.templateId);
    console.log('- Questions available:', submission.Template?.Question?.length || submission.Template?.questions?.length || 'N/A');
    console.log('- Existing answers:', submission.Answer?.length || submission.answers?.length || 0);
    
    // Step 4: Attempt to save some test answers
    console.log('\n4️⃣ Testing Answer Saving...');
    
    // Get the first question ID to test with
    const questions = submission.Template?.Question || submission.Template?.questions || [];
    if (questions.length === 0) {
      console.log('❌ No questions found in submission template');
      return;
    }
    
    const firstQuestionId = questions[0].id;
    console.log('🎯 Testing with question ID:', firstQuestionId);
    
    // Prepare test answers in the expected format
    const testAnswers = [
      {
        questionId: firstQuestionId,
        submissionId: testSubmission.id,
        value: "Test answer for diagnostic purposes"
      }
    ];
    
    console.log('📤 Sending save request with data:', JSON.stringify(testAnswers, null, 2));
    
    try {
      const saveResponse = await axios.put(`${API_BASE_URL}/questionnaires/submissions/${testSubmission.id}`, testAnswers, {
        headers: authHeaders
      });
      
      console.log('✅ Save successful!');
      console.log('Response status:', saveResponse.status);
      console.log('Response data:', saveResponse.data);
      
    } catch (saveError) {
      console.log('❌ SAVE ERROR DETECTED:');
      console.log('Status:', saveError.response?.status);
      console.log('Status Text:', saveError.response?.statusText);
      console.log('Error Message:', saveError.message);
      console.log('Response Headers:', saveError.response?.headers);
      console.log('Response Data:', JSON.stringify(saveError.response?.data, null, 2));
      
      // Check if it's an authentication issue
      if (saveError.response?.status === 401) {
        console.log('🔐 Authentication issue detected');
        
        // Test token validation
        try {
          const tokenValidation = await axios.get(`${API_BASE_URL}/auth/validate-token`, {
            headers: authHeaders
          });
          console.log('Token validation result:', tokenValidation.data);
        } catch (tokenError) {
          console.log('Token validation failed:', tokenError.response?.data);
        }
      }
      
      // Check if it's a data format issue
      if (saveError.response?.status === 400) {
        console.log('📋 Bad request - checking data format issues');
        console.log('Expected format: Array of { questionId, submissionId, value }');
        console.log('Sent format:', typeof testAnswers, Array.isArray(testAnswers));
      }
      
      // Check if it's a server error
      if (saveError.response?.status >= 500) {
        console.log('🚨 Server error - checking service logs');
        console.log('This might be a backend issue in the questionnaire service');
      }
    }
    
    // Step 5: Test direct backend endpoint if frontend wrapper fails
    console.log('\n5️⃣ Testing Alternative Save Formats...');
    
    // Try with different data structures that might be expected
    const alternativeFormats = [
      // Format 1: Just the answers array
      testAnswers,
      // Format 2: Wrapped in answers property
      { answers: testAnswers },
      // Format 3: Individual answer properties
      {
        questionId: firstQuestionId,
        submissionId: testSubmission.id,
        value: "Alternative format test"
      }
    ];
    
    for (let i = 0; i < alternativeFormats.length; i++) {
      console.log(`\n📝 Testing format ${i + 1}:`, JSON.stringify(alternativeFormats[i], null, 2));
      
      try {
        const altResponse = await axios.put(`${API_BASE_URL}/questionnaires/submissions/${testSubmission.id}`, alternativeFormats[i], {
          headers: authHeaders
        });
        
        console.log(`✅ Format ${i + 1} successful!`);
        console.log('Response:', altResponse.data);
        break;
        
      } catch (altError) {
        console.log(`❌ Format ${i + 1} failed:`, altError.response?.status, altError.response?.data?.message || altError.message);
      }
    }
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR during diagnosis:');
    console.error('Message:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Stack:', error.stack);
  }
}

// Run the diagnosis
diagnoseAnswerSavingError().then(() => {
  console.log('\n✅ Diagnosis complete');
}).catch(error => {
  console.error('❌ Diagnosis failed:', error.message);
});
