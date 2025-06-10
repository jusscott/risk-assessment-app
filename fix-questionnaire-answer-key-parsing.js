#!/usr/bin/env node

console.log('=== FIXING QUESTIONNAIRE ANSWER KEY PARSING ISSUE ===');
console.log('Timestamp:', new Date().toISOString());
console.log();

const fs = require('fs');
const path = require('path');

const submissionControllerPath = path.join(__dirname, 'backend/questionnaire-service/src/controllers/submission.controller.js');

console.log('1. Reading current submission controller...');
const currentContent = fs.readFileSync(submissionControllerPath, 'utf8');

console.log('2. Checking for the problematic code section...');
const problemSection = `// Convert answers object to array format if needed
    let answersArray = [];
    if (Array.isArray(answers)) {
      // Already an array, use as is
      answersArray = answers;
    } else if (typeof answers === 'object' && answers !== null) {
      // Convert object format {"1": "answer", "2": "another answer"} to array format
      answersArray = Object.entries(answers).map(([questionId, value]) => ({
        questionId: parseInt(questionId),
        value: value
      }));
    } else {
      throw new Error('Invalid answers format');
    }`;

if (currentContent.includes('parseInt(questionId)')) {
  console.log('3. Found problematic parseInt(questionId) code - applying fix...');
  
  const fixedSection = `// Convert answers object to array format if needed
    let answersArray = [];
    if (Array.isArray(answers)) {
      // Already an array, use as is
      answersArray = answers;
    } else if (typeof answers === 'object' && answers !== null) {
      // Handle both numeric keys ("1", "2") and question keys ("q1", "q2")
      answersArray = Object.entries(answers).map(([questionKey, value]) => {
        let questionId;
        
        // If key starts with 'q', extract the number (e.g., "q1" -> 1)
        if (typeof questionKey === 'string' && questionKey.startsWith('q')) {
          const numericPart = questionKey.substring(1);
          questionId = parseInt(numericPart);
        } else {
          // Direct numeric conversion for keys like "1", "2"
          questionId = parseInt(questionKey);
        }
        
        // Validate that we got a valid number
        if (isNaN(questionId)) {
          console.error(\`Invalid question key: \${questionKey} - could not convert to numeric ID\`);
          throw new Error(\`Invalid question identifier: \${questionKey}\`);
        }
        
        return {
          questionId: questionId,
          value: value
        };
      }));
    } else {
      throw new Error('Invalid answers format');
    }`;
  
  const updatedContent = currentContent.replace(problemSection, fixedSection);
  
  console.log('4. Writing fixed content to file...');
  fs.writeFileSync(submissionControllerPath, updatedContent, 'utf8');
  
  console.log('5. Fix applied successfully!');
  console.log();
  console.log('SUMMARY:');
  console.log('- Fixed parsing of question keys like "q1", "q2" to extract numeric IDs');
  console.log('- Added validation to prevent NaN values from reaching Prisma');
  console.log('- Maintained backward compatibility with direct numeric keys');
  console.log();
  console.log('Now restart the questionnaire service to apply the fix:');
  console.log('docker-compose restart questionnaire-service');
  
} else {
  console.log('3. Could not find the expected problematic code section.');
  console.log('The file may have already been fixed or the code structure has changed.');
  console.log('Please check the submission controller manually.');
}
