const axios = require('axios');

async function testSubmissionEndpoint() {
  try {
    // Step 1: Login
    console.log('🔑 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    
    // Step 2: Get submission details directly
    console.log('\n📋 Testing submission endpoint...');
    const response = await axios.get('http://localhost:5000/api/questionnaires/submissions/4', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n📊 Full response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('\n🔍 Analysis:');
      console.log('- Status:', data.status);
      console.log('- Questions array exists:', !!data.questions);
      console.log('- Questions length:', data.questions?.length || 0);
      console.log('- Answers array exists:', !!data.answers);
      console.log('- Answers length:', data.answers?.length || 0);
      console.log('- Template exists:', !!data.template);
      console.log('- Template questions length:', data.template?.questions?.length || 0);
      
      if (data.questions && data.questions.length > 0) {
        console.log('- First question ID:', data.questions[0].id);
        console.log('- First question text:', data.questions[0].text?.substring(0, 50) + '...');
      }
      
      if (data.answers && data.answers.length > 0) {
        console.log('- First answer question ID:', data.answers[0].questionId);
        console.log('- First answer value:', data.answers[0].value);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSubmissionEndpoint();
