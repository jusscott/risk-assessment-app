const fs = require('fs');
const path = require('path');

// Path to diagnostic routes file
const routesFilePath = path.join(__dirname, 'backend/questionnaire-service/src/routes/diagnostic.routes.js');

console.log('Updating diagnostic routes to use correct database port...');

// Read the file content
let content = fs.readFileSync(routesFilePath, 'utf8');

// Create modified version of the diagnostic routes
const modifiedContent = content.replace(
  'const prisma = new PrismaClient();',
  `// Use custom connection options to explicitly set port to 5433
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:password@localhost:5433/questionnaires'
    },
  },
});`
);

// Write the file back
fs.writeFileSync(routesFilePath, modifiedContent);

console.log('✅ Diagnostic routes updated successfully');
console.log('Restart the service to apply changes');
