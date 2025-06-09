const fs = require('fs');
const path = require('path');

// Path to the file with the syntax error
const filePath = path.resolve(__dirname, 'backend/api-gateway/src/middlewares/rate-limit.middleware.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find and fix the syntax error
const errorLinePattern = /logger\.warn\('Could not load redis modules, will use memory store instead', \{ error: error\.message \}[^)]/;
const correctedLine = "logger.warn('Could not load redis modules, will use memory store instead', { error: error.message });";

// Replace the line with the corrected version
const correctedContent = content.replace(errorLinePattern, correctedLine);

// Write the fixed content back to the file
fs.writeFileSync(filePath, correctedContent, 'utf8');

console.log('Syntax error fixed in rate-limit.middleware.js');
