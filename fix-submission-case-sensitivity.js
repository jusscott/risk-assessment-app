const fs = require('fs');
const path = require('path');

// Path to the submission controller
const controllerPath = path.join(__dirname, 'backend/questionnaire-service/src/controllers/submission.controller.js');

// Read the file content
let content = fs.readFileSync(controllerPath, 'utf8');

// Replace lowercase relation field names with capitalized versions in include statements
// Be specific with replacements to avoid changing other instances
content = content.replace(/include: {(\s*)template:/g, 'include: {$1Template:');
content = content.replace(/include: {(\s*)answers:/g, 'include: {$1Answer:');
content = content.replace(/template: {/g, 'Template: {');
content = content.replace(/answers: true/g, 'Answer: true');

// Also fix references to lowercase fields in the code
content = content.replace(/submission\.template\./g, 'submission.Template.');
content = content.replace(/submission\.answers\./g, 'submission.Answer.');
content = content.replace(/submission\.template\?/g, 'submission.Template?');
content = content.replace(/submissions\[0\]\.template\?/g, 'submissions[0].Template?');

// Handle special case for map operations on answers
content = content.replace(/submission\.answers\.forEach/g, 'submission.Answer.forEach');
content = content.replace(/uniqueAnsweredQuestionIds\.add\(answer\.questionId\)/g, 'uniqueAnsweredQuestionIds.add(answer.questionId)');

// Write the updated content back to the file
fs.writeFileSync(controllerPath, content);

console.log('Fixed case sensitivity issues in Prisma relation field names in submission.controller.js');
