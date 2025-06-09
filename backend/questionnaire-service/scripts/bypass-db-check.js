/**
 * Database Check Bypass Script
 * 
 * This script patches the database connectivity checks to allow
 * testing without a real database connection.
 */

const fs = require('fs');
const path = require('path');

// Create backup of a file before modifying it
function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.bak`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`Backup created: ${backupPath}`);
    }
  }
}

// Create mock prisma client module
function createMockPrismaModule() {
  const mocksDir = path.join(__dirname, '..', 'src', 'mocks');
  if (!fs.existsSync(mocksDir)) {
    fs.mkdirSync(mocksDir, { recursive: true });
  }
  
  const mockPrismaPath = path.join(mocksDir, 'mock-prisma-client.js');
  const mockPrismaContent = `
/**
 * Mock Prisma Client
 * 
 * This module provides mock implementations of Prisma client functions
 * for testing without a database connection.
 */

const mockData = require('./mock-data');

// Create mock client instance
const mockPrismaClient = {
  // Mock template operations
  template: {
    findMany: async () => mockData.templates,
    findUnique: async ({ where }) => {
      if (!where || !where.id) return null;
      return mockData.templates.find(t => t.id === where.id) || null;
    },
    create: async ({ data }) => {
      const newTemplate = { ...data, id: 'template-' + Date.now() };
      mockData.templates.push(newTemplate);
      return newTemplate;
    },
    update: async ({ where, data }) => {
      const template = mockData.templates.find(t => t.id === where.id);
      if (!template) throw new Error('Template not found');
      Object.assign(template, data);
      return template;
    },
    delete: async ({ where }) => {
      const index = mockData.templates.findIndex(t => t.id === where.id);
      if (index === -1) throw new Error('Template not found');
      const [deletedTemplate] = mockData.templates.splice(index, 1);
      return deletedTemplate;
    }
  },
  
  // Mock submission operations
  submission: {
    findMany: async () => mockData.submissions,
    findUnique: async ({ where }) => {
      if (!where || !where.id) return null;
      return mockData.submissions.find(s => s.id === where.id) || null;
    },
    create: async ({ data }) => {
      const newSubmission = { ...data, id: 'submission-' + Date.now() };
      mockData.submissions.push(newSubmission);
      return newSubmission;
    },
    update: async ({ where, data }) => {
      const submission = mockData.submissions.find(s => s.id === where.id);
      if (!submission) throw new Error('Submission not found');
      Object.assign(submission, data);
      return submission;
    }
  },
  
  // Mock user operations
  user: {
    findMany: async () => mockData.users,
    findUnique: async ({ where }) => {
      if (!where) return null;
      if (where.id) return mockData.users.find(u => u.id === where.id) || null;
      if (where.email) return mockData.users.find(u => u.email === where.email) || null;
      return null;
    }
  },
  
  // Mock raw query execution
  $queryRaw: async () => [],
  
  // Mock transactions
  $transaction: async (operations) => {
    return Promise.all(operations);
  }
};

// Export mock client factory
module.exports = {
  PrismaClient: function() {
    return mockPrismaClient;
  }
};
  `.trim();
  
  fs.writeFileSync(mockPrismaPath, mockPrismaContent);
  console.log(`Created mock Prisma client: ${mockPrismaPath}`);
}

// Patch the config.js file to use mock environment
function patchConfigFile() {
  const configPath = path.join(__dirname, '..', 'src', 'config', 'config.js');
  if (!fs.existsSync(configPath)) {
    console.error('Config file not found:', configPath);
    return;
  }
  
  createBackup(configPath);
  
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Add database bypass configuration
  if (!configContent.includes('BYPASS_DB_VALIDATION')) {
    const patchedContent = configContent.replace(
      'module.exports = {',
      `module.exports = {
  // Mock database configuration
  bypassDbValidation: process.env.BYPASS_DB_VALIDATION === 'true',
  mockPrismaClient: process.env.MOCK_PRISMA_CLIENT === 'true',
  templateCheckSkipDb: process.env.TEMPLATE_CHECK_SKIP_DB === 'true',
`
    );
    
    fs.writeFileSync(configPath, patchedContent);
    console.log('Updated config file with bypass settings');
  }
}

// Patch the prisma client instantiation
function patchPrismaClient() {
  // Create a file that can be used to override the Prisma client
  const prismaUtilPath = path.join(__dirname, '..', 'src', 'utils', 'prisma-client.js');
  
  const prismaUtilContent = `
/**
 * Prisma Client Utility
 * 
 * This module provides a factory function for creating a Prisma client
 * that can be replaced with a mock for testing.
 */

let { PrismaClient } = require('@prisma/client');
const config = require('../config/config');

// Use mock client if configured
if (config.mockPrismaClient) {
  try {
    const mockPrisma = require('../mocks/mock-prisma-client');
    PrismaClient = mockPrisma.PrismaClient;
    console.log('Using mock Prisma client for database operations');
  } catch (error) {
    console.error('Failed to load mock Prisma client, using real client:', error.message);
  }
}

// Create and export client instance
const prisma = new PrismaClient();
module.exports = prisma;
  `.trim();
  
  // Ensure directory exists
  const prismaUtilDir = path.dirname(prismaUtilPath);
  if (!fs.existsSync(prismaUtilDir)) {
    fs.mkdirSync(prismaUtilDir, { recursive: true });
  }
  
  fs.writeFileSync(prismaUtilPath, prismaUtilContent);
  console.log(`Created Prisma client utility: ${prismaUtilPath}`);
}

// Patch the fix-template-issues.sh script to bypass database checks
function patchTemplateIssuesScript() {
  const scriptPath = path.join(__dirname, 'fix-template-issues.sh');
  if (fs.existsSync(scriptPath)) {
    createBackup(scriptPath);
    
    let scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Add check for database bypass flag
    const patchedContent = scriptContent.replace(
      '# Step 2: Checking Database Connectivity',
      `# Step 2: Checking Database Connectivity
if [ "$TEMPLATE_CHECK_SKIP_DB" = "true" ]; then
  echo -e "${GREEN}✓ Database check bypassed - Using mock database${RESET}"
  echo
else`
    );
    
    // Add closing bracket for the if statement
    const finalContent = patchedContent.replace(
      'Database connection failed. Cannot proceed with template checks.',
      'Database connection failed. Cannot proceed with template checks.\nfi'
    );
    
    fs.writeFileSync(scriptPath, finalContent);
    console.log('Updated fix-template-issues.sh with database bypass check');
  } else {
    console.warn('Warning: fix-template-issues.sh not found');
  }
}

// Main execution
try {
  console.log('Applying database check bypasses...');
  
  // Create mock prisma client
  createMockPrismaModule();
  
  // Apply patches
  patchConfigFile();
  patchPrismaClient();
  patchTemplateIssuesScript();
  
  console.log('Database check bypasses applied successfully!');
} catch (error) {
  console.error('Error applying database check bypasses:', error);
  process.exit(1);
}
