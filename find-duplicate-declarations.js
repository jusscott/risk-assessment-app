/**
 * Script to find and list all instances of `isQuestionnaireEndpoint` declarations
 * This will help identify where the duplicate declaration is occurring
 */
const fs = require('fs');
const path = require('path');

// Root directory for search
const projectRoot = __dirname;

// Function to recursively find files
function findFiles(dir, pattern) {
  let results = [];
  
  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('node_modules') && !file.startsWith('.git')) {
        // Recursively search directories
        results = results.concat(findFiles(filePath, pattern));
      } else if (stat.isFile() && file.endsWith('.js')) {
        // Check if the file content contains the pattern
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (pattern.test(content)) {
            results.push({ 
              path: filePath,
              content: content
            });
          }
        } catch (err) {
          console.error(`Error reading file ${filePath}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err.message}`);
  }
  
  return results;
}

// Function to analyze declarations in a file
function analyzeDeclarations(fileContent, pattern) {
  const regex = new RegExp(pattern, 'g');
  const matches = [];
  let match;
  
  while ((match = regex.exec(fileContent)) !== null) {
    const lineStart = fileContent.lastIndexOf('\n', match.index) + 1;
    const lineEnd = fileContent.indexOf('\n', match.index);
    const line = fileContent.substring(lineStart, lineEnd !== -1 ? lineEnd : fileContent.length);
    const lineNumber = (fileContent.substring(0, match.index).match(/\n/g) || []).length + 1;
    
    matches.push({
      line,
      lineNumber,
      position: match.index - lineStart,
      matchText: match[0]
    });
  }
  
  return matches;
}

// Main execution
function main() {
  console.log('Searching for duplicate declarations of isQuestionnaireEndpoint...\n');
  
  // Find files potentially containing the declaration
  const pattern = /\bconst\s+isQuestionnaireEndpoint\b/;
  const files = findFiles(projectRoot, pattern);
  
  console.log(`Found ${files.length} files with potential declarations\n`);
  
  // Analyze each file
  files.forEach(file => {
    const matches = analyzeDeclarations(file.content, pattern);
    
    if (matches.length > 1) {
      console.log(`\n=== DUPLICATE FOUND in ${file.path.replace(projectRoot, '')} ===`);
      console.log(`File has ${matches.length} declarations of isQuestionnaireEndpoint:\n`);
      
      matches.forEach((match, index) => {
        console.log(`[${index + 1}] Line ${match.lineNumber}: ${match.line.trim()}`);
      });
      
      console.log('\nRecommendation: Remove all but the first declaration.\n');
    } else if (matches.length === 1) {
      console.log(`File: ${file.path.replace(projectRoot, '')} has a single declaration at line ${matches[0].lineNumber}`);
    }
  });
  
  if (files.length === 0) {
    console.log('No files found containing isQuestionnaireEndpoint declarations.');
  } else {
    console.log('\nSearch complete. Check duplicate declarations and fix them by removing redundant ones.');
    console.log('After fixing, run the fix-questionnaire-loading-issues.js script to apply all fixes.');
  }
}

main();
