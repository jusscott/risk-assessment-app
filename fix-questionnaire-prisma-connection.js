const fs = require('fs');
const path = require('path');

// Path to Prisma schema
const prismaSchemaPath = path.join(__dirname, 'backend/questionnaire-service/prisma/schema.prisma');

console.log('Reading Prisma schema from:', prismaSchemaPath);

// Check if schema exists
if (!fs.existsSync(prismaSchemaPath)) {
  console.error('Prisma schema file not found at:', prismaSchemaPath);
  process.exit(1);
}

// Read schema content
let schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
console.log('Current schema content loaded');

// Check if datasource block has hardcoded url
const datasourceUrlRegex = /datasource\s+db\s+{\s+provider\s+=\s+"postgresql"\s+url\s+=\s+"([^"]+)"/s;
const match = schemaContent.match(datasourceUrlRegex);

if (match) {
  // Found hardcoded URL in schema
  const currentUrl = match[1];
  console.log('Found hardcoded database URL in schema:', currentUrl);
  
  if (currentUrl.includes('localhost:5432')) {
    // Update the URL to use port 5433
    const newUrl = currentUrl.replace('localhost:5432', 'localhost:5433');
    schemaContent = schemaContent.replace(currentUrl, newUrl);
    console.log('Updated hardcoded database URL to use port 5433');
    
    // Write updated schema back to file
    fs.writeFileSync(prismaSchemaPath, schemaContent);
    console.log('Schema updated successfully');
  } else {
    console.log('Hardcoded URL does not use port 5432, no change needed');
  }
} else {
  // Check if it's using env variable
  const envUrlRegex = /datasource\s+db\s+{\s+provider\s+=\s+"postgresql"\s+url\s+=\s+env\("([^"]+)"\)/s;
  const envMatch = schemaContent.match(envUrlRegex);
  
  if (envMatch) {
    const envVar = envMatch[1];
    console.log('Schema is using environment variable for database URL:', envVar);
    console.log('No change needed to schema file');
    
    // Check if the environment variable in use matches what's in .env file
    const envPath = path.join(__dirname, 'backend/questionnaire-service/.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      const dbUrlLine = envLines.find(line => line.startsWith(`${envVar}=`));
      if (dbUrlLine) {
        console.log(`Found ${envVar} in .env file:`, dbUrlLine);
        
        if (dbUrlLine.includes('localhost:5432')) {
          // Update the port in .env file
          const updatedEnvContent = envContent.replace(/localhost:5432/g, 'localhost:5433');
          fs.writeFileSync(envPath, updatedEnvContent);
          console.log('Updated port in .env file from 5432 to 5433');
        } else if (dbUrlLine.includes('localhost:5433')) {
          console.log('DATABASE_URL already using correct port 5433');
        } else {
          console.log('DATABASE_URL using a different host/port configuration');
        }
      } else {
        console.log(`${envVar} not found in .env file`);
      }
    }
  } else {
    console.log('Could not determine how database URL is configured in schema');
  }
}

// Now check for any hardcoded PostgreSQL connections in the codebase
console.log('\nChecking for hardcoded database port references in the code...');

// Directories to search in
const dirsToSearch = [
  path.join(__dirname, 'backend/questionnaire-service/src'),
  path.join(__dirname, 'backend/questionnaire-service/scripts')
];

// Function to search for hardcoded port references
function searchFilesForPortReferences(directory) {
  try {
    const files = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(directory, file.name);
      
      if (file.isDirectory()) {
        // Recursively search subdirectories
        searchFilesForPortReferences(filePath);
      } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
        // Check JavaScript and TypeScript files
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for hardcoded port references
        if (content.includes('localhost:5432') || content.includes('"port": 5432') || 
            content.includes("'port': 5432") || content.includes('port=5432') || 
            content.includes('port: 5432')) {
          
          console.log(`Found hardcoded port 5432 in: ${filePath}`);
          
          // Update the port references
          const updatedContent = content
            .replace(/localhost:5432/g, 'localhost:5433')
            .replace(/"port":\s*5432/g, '"port": 5433')
            .replace(/'port':\s*5432/g, "'port': 5433")
            .replace(/port=5432/g, 'port=5433')
            .replace(/port:\s*5432/g, 'port: 5433');
          
          fs.writeFileSync(filePath, updatedContent);
          console.log(`Updated port references in: ${filePath}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error searching directory ${directory}:`, error.message);
  }
}

// Search for hardcoded port references
dirsToSearch.forEach(dir => {
  if (fs.existsSync(dir)) {
    searchFilesForPortReferences(dir);
  } else {
    console.log(`Directory not found: ${dir}`);
  }
});

console.log('\nDatabase connection fix completed!');
