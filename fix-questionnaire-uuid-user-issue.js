const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing questionnaire service UUID user ID issue...');

const submissionControllerPath = path.join(__dirname, 'backend/questionnaire-service/src/controllers/submission.controller.js');

try {
  const content = fs.readFileSync(submissionControllerPath, 'utf8');
  
  // Fix the OR condition to handle UUID strings properly by removing problematic Number conversions
  const fixedContent = content.replace(
    /OR: \[\s*\{ userId: String\(userId\) \},\s*\{ userId: Number\(userId\) \},\s*\.\.\.\(isNaN\(Number\(userId\)\) \? \[\] : \[\{ userId: parseInt\(userId\) \}\]\)/g,
    'OR: [{ userId: String(userId) }]'
  ).replace(
    // Also fix similar patterns that might exist
    /userId: Number\(userId\)/g,
    'userId: String(userId)'
  ).replace(
    // Remove parseInt conversions in OR conditions
    /\.\.\.\(isNaN\(Number\(userId\)\) \? \[\] : \[\{ userId: parseInt\(userId\) \}\]\)/g,
    ''
  );

  // Write the fixed content
  fs.writeFileSync(submissionControllerPath, fixedContent);
  
  console.log('✅ Fixed UUID user ID handling in submission controller');
  
  // Also check if there are similar issues in other query patterns
  const furtherFixedContent = fs.readFileSync(submissionControllerPath, 'utf8');
  
  // Look for and fix any remaining problematic OR patterns
  const finalContent = furtherFixedContent.replace(
    /OR: \[\s*\{ userId: String\(userId\) \},\s*\{ userId: Number\(userId\) \},?\s*\]/g,
    'OR: [{ userId: String(userId) }]'
  ).replace(
    // Fix user ownership checks as well
    /const userOwnsSubmission = \(\s*submission\.userId === String\(userId\) \|\|\s*submission\.userId === Number\(userId\) \|\|\s*\(!isNaN\(Number\(userId\)\) && submission\.userId === parseInt\(userId\)\)\s*\);/g,
    'const userOwnsSubmission = (submission.userId === String(userId));'
  );
  
  fs.writeFileSync(submissionControllerPath, finalContent);
  
  console.log('✅ All UUID user ID issues fixed in submission controller');
  console.log('🚀 Ready to restart questionnaire service');
  
} catch (error) {
  console.error('❌ Error fixing submission controller:', error.message);
  process.exit(1);
}
