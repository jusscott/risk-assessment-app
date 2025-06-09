const axios = require('axios');

// Function to test the save progress functionality
async function testSaveProgress() {
  try {
    console.log('Testing save progress functionality...');
    
    // 1. Get a valid token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.error('Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('Authentication successful');
    
    // 2. Get in-progress submissions to find one to update
    const submissionsResponse = await axios.get(
      'http://localhost:5000/api/questionnaires/submissions/in-progress',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    if (!submissionsResponse.data.success || !submissionsResponse.data.data.length) {
      console.error('No in-progress submissions found:', submissionsResponse.data);
      return;
    }
    
    const submission = submissionsResponse.data.data[0];
    console.log(`Found submission ID: ${submission.id}`);
    
    // 3. Get submission details to find questions
    const submissionDetailResponse = await axios.get(
      `http://localhost:5000/api/questionnaires/submissions/${submission.id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    if (!submissionDetailResponse.data.success) {
      console.error('Failed to get submission details:', submissionDetailResponse.data);
      return;
    }
    
    const submissionData = submissionDetailResponse.data.data;
    
    // 4. Create a test answer for the first question
    const firstQuestion = submissionData.template.questions[0];
    const testAnswers = [{
      questionId: firstQuestion.id,
      submissionId: submission.id,
      value: `Test answer ${new Date().toISOString()}`
    }];
    
    console.log('Attempting to save answers:', testAnswers);
    
    // 5. Test the update submission endpoint
    try {
      const updateResponse = await axios.put(
        `http://localhost:5000/api/questionnaires/submissions/${submission.id}`,
        { answers: testAnswers },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Save progress response:', updateResponse.data);
    } catch (updateError) {
      console.error('Error details:', updateError.response ? {
        status: updateError.response.status,
        statusText: updateError.response.statusText,
        data: updateError.response.data
      } : updateError.message);
      
      // Try diagnosing the issue
      console.log('\nAttempting to diagnose the issue...');
      try {
        const diagnosticResponse = await axios.get(
          'http://localhost:5000/api/questionnaires/diagnostic/status',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log('Diagnostic response:', diagnosticResponse.data);
      } catch (diagError) {
        console.error('Diagnostic endpoint failed:', diagError.message);
      }
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSaveProgress();
