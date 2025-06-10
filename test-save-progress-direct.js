const axios = require('axios');

async function testSaveProgressDirect() {
  console.log('🔍 TESTING SAVE PROGRESS DIRECTLY TO QUESTIONNAIRE SERVICE');
  console.log('=============================================================\n');

  try {
    // Step 1: Login to get authentication token
    console.log('📝 Step 1: Logging in to get authentication token...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    if (loginResponse.data.success && loginResponse.data.data?.tokens?.accessToken) {
      console.log('✅ Login successful');
      const token = loginResponse.data.data.tokens.accessToken;
      
      // Step 2: Test save progress directly to questionnaire service (bypassing API Gateway)
      console.log('\n💾 Step 2: Testing save progress directly to questionnaire service...');
      
      const testAnswers = [
        {
          questionId: 1,
          submissionId: 3,
          value: 'Direct test answer 1'
        },
        {
          questionId: 2,
          submissionId: 3,
          value: 'Direct test answer 2'
        }
      ];
      
      console.log('Test answers to save:', JSON.stringify(testAnswers, null, 2));
      
      try {
        const saveResponse = await axios.put('http://localhost:5002/api/submissions/3', {
          answers: testAnswers
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (saveResponse.data.success) {
          console.log('✅ DIRECT SAVE PROGRESS SUCCESSFUL!');
          console.log('Response:', JSON.stringify(saveResponse.data, null, 2));
          
          // Step 3: Test through API Gateway
          console.log('\n🌐 Step 3: Testing save progress through API Gateway...');
          
          const gatewayTestAnswers = [
            {
              questionId: 4,
              submissionId: 3,
              value: 'Gateway test answer'
            }
          ];
          
          try {
            const gatewaySaveResponse = await axios.put('http://localhost:5000/api/questionnaires/submissions/3', {
              answers: gatewayTestAnswers
            }, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (gatewaySaveResponse.data.success) {
              console.log('✅ GATEWAY SAVE PROGRESS SUCCESSFUL!');
              console.log('Response:', JSON.stringify(gatewaySaveResponse.data, null, 2));
            } else {
              console.log('❌ GATEWAY SAVE PROGRESS FAILED!');
              console.log('Response:', JSON.stringify(gatewaySaveResponse.data, null, 2));
            }
          } catch (gatewayError) {
            console.log('❌ GATEWAY SAVE PROGRESS ERROR!');
            console.log('Status:', gatewayError.response?.status);
            console.log('Status Text:', gatewayError.response?.statusText);
            console.log('Error Data:', JSON.stringify(gatewayError.response?.data, null, 2));
            console.log('Full Error:', gatewayError.message);
          }
        } else {
          console.log('❌ DIRECT SAVE PROGRESS FAILED!');
          console.log('Response:', JSON.stringify(saveResponse.data, null, 2));
        }
      } catch (saveError) {
        console.log('❌ DIRECT SAVE PROGRESS ERROR!');
        console.log('Status:', saveError.response?.status);
        console.log('Status Text:', saveError.response?.statusText);
        console.log('Error Data:', JSON.stringify(saveError.response?.data, null, 2));
        console.log('Full Error:', saveError.message);
      }
    } else {
      console.log('❌ Login failed');
      console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
    }
  } catch (error) {
    console.log('❌ TEST ERROR:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Full Error:', error.message);
  }
  
  console.log('\n🏁 TEST COMPLETE');
  console.log('================');
}

// Run the test
testSaveProgressDirect().catch(console.error);
