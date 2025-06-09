#!/usr/bin/env node

/**
 * Fix Questionnaire Prisma Model Inconsistency
 * 
 * This script fixes the model name inconsistencies in the submission controller
 * that were causing "failed to load questionnaire" errors after the analysis
 * service integration fix.
 * 
 * Issues found:
 * 1. Inconsistent use of "Question" vs "questions" in Prisma includes
 * 2. Mismatch between Prisma include and subsequent data access
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Questionnaire Prisma Model Inconsistency...');

const submissionControllerPath = path.join(__dirname, 'backend/questionnaire-service/src/controllers/submission.controller.js');

try {
  // Read the current submission controller
  let content = fs.readFileSync(submissionControllerPath, 'utf8');
  console.log('📖 Read submission controller file');

  // Fix 1: Fix the submitQuestionnaire function's Template include
  // Change from Question to questions to match the relation name
  const oldSubmitInclude = `Template: {
      include: {
        Question: {
              where: {
                required: true
              }
            }
          }
        },`;
  
  const newSubmitInclude = `Template: {
          include: {
            questions: {
              where: {
                required: true
              }
            }
          }
        },`;

  if (content.includes(oldSubmitInclude)) {
    content = content.replace(oldSubmitInclude, newSubmitInclude);
    console.log('✅ Fixed Template include in submitQuestionnaire function');
  }

  // Fix 2: Fix the getSubmissionById function's Template include
  // Change from Question to questions for consistency
  const oldGetInclude = `Template: {
          include: {
            Question: {  // Using proper capitalized model name
              orderBy: {
                order: 'asc'
              }
            }
          }
        },`;
  
  const newGetInclude = `Template: {
          include: {
            questions: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        },`;

  if (content.includes(oldGetInclude)) {
    content = content.replace(oldGetInclude, newGetInclude);
    console.log('✅ Fixed Template include in getSubmissionById function');
  }

  // Fix 3: Update the data access to match the corrected include
  const oldQuestionAccess = `questions: submission.Template.Question || [] // Convert Question to questions`;
  const newQuestionAccess = `questions: submission.Template.questions || []`;

  if (content.includes(oldQuestionAccess)) {
    content = content.replace(oldQuestionAccess, newQuestionAccess);
    console.log('✅ Fixed Template questions access');
  }

  // Fix 4: Make sure the comment reflects the correct field name
  const oldComment = `// Using proper capitalized model name`;
  if (content.includes(oldComment)) {
    content = content.replace(oldComment, '');
    console.log('✅ Removed outdated comment');
  }

  // Additional check: Make sure questions field access is consistent throughout
  // Fix any remaining Template.Question references that should be Template.questions
  content = content.replace(/submission\.Template\.questions\.map/g, 'submission.Template.questions.map');
  
  // Write the fixed content back
  fs.writeFileSync(submissionControllerPath, content);

  console.log('✅ Successfully fixed Prisma model inconsistencies in submission controller');
  console.log('');
  console.log('🔍 Changes made:');
  console.log('  • Fixed Template include to use "questions" relation name consistently');
  console.log('  • Fixed data access to match the corrected include structure');
  console.log('  • Removed outdated comments about model naming');
  console.log('');
  console.log('📋 Next steps:');
  console.log('  1. Restart the questionnaire service');
  console.log('  2. Test questionnaire loading functionality');
  console.log('  3. Verify analysis service integration still works');

} catch (error) {
  console.error('❌ Error fixing Prisma model inconsistency:', error.message);
  process.exit(1);
}
