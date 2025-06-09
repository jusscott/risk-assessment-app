/**
 * Test script for usage-based billing
 * This script simulates recording usage for a user and then processing the billing
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const config = require('../src/config/config');

const prisma = new PrismaClient();

// Default port if not specified in config
const port = config.app.port || 3003;
const testAuthToken = process.env.TEST_AUTH_TOKEN;

if (!testAuthToken) {
  console.error('ERROR: TEST_AUTH_TOKEN environment variable is required');
  console.error('Set it to a valid JWT token for testing');
  process.exit(1);
}

// Test user and subscription IDs (should exist in your database)
const TEST_USER_ID = process.env.TEST_USER_ID || '1';
const TEST_SUBSCRIPTION_ID = process.env.TEST_SUBSCRIPTION_ID || '1';

/**
 * Record usage for testing
 */
async function recordUsage() {
  try {
    console.log('Recording test usage...');
    
    // Record 10 assessments
    const usageResponse = await axios.post(
      `http://localhost:${port}/api/usage/record`,
      {
        userId: TEST_USER_ID,
        subscriptionId: TEST_SUBSCRIPTION_ID,
        usageType: 'assessment',
        quantity: 10,
        metadata: {
          source: 'test-script',
          timestamp: new Date().toISOString()
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (usageResponse.data && usageResponse.data.success) {
      console.log('Usage recorded successfully:', usageResponse.data.data);
      return true;
    } else {
      console.error('Failed to record usage:', usageResponse.data.error);
      return false;
    }
  } catch (error) {
    console.error('Error recording usage:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
    return false;
  }
}

/**
 * Process usage billing
 */
async function processUsageBilling() {
  try {
    console.log('Processing usage billing...');
    
    const response = await axios.post(
      `http://localhost:${port}/api/usage/process-billing`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
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
      return true;
    } else {
      console.error('Failed to process usage billing:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('Error processing usage billing:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
    return false;
  }
}

/**
 * Get user's subscription details
 */
async function getUserSubscription() {
  try {
    console.log(`Getting subscription details for user ${TEST_USER_ID}...`);
    
    const response = await axios.get(
      `http://localhost:${port}/api/usage/user/${TEST_USER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.success) {
      console.log('Subscription details:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.error('Failed to get subscription details:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('Error getting subscription details:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
    return false;
  }
}

// Run the test sequence
async function runTests() {
  try {
    // 1. Get the user's subscription details
    const gotSubscription = await getUserSubscription();
    if (!gotSubscription) {
      console.error('Failed to get subscription, aborting test');
      return;
    }
    
    // 2. Record some usage
    const recorded = await recordUsage();
    if (!recorded) {
      console.error('Failed to record usage, aborting test');
      return;
    }
    
    // 3. Process billing
    const processed = await processUsageBilling();
    if (!processed) {
      console.error('Failed to process billing');
      return;
    }
    
    // 4. Get updated subscription details
    await getUserSubscription();
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runTests()
  .catch(console.error);
