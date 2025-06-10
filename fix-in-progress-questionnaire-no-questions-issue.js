#!/usr/bin/env node

const axios = require('axios');

console.log('🔧 FIXING IN-PROGRESS QUESTIONNAIRE NO QUESTIONS ISSUE');
console.log('=====================================================');

async function fixInProgressQuestionnaireIssue() {
    try {
        console.log('🔍 Step 1: Diagnosing the Issue...');
        
        // First, login to get a token
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        const token = loginResponse.data.data?.tokens?.accessToken || loginResponse.data.tokens?.accessToken || loginResponse.data.token;
        if (!token) {
            console.log('❌ Failed to get authentication token');
            return;
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // Check templates
        console.log('\n📊 Checking Templates...');
        const templatesResponse = await axios.get('http://localhost:5000/api/questionnaire/templates', { headers });
        console.log('Templates found:', templatesResponse.data?.length || 0);
        
        if (!templatesResponse.data || templatesResponse.data.length === 0) {
            console.log('⚠️  No templates found via API, trying to create test template...');
            
            // Create a test template directly via diagnostic endpoint
            try {
                const createTemplateResponse = await axios.post('http://localhost:5000/api/questionnaire/diagnostic/provision-default-template', {}, { headers });
                console.log('✅ Template creation result:', createTemplateResponse.data);
                
                // Try to get templates again
                const retryTemplatesResponse = await axios.get('http://localhost:5000/api/questionnaire/templates', { headers });
                console.log('Templates after creation:', retryTemplatesResponse.data?.length || 0);
            } catch (error) {
                console.log('❌ Failed to create template:', error.response?.data || error.message);
            }
        }
        
        // Get templates again to ensure we have them
        const finalTemplatesResponse = await axios.get('http://localhost:5000/api/questionnaire/templates', { headers });
        
        if (!finalTemplatesResponse.data || finalTemplatesResponse.data.length === 0) {
            console.log('❌ Still no templates available, cannot create submissions');
            return;
        }
        
        const template = finalTemplatesResponse.data[0];
        console.log(`✅ Using template: ${template.name} (ID: ${template.id})`);
        
        // Check existing in-progress submissions
        console.log('\n📋 Checking Existing In-Progress Submissions...');
        const submissionsResponse = await axios.get('http://localhost:5000/api/questionnaire/submissions/in-progress', { headers });
        console.log('Existing in-progress submissions:', submissionsResponse.data?.length || 0);
        
        // Create test in-progress submissions if none exist
        if (!submissionsResponse.data || submissionsResponse.data.length === 0) {
            console.log('\n🔧 Creating Test In-Progress Submissions...');
            
            try {
                // Create a test submission
                const startSubmissionResponse = await axios.post('http://localhost:5000/api/questionnaire/submissions', {
                    templateId: template.id
                }, { headers });
                
                console.log('✅ Created test submission:', startSubmissionResponse.data?.id);
                
                // Add some test answers to make it in-progress
                const submissionId = startSubmissionResponse.data?.id;
                if (submissionId && template.questions && template.questions.length > 0) {
                    const sampleAnswers = template.questions.slice(0, Math.min(5, template.questions.length)).map(q => ({
                        questionId: q.id,
                        value: 'Sample test answer'
                    }));
                    
                    // Update submission with answers
                    await axios.put(`http://localhost:5000/api/questionnaire/submissions/${submissionId}`, {
                        answers: sampleAnswers
                    }, { headers });
                    
                    console.log(`✅ Added ${sampleAnswers.length} test answers to submission`);
                }
                
            } catch (error) {
                console.log('❌ Failed to create test submission:', error.response?.data || error.message);
            }
        }
        
        // Final verification - test the specific issue
        console.log('\n🔍 Testing Specific In-Progress Questionnaire Loading...');
        
        const finalSubmissionsResponse = await axios.get('http://localhost:5000/api/questionnaire/submissions/in-progress', { headers });
        
        if (finalSubmissionsResponse.data && finalSubmissionsResponse.data.length > 0) {
            const submission = finalSubmissionsResponse.data[0];
            console.log(`\n📊 Testing Submission ID: ${submission.id}`);
            
            // Test getting the specific submission (this is what the frontend does)
            const specificSubmissionResponse = await axios.get(
                `http://localhost:5000/api/questionnaire/submissions/${submission.id}`,
                { headers }
            );
            
            console.log('📋 Submission Data Analysis:');
            console.log('- Submission ID:', specificSubmissionResponse.data.id);
            console.log('- Template:', specificSubmissionResponse.data.Template?.name);
            console.log('- Template ID:', specificSubmissionResponse.data.Template?.id);
            console.log('- Questions Count:', specificSubmissionResponse.data.Template?.questions?.length || 0);
            console.log('- Progress:', specificSubmissionResponse.data.progress);
            console.log('- Status:', specificSubmissionResponse.data.status);
            console.log('- Answers Count:', specificSubmissionResponse.data.answers ? Object.keys(specificSubmissionResponse.data.answers).length : 0);
            
            if (!specificSubmissionResponse.data.Template?.questions || specificSubmissionResponse.data.Template.questions.length === 0) {
                console.log('❌ ISSUE CONFIRMED: Template questions are missing or null!');
                console.log('📊 Template Data:', JSON.stringify(specificSubmissionResponse.data.Template, null, 2));
            } else {
                console.log('✅ Template questions are present');
                console.log('Sample question:', specificSubmissionResponse.data.Template.questions[0]?.text?.substring(0, 100) + '...');
            }
        } else {
            console.log('❌ Still no in-progress submissions found');
        }
        
        console.log('\n✅ Fix process completed. Check results above.');
        
    } catch (error) {
        console.log('❌ Error during fix process:', error.response?.status, error.response?.data || error.message);
    }
}

fixInProgressQuestionnaireIssue();
