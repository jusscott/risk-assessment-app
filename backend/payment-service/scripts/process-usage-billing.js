/**
 * Script to process usage-based billing
 * This script is intended to be run as a scheduled job (e.g., via cron)
 * to periodically process usage records and generate invoices for overage charges
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const config = require('../src/config/config');

const prisma = new PrismaClient();

// Default port if not specified in config
const port = config.app.port || 3003;
const internalApiKey = config.internalApiKey || process.env.INTERNAL_API_KEY;

if (!internalApiKey) {
  console.error('ERROR: Internal API key is required');
  process.exit(1);
}

/**
 * Process usage-based billing
 */
async function processUsageBilling() {
  try {
    console.log('Starting usage billing processing...');
    
    // Make API call to process usage billing
    const response = await axios.post(
      `http://localhost:${port}/api/usage/process-billing`,
      {},
      {
        headers: {
          'x-api-key': internalApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.success) {
      const data = response.data.data;
      console.log(`Successfully processed ${data.totalProcessed} usage records`);
      
      for (const result of data.results) {
        if (result.invoiceId) {
          console.log(`Created invoice #${result.invoiceId} for user ${result.userId} with amount ${result.amount}`);
        } else {
          console.log(`Processed ${result.processedRecords} usage records for user ${result.userId} (no billing required)`);
        }
      }
    } else {
      console.error('Failed to process usage billing:', response.data.error);
    }
  } catch (error) {
    console.error('Error processing usage billing:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
processUsageBilling()
  .then(() => {
    console.log('Usage billing processing completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
