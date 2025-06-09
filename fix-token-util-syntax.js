/**
 * Script to fix the syntax error in token.util.js
 */

const fs = require('fs');
const path = require('path');

// Define the file path
const filePath = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'utils', 'token.util.js');

console.log('Reading the token.util.js file...');
// Read the current content of the file
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing the syntax error...');
// Fix the broken try-catch block
// Find the problematic section and fix it
const problemPattern = /\/\/ Handle different token formats and ensure proper decoding\s+try\s+{\s+if \(!token\)/;
const replacement = '// Handle different token formats and ensure proper decoding\nif (!token)';

// Replace the pattern
const fixedContent = content.replace(problemPattern, replacement);

console.log('Writing the fixed content back to the file...');
// Write the fixed content back to the file
fs.writeFileSync(filePath, fixedContent);

console.log('Syntax error fixed successfully!');
