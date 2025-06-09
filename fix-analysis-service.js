const fs = require('fs');
const path = require('path');

console.log('Starting to fix analysis service...');

// Path to package.json
const packageJsonPath = path.join(__dirname, 'backend/analysis-service/package.json');

// Read the current package.json
let packageJson;
try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
  console.log('Successfully read package.json');
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// Add the missing 'ws' dependency if it doesn't exist
if (!packageJson.dependencies.ws) {
  console.log('Adding ws dependency to package.json');
  packageJson.dependencies.ws = '^8.13.0';  // Using a stable version
  
  // Write the updated package.json
  try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('Successfully updated package.json with ws dependency');
  } catch (error) {
    console.error('Error writing to package.json:', error.message);
    process.exit(1);
  }
} else {
  console.log('ws dependency already exists in package.json');
}

console.log('Fix completed. Please run the following commands to apply the fix:');
console.log('1. docker exec -it analysis-service npm install');
console.log('2. docker restart analysis-service');
