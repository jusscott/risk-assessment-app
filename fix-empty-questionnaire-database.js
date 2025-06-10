#!/usr/bin/env node

const axios = require('axios');

console.log('🔧 FIXING EMPTY QUESTIONNAIRE DATABASE ISSUE');
console.log('============================================');

async function fixEmptyQuestionnaireDatabase() {
    try {
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
        
        console.log('🔍 Step 1: Using Diagnostic Endpoint to Fix Database...');
        
        try {
            // Reset and reseed the database
            const resetResponse = await axios.post('http://localhost:5000/api/questionnaire/diagnostic/reset-database', {}, { headers });
            console.log('✅ Database reset result:', resetResponse.data);
        } catch (error) {
            console.log('⚠️ Database reset failed (this may be expected):', error.response?.data || error.message);
        }
        
        try {
            // Provision default template
            const provisionResponse = await axios.post('http://localhost:5000/api/questionnaire/diagnostic/provision-default-template', {}, { headers });
            console.log('✅ Template provision result:', provisionResponse.data);
        } catch (error) {
            console.log('⚠️ Template provision failed:', error.response?.data || error.message);
        }
        
        console.log('\n🔍 Step 2: Verifying Templates...');
        const templatesResponse = await axios.get('http://localhost:5000/api/questionnaire/templates', { headers });
        console.log('Templates found after fix:', templatesResponse.data?.length || 0);
        
        if (templatesResponse.data && templatesResponse.data.length > 0) {
            console.log('\n📋 Available Templates:');
            templatesResponse.data.forEach((template, index) => {
                console.log(`${index + 1}. ${template.name} (ID: ${template.id}) - ${template.questions?.length || 0} questions`);
            });
            
            // Create test in-progress submission with the first template
            const template = templatesResponse.data[0];
            console.log(`\n🔧 Step 3: Creating Test In-Progress Submission with ${template.name}...`);
            
            try {
                // Start a new submission
                const startResponse = await axios.post('http://localhost:5000/api/questionnaire/submissions', {
                    templateId: template.id
                }, { headers });
                
                const submissionId = startResponse.data?.id;
                console.log('✅ Created submission:', submissionId);
                
                // Get the template with questions to add some test answers
                const templateDetailResponse = await axios.get(`http://localhost:5000/api/questionnaire/templates/${template.id}`, { headers });
                const templateWithQuestions = templateDetailResponse.data;
                
                if (templateWithQuestions.questions && templateWithQuestions.questions.length > 0) {
                    // Add partial answers to make it "in-progress"
                    const answersToAdd = Math.min(5, templateWithQuestions.questions.length);
                    const testAnswers = templateWithQuestions.questions.slice(0, answersToAdd).map(q => ({
                        questionId: q.id,
                        value: q.type === 'multiple_choice' ? 'Yes' : 'This is a test answer for debugging purposes'
                    }));
                    
                    await axios.put(`http://localhost:5000/api/questionnaire/submissions/${submissionId}`, {
                        answers: testAnswers
                    }, { headers });
                    
                    console.log(`✅ Added ${testAnswers.length} test answers to submission`);
                    
                    // Verify the submission is now accessible
                    console.log('\n🔍 Step 4: Verifying In-Progress Submission...');
                    
                    const inProgressResponse = await axios.get('http://localhost:5000/api/questionnaire/submissions/in-progress', { headers });
                    console.log('In-progress submissions found:', inProgressResponse.data?.length || 0);
                    
                    if (inProgressResponse.data && inProgressResponse.data.length > 0) {
                        const submission = inProgressResponse.data[0];
                        console.log('\n📊 Test Submission Details:');
                        console.log('- ID:', submission.id);
                        console.log('- Template:', submission.Template?.name);
                        console.log('- Progress:', `${submission.progress || 0}%`);
                        console.log('- Status:', submission.status);
                        console.log('- Answers:', submission.answers ? Object.keys(submission.answers).length : 0);
                        
                        // Get the specific submission (simulate what frontend does)
                        const specificResponse = await axios.get(`http://localhost:5000/api/questionnaire/submissions/${submission.id}`, { headers });
                        
                        console.log('\n🎯 Frontend Simulation - Specific Submission Load:');
                        console.log('- Template Questions Count:', specificResponse.data.Template?.questions?.length || 0);
                        console.log('- Template Name:', specificResponse.data.Template?.name);
                        
                        if (specificResponse.data.Template?.questions && specificResponse.data.Template.questions.length > 0) {
                            console.log('✅ SUCCESS: Template questions are properly loaded!');
                            console.log('- Sample Question:', specificResponse.data.Template.questions[0]?.text?.substring(0, 100) + '...');
                            
                            console.log('\n🎉 ISSUE RESOLVED!');
                            console.log('Users should now be able to see in-progress questionnaires with questions.');
                            
                        } else {
                            console.log('❌ ISSUE PERSISTS: Template questions are still missing');
                        }
                    }
                } else {
                    console.log('❌ Template has no questions even after provision');
                }
                
            } catch (submissionError) {
                console.log('❌ Failed to create test submission:', submissionError.response?.data || submissionError.message);
            }
            
        } else {
            console.log('❌ Still no templates found after fix attempts');
        }
        
        console.log('\n📊 SUMMARY:');
        console.log('- Templates available:', templatesResponse.data?.length || 0);
        if (templatesResponse.data && templatesResponse.data.length > 0) {
            console.log('- Database has been successfully populated');
            console.log('- In-progress questionnaires should now display properly');
        } else {
            console.log('- Database is still empty - manual intervention may be required');
        }
        
    } catch (error) {
        console.log('❌ Error during fix process:', error.response?.status, error.response?.data || error.message);
    }
}

fixEmptyQuestionnaireDatabase();
