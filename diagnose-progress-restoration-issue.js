const axios = require('axios');

async function diagnoseProgressRestorationIssue() {
  console.log('🔍 DIAGNOSING PROGRESS RESTORATION ISSUE');
  console.log('========================================\n');

  try {
    // Step 1: Login to get authentication token
    console.log('📝 Step 1: Logging in to get authentication token...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'good@test.com',
      password: 'Password123'
    });
    
    if (!loginResponse.data.success || !loginResponse.data.data?.tokens?.accessToken) {
      console.log('❌ Login failed');
      console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }
    
    console.log('✅ Login successful');
    const token = loginResponse.data.data.tokens.accessToken;
    
    // Step 2: Check in-progress submissions
    console.log('\n📋 Step 2: Getting in-progress submissions...');
    const inProgressResponse = await axios.get('http://localhost:5000/api/questionnaires/submissions/in-progress', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!inProgressResponse.data.success || !inProgressResponse.data.data || inProgressResponse.data.data.length === 0) {
      console.log('⚠️  No in-progress submissions found');
      console.log('Response:', JSON.stringify(inProgressResponse.data, null, 2));
      return;
    }
    
    console.log('✅ Found in-progress submissions');
    const submissions = inProgressResponse.data.data;
    console.log('In-progress submissions:', JSON.stringify(submissions, null, 2));
    
    // Step 3: Get detailed submission data
    for (const submission of submissions) {
      console.log(`\n🔍 Step 3: Analyzing submission ${submission.id} (${submission.name})...`);
      
      try {
        const detailResponse = await axios.get(`http://localhost:5000/api/questionnaires/submissions/${submission.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (detailResponse.data.success) {
          const details = detailResponse.data.data;
          console.log('✅ Retrieved submission details');
          console.log('Submission status:', details.status);
          console.log('Total questions:', details.questions?.length || 0);
          console.log('Current answers:', details.answers?.length || 0);
          console.log('Progress reported:', submission.progress);
          
          // Log the full structure for debugging
          console.log('\n🔍 Full response structure:');
          console.log('- details.Template:', details.Template ? 'exists' : 'missing');
          console.log('- details.template:', details.template ? 'exists' : 'missing');
          console.log('- details.questions:', details.questions ? `array of ${details.questions.length}` : 'missing');
          console.log('- details.answers:', details.answers ? `array of ${details.answers.length}` : 'missing');
          console.log('- details.Answer:', details.Answer ? `array of ${details.Answer.length}` : 'missing');
          
          // Analyze the answers data structure
          if (details.answers && details.answers.length > 0) {
            console.log('\n📊 Answer details:');
            details.answers.forEach((answer, index) => {
              console.log(`  Answer ${index + 1}: Q${answer.questionId} = "${answer.value}"`);
            });
            
            // Check if answers match questions
            if (details.questions) {
              console.log('\n🔍 Checking answer-question alignment:');
              const answeredQuestionIds = details.answers.map(a => a.questionId);
              const allQuestionIds = details.questions.map(q => q.id);
              
              console.log('Answered question IDs:', answeredQuestionIds);
              console.log('All question IDs:', allQuestionIds.slice(0, 10), '...'); // Show first 10
              
              // Check if answered questions are in proper sequence
              const sortedAnsweredIds = [...answeredQuestionIds].sort((a, b) => a - b);
              const expectedSequence = allQuestionIds.slice(0, answeredQuestionIds.length);
              
              console.log('Expected sequence:', expectedSequence);
              console.log('Actual answered sequence:', sortedAnsweredIds);
              
              if (JSON.stringify(sortedAnsweredIds) === JSON.stringify(expectedSequence)) {
                console.log('✅ Answer sequence matches expected progression');
              } else {
                console.log('⚠️  Answer sequence does NOT match expected progression');
              }
            }
          } else {
            console.log('⚠️  No answers found in submission details');
          }
          
          // Check progress calculation
          if (details.questions && details.answers) {
            const expectedProgress = Math.round((details.answers.length / details.questions.length) * 100);
            console.log(`\n📊 Progress calculation:`);
            console.log(`  Questions answered: ${details.answers.length}`);
            console.log(`  Total questions: ${details.questions.length}`);
            console.log(`  Expected progress: ${expectedProgress}%`);
            console.log(`  Reported progress: ${submission.progress}%`);
            
            if (expectedProgress === submission.progress) {
              console.log('✅ Progress calculation is correct');
            } else {
              console.log('⚠️  Progress calculation mismatch');
            }
          }
          
        } else {
          console.log('❌ Failed to retrieve submission details');
          console.log('Response:', JSON.stringify(detailResponse.data, null, 2));
        }
      } catch (error) {
        console.log('❌ Error retrieving submission details:', error.message);
        if (error.response) {
          console.log('Error response:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }
    
    console.log('\n🏁 DIAGNOSIS COMPLETE');
    console.log('=====================');
    
  } catch (error) {
    console.log('❌ Diagnostic error:', error.message);
    if (error.response) {
      console.log('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the diagnostic
diagnoseProgressRestorationIssue().catch(console.error);
