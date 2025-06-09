/**
 * Fix for questionnaire loading issues:
 * 1. Token validation timeout issue
 * 2. PrismaClientValidationError in submission.controller.js
 */

const fs = require('fs');
const path = require('path');

// Paths to files that need to be fixed
const enhancedClientPath = path.join(
  __dirname,
  'backend',
  'questionnaire-service',
  'src',
  'utils',
  'enhanced-client.js'
);

const submissionControllerPath = path.join(
  __dirname,
  'backend',
  'questionnaire-service',
  'src',
  'controllers',
  'submission.controller.js'
);

// Fix 1: Update Enhanced Client to increase timeouts
function fixEnhancedClient() {
  console.log('Fixing enhanced client timeouts...');
  
  let content = fs.readFileSync(enhancedClientPath, 'utf8');
  
  // Update circuit breaker options to use a more reasonable timeout
  content = content.replace(
    /\s*timeout: 10000,/g,
    '    timeout: 30000, // Increased from 10000 to prevent token validation timeouts'
  );
  
  // Ensure the axios timeout is properly set from config
  content = content.replace(
    /\s*this\.axios = axios\.create\({.*?\}\);/s,
    `    this.axios = axios.create({
      timeout: config.enhancedConnectivity?.connectionTimeout || 10000 // Increased default from 5000 to 10000
    });`
  );
  
  fs.writeFileSync(enhancedClientPath, content, 'utf8');
  console.log('Enhanced client timeout settings updated.');
}

// Fix 2: Update Submission Controller to fix Prisma validation error
function fixSubmissionController() {
  console.log('Fixing submission controller Prisma validation issue...');
  
  let content = fs.readFileSync(submissionControllerPath, 'utf8');
  
  // The issue is likely in the findMany query - fix the syntax to ensure proper validation
  content = content.replace(
    /const submissions = await prisma\.submission\.findMany\({[\s\S]*?where: {[\s\S]*?userId: userId,[\s\S]*?status: 'draft'[\s\S]*?},[\s\S]*?include:[\s\S]*?{[\s\S]*?template: true,[\s\S]*?answers: true,[\s\S]*?_count:[\s\S]*?{[\s\S]*?select:[\s\S]*?{[\s\S]*?answers: true[\s\S]*?}[\s\S]*?}[\s\S]*?},[\s\S]*?orderBy:[\s\S]*?{[\s\S]*?updatedAt: 'desc'[\s\S]*?}[\s\S]*?\}\);/m,
    `const submissions = await prisma.submission.findMany({
      where: { 
        userId: String(userId), // Ensure userId is treated as a string for consistent comparison
        status: 'draft'
      },
      include: {
        template: true,
        answers: true,
        _count: {
          select: {
            answers: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });`
  );
  
  // Also ensure that any other Prisma queries in the same file use String conversion for userId
  content = content.replace(
    /const allUserSubmissions = await prisma\.submission\.findMany\({[\s\S]*?where: {[\s\S]*?userId: userId[\s\S]*?},/m,
    `const allUserSubmissions = await prisma.submission.findMany({
      where: {
        userId: String(userId) // Ensure userId is treated as a string for consistent comparison
      },`
  );
  
  fs.writeFileSync(submissionControllerPath, content, 'utf8');
  console.log('Submission controller Prisma query fixed.');
}

// Run the fixes
try {
  fixEnhancedClient();
  fixSubmissionController();
  console.log('All fixes successfully applied.');
} catch (error) {
  console.error('Error applying fixes:', error);
  process.exit(1);
}
