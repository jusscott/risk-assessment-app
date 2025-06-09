/**
 * Enhanced Seed Frameworks Script with improved error handling and retry logic
 */
const fetch = require('node-fetch');
const config = require('../src/config/config');

// When running in Docker, we need to use internal container hostname
// Default to self-referential endpoint using service name in Docker or localhost outside Docker
const isDocker = require('fs').existsSync('/.dockerenv');
// In Docker, use questionnaire-service hostname, otherwise localhost
const baseUrl = process.env.SERVICE_URL || (isDocker ? 'http://localhost:5002' : 'http://localhost:5002');
console.log(`Using service URL: ${baseUrl} (Docker environment: ${isDocker})`);
// Admin override key (this would be more secure in a real production app)
const adminOverrideKey = 'admin-temp-override';

// Maximum number of retries for API calls
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, retries = MAX_RETRIES, delay = RETRY_DELAY_MS) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Retry attempt due to error: ${error.message}. Retries left: ${retries}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return withRetry(fn, retries - 1, delay * 1.5);
  }
}

/**
 * Check if service is available
 */
async function checkServiceAvailability() {
  try {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    return data && data.status === 'ok';
  } catch (error) {
    console.error('Service health check failed:', error.message);
    return false;
  }
}

async function seedFrameworks() {
  console.log('Starting to seed framework templates...');

  try {
    // First check if service is available
    console.log('Checking if questionnaire service is available...');
    const isAvailable = await withRetry(checkServiceAvailability);
    
    if (!isAvailable) {
      throw new Error('Questionnaire service is not available after multiple attempts');
    }
    
    // Check the current state to see what frameworks are missing
    console.log('Checking current templates...');
    
    const statusResponse = await withRetry(() => fetch(`${baseUrl}/diagnostic/status`));
    const statusData = await statusResponse.json();

    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusData.error?.message || 'Unknown error'}`);
    }

    // Check if we already have templates
    const templateCount = statusData.data.database.templateCount;
    const missingTemplates = statusData.data.frameworks.missingTemplates || [];
    
    if (templateCount > 0) {
      console.log(`Found ${templateCount} templates already in database.`);
      
      if (missingTemplates.length === 0) {
        console.log('All framework templates are already seeded. No action needed.');
        return;
      }
      
      console.log(`Missing templates: ${missingTemplates.join(', ')}`);
    } else {
      console.log('No templates found in database. Will seed all frameworks.');
    }

    // Call the reseed endpoint to populate all templates
    console.log('Seeding database with framework templates...');
    
    const seedResponse = await withRetry(() => fetch(`${baseUrl}/diagnostic/reseed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-override': adminOverrideKey
      }
    }));

    const seedData = await seedResponse.json();
    
    if (!seedResponse.ok) {
      throw new Error(`Seeding failed: ${seedData.error?.message || 'Unknown error'}`);
    }

    console.log(`Successfully seeded database! Now have ${seedData.data.templateCount} templates.`);
    console.log('Frameworks should now appear in the "New Assessment" tab.');
  } catch (error) {
    console.error('Error seeding frameworks:', error);
    process.exit(1);
  }
}

// Run the script
seedFrameworks();
