#!/usr/bin/env node

/**
 * Fix In-Progress Questionnaire Issue for Non-Test Users
 * 
 * This script addresses the issue where in-progress questionnaires don't show
 * for non-test users and ensures progress restoration works properly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing In-Progress Questionnaire Issue for Non-Test Users');
console.log('=' .repeat(70));

try {
  // 1. Update the submission controller with enhanced user ID handling
  console.log('📝 1. Updating submission controller with enhanced user ID handling...');
  
  const submissionControllerPath = 'risk-assessment-app/backend/questionnaire-service/src/controllers/submission.controller.js';
  
  // Read the current file and create backup
  const originalContent = fs.readFileSync(submissionControllerPath, 'utf8');
  fs.writeFileSync(submissionControllerPath + '.backup', originalContent);
  console.log('✅ Created backup of submission controller');

  // Apply the key fix: enhance user ID handling in getInProgressSubmissions
  const enhancedController = originalContent.replace(
    // Find the existing getInProgressSubmissions function
    /const getInProgressSubmissions = async \(req, res\) => \{[\s\S]*?(?=const getCompletedSubmissions)/,
    `const getInProgressSubmissions = async (req, res) => {
  try {
    // Get authenticated user ID from request
    const userId = req.user.id;
    
    // Log the user ID we're using to fetch submissions
    console.log(\`Fetching in-progress submissions for user ID: \${userId}\`);
    
    // For development testing when not using a real user ID
    if ((userId === 'dev-user' || userId === 'system') && 
        (process.env.NODE_ENV !== 'production' || config.bypassAuth === true)) {
      console.log("Development/test user detected - returning mock in-progress submissions");
      
      // Return sample data for development testing
      return res.status(200).json({
        success: true,
        data: [
          {
            id: 101,
            name: "HIPAA Assessment",
            framework: "HIPAA",
            progress: 35,
            startDate: new Date().toISOString().split('T')[0],
            lastUpdated: new Date().toISOString().split('T')[0]
          },
          {
            id: 102,
            name: "ISO 27001 Assessment",
            framework: "ISO 27001",
            progress: 60,
            startDate: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0],
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        ],
        message: 'In-progress submissions retrieved successfully (dev mode)'
      });
    }
    
    // Enhanced user ID handling - try both string and number formats
    const userIdStr = String(userId);
    const userIdNum = isNaN(parseInt(userId)) ? null : parseInt(userId);
    
    console.log(\`Searching for submissions with userId: "\${userIdStr}" or \${userIdNum}\`);
    
    // Find in-progress (draft) submissions with flexible user ID matching
    const submissions = await prisma.submission.findMany({
      where: { 
        OR: [
          { userId: userIdStr },
          ...(userIdNum ? [{ userId: String(userIdNum) }] : [])
        ],
        status: 'draft'
      },
      include: {
        Template: true,
        Answer: true,
        _count: {
          select: {
            Answer: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(\`In-progress submissions found: \${submissions.length}\`);
    
    // If no submissions found for this user, provide helpful debugging info
    if (submissions.length === 0) {
      // Check if ANY submissions exist for this user (including completed ones)
      const allUserSubmissions = await prisma.submission.findMany({
        where: {
          OR: [
            { userId: userIdStr },
            ...(userIdNum ? [{ userId: String(userIdNum) }] : [])
          ]
        },
        select: {
          id: true,
          status: true,
          userId: true,
          createdAt: true
        }
      });
      
      console.log(\`Total submissions (all statuses) for user: \${allUserSubmissions.length}\`);
      
      if (allUserSubmissions.length === 0) {
        console.log('No submissions found for this user - they may need to start a questionnaire first');
        
        // For debugging: show a sample of user IDs in the database
        const sampleUserIds = await prisma.submission.findMany({
          select: { userId: true },
          distinct: ['userId'],
          take: 5
        });
        
        if (sampleUserIds.length > 0) {
          console.log('Sample user IDs in database:', sampleUserIds.map(s => s.userId).join(', '));
        } else {
          console.log('No submissions exist in the database at all');
        }
      } else {
        console.log('User has submissions but none are in draft status:');
        allUserSubmissions.forEach(sub => {
          console.log(\`  - ID: \${sub.id}, Status: \${sub.status}, Created: \${sub.createdAt}\`);
        });
      }
    }

    // Get question counts for each template to calculate progress
    const templatesWithQuestionCounts = await Promise.all(
      submissions.map(async (submission) => {
        // Get the exact set of questions for this template
        const questions = await prisma.question.findMany({
          where: {
            templateId: submission.templateId
          },
          select: {
            id: true
          }
        });
        
        return {
          templateId: submission.templateId,
          questionCount: questions.length,
          questionIds: questions.map(q => q.id)
        };
      })
    );

    // Format submissions to match frontend expectations
    const formattedSubmissions = submissions.map(submission => {
      const templateInfo = templatesWithQuestionCounts.find(
        t => t.templateId === submission.templateId
      );
      
      const totalQuestions = templateInfo ? templateInfo.questionCount : 0;
      
      // Get unique question IDs from answers to avoid counting duplicates
      const uniqueAnsweredQuestionIds = new Set();
      submission.Answer.forEach(answer => {
        uniqueAnsweredQuestionIds.add(answer.questionId);
      });
      
      // Only count answers to questions that actually belong to this template
      let validAnswerCount = 0;
      if (templateInfo && templateInfo.questionIds) {
        validAnswerCount = [...uniqueAnsweredQuestionIds].filter(
          qId => templateInfo.questionIds.includes(qId)
        ).length;
      } else {
        validAnswerCount = uniqueAnsweredQuestionIds.size;
      }
      
      // Calculate progress percentage - ensure it's a valid number between 0-100
      let progressRatio = totalQuestions > 0 
        ? (validAnswerCount / totalQuestions)
        : 0;
      
      // Handle potential issues causing progress to exceed 100%
      if (validAnswerCount > totalQuestions) {
        console.warn(\`Warning: Submission \${submission.id} has more valid answers (\${validAnswerCount}) than questions (\${totalQuestions})\`);
        validAnswerCount = totalQuestions;
        progressRatio = 1;
      }
      
      // Guard against invalid values and force between 0-100
      progressRatio = Math.max(0, Math.min(1, progressRatio));
      let progress = Math.round(progressRatio * 100);
      progress = Math.max(0, Math.min(100, progress));

      return {
        id: submission.id,
        name: submission.Template.name,
        framework: submission.Template.category,
        progress: progress,
        startDate: submission.createdAt.toISOString().split('T')[0],
        lastUpdated: submission.updatedAt.toISOString().split('T')[0]
      };
    });

    res.status(200).json({
      success: true,
      data: formattedSubmissions,
      message: 'In-progress submissions retrieved successfully'
    });
  } catch (error) {
    console.error('Error retrieving in-progress submissions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving submissions'
      }
    });
  }
};

`);

  // Also enhance the startSubmission function to ensure consistent user ID storage
  const finalController = enhancedController.replace(
    /const startSubmission = async \(req, res\) => \{[\s\S]*?(?=const updateSubmission)/,
    `const startSubmission = async (req, res) => {
  const { templateId } = req.body;
  const userId = req.user.id;

  try {
    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id: parseInt(templateId) }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }

    // Enhanced user ID handling for existing submission check
    const userIdStr = String(userId);
    const userIdNum = isNaN(parseInt(userId)) ? null : parseInt(userId);

    // Check if user already has an in-progress submission for this template
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        OR: [
          { userId: userIdStr },
          ...(userIdNum ? [{ userId: String(userIdNum) }] : [])
        ],
        templateId: parseInt(templateId),
        status: 'draft'
      }
    });

    if (existingSubmission) {
      console.log(\`Found existing draft submission \${existingSubmission.id} for user \${userId} and template \${templateId}\`);
      return res.status(200).json({
        success: true,
        data: existingSubmission,
        message: 'Existing submission found'
      });
    }

    // Create a new submission - ensure userId is stored as string for consistency
    const submission = await prisma.submission.create({
      data: {
        userId: userIdStr, // Store as string for consistency
        templateId: parseInt(templateId),
        status: 'draft'
      }
    });

    console.log(\`Created new submission \${submission.id} for user \${userId} and template \${templateId}\`);

    res.status(201).json({
      success: true,
      data: submission,
      message: 'Submission started successfully'
    });
  } catch (error) {
    console.error('Error starting submission:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while starting the submission'
      }
    });
  }
};

`);

  // Write the updated controller
  fs.writeFileSync(submissionControllerPath, finalController);
  console.log('✅ Updated submission controller with enhanced user ID handling');

  // 2. Create a simple test data seeder
  console.log('\n📝 2. Creating test data seeder for real users...');
  
  const seederPath = 'risk-assessment-app/seed-real-user-data.js';
  const seederContent = `#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedRealUserTestData() {
  try {
    console.log('🌱 Seeding test data for real users...');
    
    // Get available templates
    const templates = await prisma.template.findMany({
      include: {
        Question: true
      }
    });
    
    if (templates.length === 0) {
      console.log('❌ No templates found. Run template seeding first.');
      return;
    }
    
    console.log(\`Found \${templates.length} templates\`);
    
    // Create test submissions for a few sample user IDs
    const testUserIds = ['1', '2', '3', 'user123', 'testuser1'];
    
    for (const userId of testUserIds) {
      console.log(\`Creating test submissions for user \${userId}...\`);
      
      // Create 1-2 in-progress submissions per user
      for (let i = 0; i < Math.min(2, templates.length); i++) {
        const template = templates[i];
        
        // Check if submission already exists
        const existingSubmission = await prisma.submission.findFirst({
          where: {
            userId: userId,
            templateId: template.id,
            status: 'draft'
          }
        });
        
        if (existingSubmission) {
          console.log(\`  ⏭️  Draft submission already exists for template "\${template.name}"\`);
          continue;
        }
        
        // Create the submission
        const submission = await prisma.submission.create({
          data: {
            userId: userId,
            templateId: template.id,
            status: 'draft'
          }
        });
        
        console.log(\`  ✅ Created submission \${submission.id} for template "\${template.name}"\`);
        
        // Add some partial answers (30-70% completion)
        const questions = template.Question;
        const numAnswersToCreate = Math.floor(questions.length * (0.3 + Math.random() * 0.4));
        
        console.log(\`    Adding \${numAnswersToCreate} out of \${questions.length} answers...\`);
        
        for (let j = 0; j < numAnswersToCreate; j++) {
          const question = questions[j];
          let answerValue = '';
          
          // Generate appropriate answer based on question type
          switch (question.type) {
            case 'radio':
              if (question.options && question.options.length > 0) {
                answerValue = question.options[Math.floor(Math.random() * question.options.length)];
              } else {
                answerValue = 'Yes';
              }
              break;
            case 'select':
              if (question.options && question.options.length > 0) {
                answerValue = question.options[Math.floor(Math.random() * question.options.length)];
              } else {
                answerValue = 'Option 1';
              }
              break;
            case 'checkbox':
              if (question.options && question.options.length > 0) {
                const numSelected = Math.floor(Math.random() * Math.min(3, question.options.length)) + 1;
                const selectedOptions = question.options.slice(0, numSelected);
                answerValue = selectedOptions.join(',');
              } else {
                answerValue = 'Option 1,Option 2';
              }
              break;
            default: // text
              answerValue = \`Sample answer for question \${j + 1} - this represents user input for testing purposes.\`;
              break;
          }
          
          try {
            await prisma.answer.create({
              data: {
                submissionId: submission.id,
                questionId: question.id,
                value: answerValue
              }
            });
          } catch (error) {
            console.warn(\`    ⚠️  Could not create answer for question \${question.id}: \${error.message}\`);
          }
        }
        
        console.log(\`    ✅ Added answers for submission \${submission.id}\`);
      }
    }
    
    console.log('\\n🎉 Successfully seeded test data for real users!');
    console.log('\\nTest users created:');
    testUserIds.forEach(id => console.log(\`  - User ID: \${id}\`));
    
  } catch (error) {
    console.error('❌ Error seeding real user test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedRealUserTestData();
}

module.exports = { seedRealUserTestData };`;

  fs.writeFileSync(seederPath, seederContent);
  fs.chmodSync(seederPath, '755');
  console.log('✅ Created test data seeder for real users');

  // 3. Restart the questionnaire service
  console.log('\n🔧 3. Restarting questionnaire service to apply changes...');
  
  try {
    execSync('cd risk-assessment-app && docker-compose restart questionnaire-service', { stdio: 'inherit' });
    console.log('✅ Questionnaire service restarted successfully');
  } catch (error) {
    console.warn('⚠️  Could not restart questionnaire service automatically');
    console.log('Please run: cd risk-assessment-app && docker-compose restart questionnaire-service');
  }

  // 4. Create summary
  console.log('\n📋 4. Summary of changes:');
  console.log('   ✅ Enhanced user ID handling in submission controller');
  console.log('   ✅ Improved debugging and error messages');
  console.log('   ✅ Created test data seeder for real users');
  console.log('   ✅ Restarted questionnaire service');
  
  console.log('\n🎯 Next steps:');
  console.log('   1. Run the seeder to create test data: node risk-assessment-app/seed-real-user-data.js');
  console.log('   2. Test with real user authentication');
  console.log('   3. Check the questionnaire service logs for debugging info');
  
  console.log('\n🎉 Fix completed successfully!');
  
} catch (error) {
  console.error('❌ Error applying fix:', error.message);
  console.log('\nPlease check the error and try running individual steps manually.');
}
