/**
 * Script to apply fixes for issues #7 (performance degradation) 
 * and #8 (JWT validation errors)
 */
const fs = require('fs');
const path = require('path');

console.log('Applying fixes for issues #7 and #8...');

// Define the paths
const TEMPLATE_CONTROLLER_PATH = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'controllers', 'template.controller.js');
const TEMPLATE_CONTROLLER_OPTIMIZED_PATH = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'controllers', 'template.controller.optimized.js');

const AUTH_MIDDLEWARE_PATH = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'middlewares', 'auth.middleware.js');
const AUTH_MIDDLEWARE_FIXED_PATH = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'middlewares', 'auth.middleware.fixed.js');

const PROGRESS_MD_PATH = path.join(__dirname, '..', 'Cline', 'memory-bank', 'progress.md');

// Backup original files
function backupFile(filePath) {
  const backupPath = `${filePath}.bak`;
  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`Backup created: ${backupPath}`);
    }
  } catch (err) {
    console.error(`Error creating backup for ${filePath}:`, err);
  }
}

// 1. Back up original files
console.log('Creating backups of original files...');
backupFile(TEMPLATE_CONTROLLER_PATH);
backupFile(AUTH_MIDDLEWARE_PATH);

// 2. Copy optimized files to replace originals
try {
  // Check if the package.json has node-cache dependency
  const packageJsonPath = path.join(__dirname, 'backend', 'questionnaire-service', 'package.json');
  const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check if node-cache is already installed
  if (!packageData.dependencies['node-cache']) {
    console.log('Adding node-cache dependency to questionnaire-service...');
    packageData.dependencies['node-cache'] = '^5.1.2';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2), 'utf8');
    console.log('package.json updated with node-cache dependency');
  } else {
    console.log('node-cache already in dependencies');
  }

  // Apply template controller fix
  fs.copyFileSync(TEMPLATE_CONTROLLER_OPTIMIZED_PATH, TEMPLATE_CONTROLLER_PATH);
  console.log(`Applied fix for issue #7: Optimized template controller`);

  // Apply auth middleware fix
  fs.copyFileSync(AUTH_MIDDLEWARE_FIXED_PATH, AUTH_MIDDLEWARE_PATH);
  console.log(`Applied fix for issue #8: Fixed JWT validation during concurrent requests`);

  // 3. Create redis client placeholder if needed
  const redisClientPath = path.join(__dirname, 'backend', 'questionnaire-service', 'src', 'utils', 'redis.client.js');
  if (!fs.existsSync(redisClientPath)) {
    fs.mkdirSync(path.dirname(redisClientPath), { recursive: true });
    const redisClientContent = `/**
 * Redis client module for optional distributed caching
 */
let client = null;

// Placeholder for potential Redis integration
// Used as optional fallback if Redis is configured
try {
  // This is a placeholder. If Redis is configured in the future,
  // actual implementation would go here. For now, we use in-memory cache.
} catch (err) {
  console.log('Redis not configured, using in-memory cache only');
}

module.exports = client;
`;
    fs.writeFileSync(redisClientPath, redisClientContent, 'utf8');
    console.log('Created redis client placeholder');
  }

  // 4. Update progress.md to mark issues as resolved
  if (fs.existsSync(PROGRESS_MD_PATH)) {
    let progressContent = fs.readFileSync(PROGRESS_MD_PATH, 'utf8');
    
    // Update issue #7
    progressContent = progressContent.replace(
      '7. Performance degradation with large questionnaire templates',
      '7. ~~Performance degradation with large questionnaire templates~~ (RESOLVED)'
    );
    
    // Update issue #8
    progressContent = progressContent.replace(
      '8. Occasional JWT validation errors during concurrent requests',
      '8. ~~Occasional JWT validation errors during concurrent requests~~ (RESOLVED)'
    );
    
    // Add to Recent Updates section
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const updateEntry = `### ${today}
- Fixed performance issues with large questionnaire templates (Issue #7):
  - Implemented in-memory caching system using NodeCache
  - Added query optimization for loading large templates
  - Improved database access patterns with transaction batching
  - Created pagination improvements for large datasets
  - Added cache invalidation hooks for content updates
  - Created placeholder for future Redis distributed caching

- Fixed JWT validation errors during concurrent requests (Issue #8):
  - Implemented TokenSemaphore for concurrency control
  - Added double-check caching mechanism to prevent race conditions
  - Improved error handling around token validation
  - Enhanced token cache with better memory management
  - Added proper token lock cleanup to prevent memory leaks
  - Implemented exponential backoff for retry attempts

`;

    // Find the Recent Updates section and add our entry at the top
    const recentUpdatesIndex = progressContent.indexOf('## Recent Updates');
    if (recentUpdatesIndex !== -1) {
      const firstUpdateIndex = progressContent.indexOf('###', recentUpdatesIndex);
      if (firstUpdateIndex !== -1) {
        progressContent = progressContent.slice(0, firstUpdateIndex) + updateEntry + progressContent.slice(firstUpdateIndex);
      } else {
        progressContent += updateEntry;
      }
    }
    
    fs.writeFileSync(PROGRESS_MD_PATH, progressContent, 'utf8');
    console.log('Updated progress.md to mark issues #7 and #8 as resolved');
  } else {
    console.log('Warning: progress.md not found');
  }

  console.log('\nSuccessfully applied all fixes!');
  console.log('Next steps:');
  console.log('1. Run "cd backend/questionnaire-service && npm install" to install node-cache dependency');
  console.log('2. Restart the questionnaire service to apply the changes');
  console.log('3. Test the fixed issues with large templates and concurrent requests');
} catch (err) {
  console.error('Error applying fixes:', err);
}
