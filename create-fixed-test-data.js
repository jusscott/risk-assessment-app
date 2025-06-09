/**
 * Fixed Test Data Creation Script
 * 
 * This script creates test questionnaire submissions after the P3005 migration issue was fixed.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Test user constants
const TEST_USER_ID = 'test-user-123';

async function main() {
  console.log('📋 CREATING TEST QUESTIONNAIRE SUBMISSIONS');
  console.log('=========================================\n');

  try {
    // Step 1: Check if the container is running
    console.log('Step 1: Checking if questionnaire-service container is running...');
    
    try {
      const containerCheck = execSync('docker ps | grep questionnaire-service', { encoding: 'utf8' });
      if (!containerCheck) {
        console.log('❌ questionnaire-service container not running. Please start the containers first.');
        return;
      }
      console.log('✅ questionnaire-service container is running');
    } catch (error) {
      console.log('❌ questionnaire-service container not running. Please start the containers first.');
      return;
    }

    // Step 2: Create test data script with fixed Prisma schema references
    console.log('\nStep 2: Creating test data script with correct schema references...');
    
    const testDataScript = `
      // Fixed Test Data Creation Script
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function createTestData() {
        try {
          console.log('📋 Creating test questionnaire data...');
          
          // Check if templates exist
          const templates = await prisma.template.findMany({
            take: 5
          });
          
          if (templates.length === 0) {
            console.log('⚠️ No templates found. Please run seed script first.');
            return;
          }
          
          console.log(\`📁 Found \${templates.length} templates\`);
          
          // Use the first template for our test submissions
          const templateId = templates[0].id;
          console.log(\`ℹ️ Using template: \${templateId}\`);
          
          // Define test user
          const userId = '${TEST_USER_ID}';
          
          // Clean up any existing test submissions - First delete answers
          console.log('🗑️ Cleaning up existing test submissions...');
          
          try {
            // First try to find submissions for this user
            const submissionsToDelete = await prisma.submission.findMany({
              where: {
                userId: userId
              },
              select: {
                id: true
              }
            });
            
            if (submissionsToDelete.length > 0) {
              const submissionIds = submissionsToDelete.map(sub => sub.id);
              console.log(\`Found \${submissionIds.length} existing submissions to clean up\`);
              
              // Delete answers first
              const deleteAnswersResult = await prisma.answer.deleteMany({
                where: {
                  submissionId: {
                    in: submissionIds
                  }
                }
              });
              
              console.log(\`🗑️ Deleted \${deleteAnswersResult.count} existing answers\`);
              
              // Then delete submissions
              const deleteSubmissionsResult = await prisma.submission.deleteMany({
                where: {
                  userId: userId
                }
              });
              
              console.log(\`🗑️ Deleted \${deleteSubmissionsResult.count} existing submissions\`);
            } else {
              console.log('No existing submissions found to clean up');
            }
          } catch (error) {
            console.error('Error cleaning up existing data:', error);
            // Continue anyway to create new data
          }
          
          // Create draft submission
          console.log('📝 Creating draft submission...');
          const draftSubmission = await prisma.submission.create({
            data: {
              userId: userId,
              templateId: templateId,
              status: 'draft',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              updatedAt: new Date()
            }
          });
          
          console.log(\`✅ Created draft submission with ID: \${draftSubmission.id}\`);
          
          // Get questions for this template
          const questions = await prisma.question.findMany({
            where: {
              templateId: templateId
            },
            take: 10
          });
          
          if (questions.length === 0) {
            console.log('⚠️ No questions found for template');
            return;
          }
          
          console.log(\`📋 Found \${questions.length} questions\`);
          
          // Add answers to half of the questions in draft submission
          const halfQuestions = questions.slice(0, Math.ceil(questions.length / 2));
          console.log(\`✍️ Adding \${halfQuestions.length} answers to draft submission...\`);
          
          for (let i = 0; i < halfQuestions.length; i++) {
            try {
              await prisma.answer.create({
                data: {
                  submissionId: draftSubmission.id,
                  questionId: halfQuestions[i].id,
                  value: \`Draft answer \${i + 1}\`,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
            } catch (error) {
              console.error(\`Error creating answer \${i}: \${error.message}\`);
            }
          }
          
          // Create completed submission
          console.log('📝 Creating completed submission...');
          const completedSubmission = await prisma.submission.create({
            data: {
              userId: userId,
              templateId: templateId,
              status: 'submitted',
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
            }
          });
          
          console.log(\`✅ Created completed submission with ID: \${completedSubmission.id}\`);
          
          // Add answers to all questions in completed submission
          console.log(\`✍️ Adding \${questions.length} answers to completed submission...\`);
          
          for (let i = 0; i < questions.length; i++) {
            try {
              await prisma.answer.create({
                data: {
                  submissionId: completedSubmission.id,
                  questionId: questions[i].id,
                  value: \`Completed answer \${i + 1}\`,
                  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
                }
              });
            } catch (error) {
              console.error(\`Error creating answer \${i}: \${error.message}\`);
            }  
          }
          
          // If we have a second template, create another submission for it
          if (templates.length > 1) {
            const secondTemplateId = templates[1].id;
            
            console.log('📝 Creating submission for second template...');
            const secondSubmission = await prisma.submission.create({
              data: {
                userId: userId,
                templateId: secondTemplateId,
                status: 'submitted',
                createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
              }
            });
            
            console.log(\`✅ Created second template submission with ID: \${secondSubmission.id}\`);
            
            // Get questions for second template
            const secondTemplateQuestions = await prisma.question.findMany({
              where: {
                templateId: secondTemplateId
              },
              take: 20
            });
            
            if (secondTemplateQuestions.length > 0) {
              console.log(\`✍️ Adding \${secondTemplateQuestions.length} answers to second template submission...\`);
              
              for (let i = 0; i < secondTemplateQuestions.length; i++) {
                try {
                  await prisma.answer.create({
                    data: {
                      submissionId: secondSubmission.id,
                      questionId: secondTemplateQuestions[i].id,
                      value: \`Second template answer \${i + 1}\`,
                      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                      updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
                    }
                  });
                } catch (error) {
                  console.error(\`Error creating second template answer \${i}: \${error.message}\`);
                }
              }
            }
          }
          
          console.log('✅ Test data creation completed successfully!');
        } catch (error) {
          console.error('❌ Error creating test data:', error);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      createTestData().catch(console.error);
    `;
    
    fs.writeFileSync('./fixed-test-data.js', testDataScript);
    console.log('✅ Created fixed test data script');
    
    // Step 3: Copy script to container
    console.log('\nStep 3: Copying script to container...');
    
    try {
      execSync('docker cp ./fixed-test-data.js questionnaire-service:/app/fixed-test-data.js', { stdio: 'inherit' });
      console.log('✅ Copied script to container');
    } catch (error) {
      console.error('❌ Error copying script to container:', error);
      return;
    }
    
    // Step 4: Execute test data script in container
    console.log('\nStep 4: Executing test data script in container...');
    
    try {
      execSync('docker exec questionnaire-service node /app/fixed-test-data.js', { stdio: 'inherit' });
      console.log('✅ Test data script executed successfully');
    } catch (error) {
      console.error('❌ Error executing test data script:', error);
      return;
    }
    
    // Step 5: Clean up temporary files
    console.log('\nStep 5: Cleaning up temporary files...');
    
    try {
      fs.unlinkSync('./fixed-test-data.js');
      console.log('✅ Removed temporary files');
    } catch (error) {
      console.error('❌ Error removing temporary files:', error);
    }

    // Step 6: Verify API connectivity
    console.log('\nStep 6: Testing API connectivity...');
    
    try {
      execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5002/api/health', { stdio: 'inherit' });
      console.log('✅ API connectivity check successful!');
    } catch (error) {
      console.error('❌ Error testing API connectivity:', error);
    }
    
    // Final message
    console.log('\n✅ OPERATION COMPLETE');
    console.log('====================');
    console.log('Test questionnaire submissions have been created.');
    console.log('You can now navigate to the questionnaires page in the application to view submissions.');
    console.log('\nThe following submissions were created:');
    console.log('- One draft questionnaire (partially completed)');
    console.log('- One submitted questionnaire (fully completed)');
    console.log('- One additional submitted questionnaire with a different template (if available)');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Execute the script
main().catch(console.error);
