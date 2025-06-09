const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to create a test questionnaire submission for a user
 * This helps diagnose issues with questionnaire retrieval
 */
async function main() {
  try {
    console.log('Checking for existing users...');
    
    // Find a user to work with
    const users = await prisma.user.findMany({
      take: 1
    });
    
    if (users.length === 0) {
      console.log('No users found - creating test user');
      const testUser = await prisma.user.create({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      });
      console.log('Created test user:', testUser);
      users.push(testUser);
    }
    
    const userId = users[0].id;
    console.log(`Working with user ID: ${userId}`);
    
    // Find existing submissions for this user
    const existingSubmissions = await prisma.submission.findMany({
      where: {
        userId: userId
      }
    });
    
    console.log(`Found ${existingSubmissions.length} existing submissions for user`);
    
    // Find a template to use
    const templates = await prisma.template.findMany({
      take: 1
    });
    
    if (templates.length === 0) {
      console.error('No templates found. Please seed templates first.');
      return;
    }
    
    const templateId = templates[0].id;
    console.log(`Using template ID: ${templateId}`);
    
    // Create test submissions - both draft and completed
    if (existingSubmissions.length === 0) {
      // Create a draft submission
      const draftSubmission = await prisma.submission.create({
        data: {
          userId: userId,
          templateId: templateId,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('Created draft submission:', draftSubmission);
      
      // Create a completed submission
      const completedSubmission = await prisma.submission.create({
        data: {
          userId: userId,
          templateId: templateId,
          status: 'submitted',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          updatedAt: new Date()
        }
      });
      console.log('Created completed submission:', completedSubmission);
      
      console.log('Created test submissions successfully');
    } else {
      console.log('User already has submissions:');
      existingSubmissions.forEach(sub => {
        console.log(`ID: ${sub.id}, Status: ${sub.status}, Template: ${sub.templateId}`);
      });
      
      // Make sure there's at least one draft submission
      const hasDraft = existingSubmissions.some(sub => sub.status === 'draft');
      if (!hasDraft) {
        const draftSubmission = await prisma.submission.create({
          data: {
            userId: userId,
            templateId: templateId, 
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log('Created additional draft submission:', draftSubmission);
      }
      
      // Make sure there's at least one completed submission
      const hasCompleted = existingSubmissions.some(
        sub => sub.status === 'submitted' || sub.status === 'analyzed'
      );
      if (!hasCompleted) {
        const completedSubmission = await prisma.submission.create({
          data: {
            userId: userId,
            templateId: templateId,
            status: 'submitted',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            updatedAt: new Date()
          }
        });
        console.log('Created additional completed submission:', completedSubmission);
      }
    }
    
    // Verify submissions
    const finalSubmissions = await prisma.submission.findMany({
      where: {
        userId: userId
      },
      include: {
        template: true
      }
    });
    
    console.log('\nFinal submissions for user:');
    finalSubmissions.forEach(sub => {
      console.log(`ID: ${sub.id}, Status: ${sub.status}, Template: ${sub.template.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
