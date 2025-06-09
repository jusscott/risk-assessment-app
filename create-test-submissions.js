const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSubmissions() {
  console.log('🔧 CREATING TEST QUESTIONNAIRE SUBMISSIONS');
  console.log('\nThis script will create test in-progress and completed submissions for the test user\n');

  try {
    // Get the test user from the auth database
    let testUser;
    try {
      console.log('▶️ Fetching test user from auth service...');
      const authResponse = await axios.get('http://localhost:5001/api/users?email=test@example.com', {
        timeout: 3000
      });

      if (authResponse.data && authResponse.data.success && authResponse.data.data) {
        testUser = authResponse.data.data;
        console.log(`✅ Found test user: ${testUser.id} (${testUser.email})`);
      } else {
        throw new Error('Test user not found in response');
      }
    } catch (error) {
      console.log('❌ Could not fetch test user from auth service. Using default test user ID.');
      // Use a default test user ID that's typically created during auth service initialization
      testUser = { id: 'test-user-123', email: 'test@example.com' };
    }

    // Get available templates
    console.log('▶️ Fetching templates...');
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        category: true
      }
    });

    if (templates.length === 0) {
      console.error('❌ No templates found in the database. Please run the seed script first.');
      return;
    }

    console.log(`✅ Found ${templates.length} templates`);

    // Delete any existing submissions for this user to avoid duplicates
    console.log(`▶️ Cleaning up existing submissions for user ${testUser.id}...`);
    const deleteResult = await prisma.submission.deleteMany({
      where: {
        userId: testUser.id
      }
    });

    console.log(`✅ Deleted ${deleteResult.count} existing submissions`);

    // Create in-progress submission
    console.log('▶️ Creating in-progress submission...');
    const inProgressSubmission = await prisma.submission.create({
      data: {
        userId: testUser.id,
        templateId: templates[0].id,
        status: 'draft',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        updatedAt: new Date()
      }
    });

    // Get questions for the template
    const questions = await prisma.question.findMany({
      where: {
        templateId: templates[0].id
      },
      take: 10 // Get first 10 questions
    });

    // Create some answers for the in-progress submission
    console.log('▶️ Creating answers for in-progress submission...');
    const answerPromises = questions.slice(0, 5).map((question, index) => {
      return prisma.answer.create({
        data: {
          submissionId: inProgressSubmission.id,
          questionId: question.id,
          value: `Test answer ${index + 1}`
        }
      });
    });

    await Promise.all(answerPromises);

    // Create completed submission
    console.log('▶️ Creating completed submission...');
    const completedSubmission = await prisma.submission.create({
      data: {
        userId: testUser.id,
        templateId: templates.length > 1 ? templates[1].id : templates[0].id,
        status: 'submitted',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
      }
    });

    // Get questions for the completed template
    const completedTemplateId = templates.length > 1 ? templates[1].id : templates[0].id;
    const completedQuestions = await prisma.question.findMany({
      where: {
        templateId: completedTemplateId
      }
    });

    // Create answers for all questions in the completed submission
    console.log('▶️ Creating answers for completed submission...');
    const completedAnswerPromises = completedQuestions.map((question, index) => {
      return prisma.answer.create({
        data: {
          submissionId: completedSubmission.id,
          questionId: question.id,
          value: `Completed answer ${index + 1}`
        }
      });
    });

    await Promise.all(completedAnswerPromises);

    console.log('\n✅ Test data created successfully!\n');
    console.log('Summary:');
    console.log(`- Created 1 in-progress submission (${inProgressSubmission.id}) with 5 answers`);
    console.log(`- Created 1 completed submission (${completedSubmission.id}) with ${completedQuestions.length} answers`);
    console.log(`\nYou can now navigate to http://localhost:3000/questionnaires to see your submissions.`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSubmissions().then(() => {
  console.log('Done!');
});
