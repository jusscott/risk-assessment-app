/**
 * Fix for Prisma error on submissions GET endpoint
 * 
 * Error: Unknown field `questions` for include statement on model Submission
 * 
 * This script corrects the Prisma query structure in the submission controller
 * by removing the invalid direct "questions" include and ensuring the query
 * structure matches the actual schema relationships.
 */

const fs = require('fs');
const path = require('path');

// Path to the controller file
const controllerPath = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'controllers', 'submission.controller.js');

// Read the current content of the file
console.log(`Reading file: ${controllerPath}`);
const content = fs.readFileSync(controllerPath, 'utf8');

// Find the problematic query and replace it with the correct one
const incorrectPattern = /const submission = await prisma\.submission\.findUnique\(\{\s*where: \{ id: .*?\},\s*include: \{\s*Template: \{[^}]*\},\s*Answer: true,\s*questions: \{[^}]*\}\s*\}\s*\}\)/s;

const correctedQuery = `const submission = await prisma.submission.findUnique({
      where: { id: parseInt(id) },
      include: {
        Template: {
          include: {
            questions: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        Answer: true
      }
    })`;

// Check if the pattern exists in the file
if (!incorrectPattern.test(content)) {
  console.error('Could not find the exact pattern to replace. Please check the file manually.');
  process.exit(1);
}

// Replace the pattern
const correctedContent = content.replace(incorrectPattern, correctedQuery);

// Write the corrected content back to the file
fs.writeFileSync(controllerPath, correctedContent);

console.log('Successfully fixed the Prisma query in submission.controller.js');
console.log('The invalid "questions" include statement has been removed.');
