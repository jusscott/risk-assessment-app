
      // Test Data Creation Script
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
          
          console.log(`📁 Found ${templates.length} templates`);
          
          // Use the first template for our test submissions
          const templateId = templates[0].id;
          console.log(`ℹ️ Using template: ${templateId}`);
          
          // Define test user
          const userId = 'test-user-123';
          
          // Clean up any existing test submissions
          console.log('🗑️ Cleaning up existing test submissions...');
          
          const deleteAnswers = await prisma.answer.deleteMany({
            where: {
              submission: {
                userId: userId
              }
            }
          });
          
          console.log(`🗑️ Deleted ${deleteAnswers.count} existing answers`);
          
          const deleteSubmissions = await prisma.submission.deleteMany({
            where: {
              userId: userId
            }
          });
          
          console.log(`🗑️ Deleted ${deleteSubmissions.count} existing submissions`);
          
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
          
          console.log(`✅ Created draft submission with ID: ${draftSubmission.id}`);
          
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
          
          console.log(`📋 Found ${questions.length} questions`);
          
          // Add answers to half of the questions in draft submission
          const halfQuestions = questions.slice(0, Math.ceil(questions.length / 2));
          console.log(`✍️ Adding ${halfQuestions.length} answers to draft submission...`);
          
          for (let i = 0; i < halfQuestions.length; i++) {
            await prisma.answer.create({
              data: {
                submissionId: draftSubmission.id,
                questionId: halfQuestions[i].id,
                value: `Draft answer ${i + 1}`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
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
          
          console.log(`✅ Created completed submission with ID: ${completedSubmission.id}`);
          
          // Add answers to all questions in completed submission
          console.log(`✍️ Adding ${questions.length} answers to completed submission...`);
          
          for (let i = 0; i < questions.length; i++) {
            await prisma.answer.create({
              data: {
                submissionId: completedSubmission.id,
                questionId: questions[i].id,
                value: `Completed answer ${i + 1}`,
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
              }
            });
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
            
            console.log(`✅ Created second template submission with ID: ${secondSubmission.id}`);
            
            // Get questions for second template
            const secondTemplateQuestions = await prisma.question.findMany({
              where: {
                templateId: secondTemplateId
              },
              take: 20
            });
            
            if (secondTemplateQuestions.length > 0) {
              console.log(`✍️ Adding ${secondTemplateQuestions.length} answers to second template submission...`);
              
              for (let i = 0; i < secondTemplateQuestions.length; i++) {
                await prisma.answer.create({
                  data: {
                    submissionId: secondSubmission.id,
                    questionId: secondTemplateQuestions[i].id,
                    value: `Second template answer ${i + 1}`,
                    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
                  }
                });
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
    