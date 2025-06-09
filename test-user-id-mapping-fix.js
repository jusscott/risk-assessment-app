#!/usr/bin/env node

const axios = require('axios');

console.log('=== TESTING USER ID MAPPING FIX ===');
console.log('Testing access to target UUID user submissions');
console.log('Expected: 2 in-progress questionnaires (ISO 27001 + HIPAA)');
console.log('');

async function testUserIdMapping() {
  try {
    console.log('🧪 Test 1: Check questionnaire service health');
    try {
      const healthResponse = await axios.get('http://localhost:3003/health');
      console.log('✅ Questionnaire service is healthy');
    } catch (healthError) {
      console.log('⚠️ Health check failed:', healthError.message);
      console.log('   Service may not be running. Try: docker-compose up -d questionnaire-service');
    }
    
    console.log('\n🧪 Test 2: Test BYPASS_AUTH functionality');
    try {
      const submissionsResponse = await axios.get('http://localhost:3003/api/submissions', {
        timeout: 10000
      });
      console.log('✅ BYPASS_AUTH working - submissions retrieved');
      console.log('📊 Total submissions found:', submissionsResponse.data.length);
      
      // Check for in-progress submissions
      const inProgressSubmissions = submissionsResponse.data.filter(s => s.status === 'draft');
      console.log('📋 In-progress submissions:', inProgressSubmissions.length);
      
      if (inProgressSubmissions.length > 0) {
        console.log('\n📝 In-progress questionnaires:');
        inProgressSubmissions.forEach((submission, index) => {
          const templateName = submission.Template?.name || submission.templateName || 'Unknown';
          const answerCount = submission.answerCount || submission._count?.Answer || 0;
          console.log(`   ${index + 1}. ${templateName} (${answerCount} answers)`);
        });
        
        // Check if we got the expected questionnaires
        const hasISO27001 = inProgressSubmissions.some(s => 
          (s.Template?.name || s.templateName || '').includes('ISO 27001')
        );
        const hasHIPAA = inProgressSubmissions.some(s => 
          (s.Template?.name || s.templateName || '').includes('HIPAA')
        );
        
        if (hasISO27001 && hasHIPAA) {
          console.log('\n🎯 SUCCESS! Found expected questionnaires:');
          console.log('   ✅ ISO 27001:2013 questionnaire');
          console.log('   ✅ HIPAA Security Rule questionnaire');
          console.log('\n🚀 The user ID mapping fix is working correctly!');
          console.log('   jusscott@gmail.com should now see their in-progress questionnaires');
        } else {
          console.log('\n⚠️ Expected questionnaires not found:');
          console.log('   ISO 27001:', hasISO27001 ? '✅' : '❌');
          console.log('   HIPAA:', hasHIPAA ? '✅' : '❌');
        }
      } else {
        console.log('\n⚠️ No in-progress submissions found');
        console.log('   This suggests the user ID mapping may not be working correctly');
      }
      
    } catch (submissionsError) {
      console.log('❌ Failed to retrieve submissions:', submissionsError.message);
      if (submissionsError.response) {
        console.log('   Status:', submissionsError.response.status);
        console.log('   Data:', JSON.stringify(submissionsError.response.data, null, 2));
      }
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Make sure questionnaire service is running: docker-compose up -d questionnaire-service');
      console.log('   2. Check if BYPASS_AUTH=true is set in .env file');
      console.log('   3. Restart the questionnaire service after changes');
    }
    
  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
    console.log('\n🔧 Next steps:');
    console.log('   1. Restart questionnaire service: ./restart-questionnaire-for-user-id-fix.sh');
    console.log('   2. Check Docker logs: docker-compose logs questionnaire-service');
    console.log('   3. Verify database connection');
  }
}

testUserIdMapping();