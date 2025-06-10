#!/usr/bin/env node

const axios = require('axios');

console.log('🔍 DIAGNOSING IN-PROGRESS QUESTIONNAIRE ISSUE');
console.log('==========================================');

async function diagnoseInProgressQuestionnaires() {
    try {
        console.log('\n📋 Step 1: Testing Login Flow...');
        
        // Test login
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'good@test.com',
            password: 'Password123'
        });
        
        if (loginResponse.status !== 200) {
            console.log('❌ Login failed:', loginResponse.status);
            return;
        }
        
        const token = loginResponse.data.data?.tokens?.accessToken || loginResponse.data.tokens?.accessToken || loginResponse.data.token;
        if (!token) {
            console.log('❌ No token received in login response');
            console.log('Login response structure:', JSON.stringify(loginResponse.data, null, 2));
            return;
        }
        
        console.log('✅ Login successful, token received');
        
        // Test getting user submissions (in-progress questionnaires)
        console.log('\n📊 Step 2: Fetching User Submissions (In-Progress Questionnaires)...');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const submissionsResponse = await axios.get('http://localhost:5000/api/questionnaire/submissions/in-progress', {
            headers
        });
        
        console.log('✅ Submissions API Response Status:', submissionsResponse.status);
        console.log('📊 Number of submissions found:', submissionsResponse.data?.length || 0);
        
        if (submissionsResponse.data && submissionsResponse.data.length > 0) {
            console.log('\n📋 In-Progress Submissions Details:');
            submissionsResponse.data.forEach((submission, index) => {
                console.log(`\n--- Submission ${index + 1} ---`);
                console.log('ID:', submission.id);
                console.log('Template ID:', submission.templateId);
                console.log('Template Name:', submission.Template?.name || 'N/A');
                console.log('Status:', submission.status);
                console.log('Progress:', `${submission.progress || 0}%`);
                console.log('Answers Count:', submission.answers ? Object.keys(submission.answers).length : 0);
                console.log('Created:', submission.createdAt);
                console.log('Updated:', submission.updatedAt);
                
                if (submission.answers) {
                    console.log('Sample Answers:', JSON.stringify(submission.answers, null, 2).substring(0, 200) + '...');
                }
            });
            
            // Test fetching a specific in-progress questionnaire
            const firstSubmission = submissionsResponse.data[0];
            if (firstSubmission) {
                console.log(`\n🔍 Step 3: Testing Specific In-Progress Questionnaire (ID: ${firstSubmission.id})...`);
                
                try {
                    const questionnaireResponse = await axios.get(
                        `http://localhost:5000/api/questionnaire/submissions/${firstSubmission.id}`,
                        { headers }
                    );
                    
                    console.log('✅ Individual Questionnaire Response Status:', questionnaireResponse.status);
                    console.log('📊 Questionnaire Data Structure:');
                    console.log('- ID:', questionnaireResponse.data.id);
                    console.log('- Template:', questionnaireResponse.data.Template?.name);
                    console.log('- Questions Count:', questionnaireResponse.data.Template?.questions?.length || 0);
                    console.log('- Progress:', questionnaireResponse.data.progress);
                    console.log('- Status:', questionnaireResponse.data.status);
                    console.log('- Answers Count:', questionnaireResponse.data.answers ? Object.keys(questionnaireResponse.data.answers).length : 0);
                    
                    if (questionnaireResponse.data.Template?.questions) {
                        console.log('✅ Template questions are present');
                        console.log('Sample question:', questionnaireResponse.data.Template.questions[0]?.text?.substring(0, 100) + '...');
                    } else {
                        console.log('❌ ISSUE FOUND: Template questions are missing or null');
                    }
                    
                } catch (error) {
                    console.log('❌ Error fetching individual questionnaire:', error.response?.status, error.response?.data || error.message);
                }
            }
        } else {
            console.log('❌ No in-progress submissions found');
        }
        
        // Test templates endpoint to see if templates are loading properly
        console.log('\n📝 Step 4: Testing Templates Endpoint...');
        try {
            const templatesResponse = await axios.get('http://localhost:5000/api/questionnaire/templates', {
                headers
            });
            
            console.log('✅ Templates Response Status:', templatesResponse.status);
            console.log('📊 Templates Count:', templatesResponse.data?.length || 0);
            
            if (templatesResponse.data && templatesResponse.data.length > 0) {
                const sampleTemplate = templatesResponse.data[0];
                console.log('Sample Template:');
                console.log('- ID:', sampleTemplate.id);
                console.log('- Name:', sampleTemplate.name); 
                console.log('- Questions Count:', sampleTemplate.questions?.length || 0);
                
                if (sampleTemplate.questions && sampleTemplate.questions.length > 0) {
                    console.log('- Sample Question:', sampleTemplate.questions[0].text?.substring(0, 100) + '...');
                } else {
                    console.log('❌ ISSUE: Template has no questions');
                }
            }
        } catch (error) {
            console.log('❌ Error fetching templates:', error.response?.status, error.response?.data || error.message);
        }
        
        console.log('\n🔍 Step 5: Checking Database Schema Alignment...');
        // This would help identify if there are issues with data structure
        
        console.log('\n📊 DIAGNOSIS SUMMARY:');
        console.log('====================');
        console.log('✅ Authentication: Working');
        console.log('✅ Submissions API: Accessible');
        
    } catch (error) {
        console.log('❌ Error during diagnosis:', error.response?.status, error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔍 Authentication issue detected');
        } else if (error.response?.status === 404) {
            console.log('🔍 Endpoint not found issue');  
        } else if (error.response?.status >= 500) {
            console.log('🔍 Server error detected');
        }
    }
}

diagnoseInProgressQuestionnaires();
