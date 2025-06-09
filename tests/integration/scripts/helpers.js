/**
 * Helper functions for integration tests
 */

/**
 * Sleep for the specified number of milliseconds
 * @param {number} ms - Number of milliseconds to sleep
 * @returns {Promise<void>} - Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} delayMs - Base delay between retries in milliseconds
 * @param {boolean} exponential - Whether to use exponential backoff (default: true)
 * @returns {Promise<any>} - Result of the function if successful
 * @throws {Error} - Last error encountered if all retries fail
 */
async function retry(fn, maxRetries = 3, delayMs = 1000, exponential = true) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // For the first attempt, don't log "Retrying"
      if (attempt > 0) {
        console.log(`Retrying (attempt ${attempt}/${maxRetries})...`);
      }
      
      // Attempt to execute the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If this was the last attempt, don't wait
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay (with exponential backoff if enabled)
      const currentDelay = exponential ? delayMs * Math.pow(2, attempt) : delayMs;
      
      console.log(`Operation failed: ${error.message}. Waiting ${currentDelay}ms before retry.`);
      await sleep(currentDelay);
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Operation failed after multiple retries');
}

module.exports = {
  sleep,
  retry
};
