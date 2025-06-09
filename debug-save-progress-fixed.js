const axios = require('axios');

// Function to test the save progress functionality
async function testSaveProgress() {
  try {
    console.log('Testing save progress functionality...');
    
    // Debug connection first
    try {
      const healthResponse = await axios.get('http://localhost:5000/health');
      console.log('API Gateway health check:', healthResponse.data);
    } catch (healthError) {
      console.warn('Health check failed, but continuing:', healthError.message);
    }
    
    // Bypass the login step for testing by directly accessing the questionnaire service
    // This is possible because the questionnaire service has BYPASS_AUTH=true in development
    console.log('Using direct access with bypass auth mode...');
    
    // Get in-progress submissions 
    const submissionsResponse = await axios.get(
      'http://localhost:5002/api/submissions/in-progress'
    );
    
    console.log('Submissions response:', submissionsResponse.data);
    
    if (!submissionsResponse.data.success || !submissionsResponse.data.data.length) {
      console.error('No in-progress submissions found:', submissionsResponse.data);
      return;
    }
    
    const submission = submissionsResponse.data.data[0];
    console.log(`Found submission ID: ${submission.id}`);
    
    // Get submission details to find questions
    const submissionDetailResponse = await axios.get(
      `http://localhost:5002/api/submissions/${submission.id}`
    );
    
    if (!submissionDetailResponse.data.success) {
      console.error('Failed to get submission details:', submissionDetailResponse.data);
      return;
    }
    
    const submissionData = submissionDetailResponse.data.data;
    
    // Create a test answer for the first question
    const firstQuestion = submissionData.template.questions[0];
    const testAnswers = [{
      questionId: firstQuestion.id,
      submissionId: submission.id,
      value: `Test answer ${new Date().toISOString()}`
    }];
    
    console.log('Attempting to save answers:', testAnswers);
    
    // Test the update submission endpoint
    try {
      const updateResponse = await axios.put(
        `http://localhost:5002/api/submissions/${submission.id}`,
        { answers: testAnswers },
        {
          headers: { 
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
          'http://localhost:5002/api/diagnostic/status'
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
