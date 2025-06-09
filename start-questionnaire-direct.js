/**
 * Direct script to start the questionnaire service without needing to change directories
 * This bypasses the need for npm start and directly runs the service's index.js
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Paths
const servicePath = path.join(__dirname, 'backend', 'questionnaire-service');
const indexPath = path.join(servicePath, 'src', 'index.js');

console.log('Starting Questionnaire Service...');
console.log(`Service path: ${servicePath}`);
console.log(`Index path: ${indexPath}`);

// Check if index.js exists
if (fs.existsSync(indexPath)) {
  console.log('Found index.js, starting service...');
  
  // Start the service using Node directly
  const nodeProcess = spawn('node', [indexPath], {
    cwd: servicePath,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: 5002 // Ensure we use the expected port
    }
  });
  
  nodeProcess.on('error', (err) => {
    console.error('Failed to start process:', err);
  });
  
  console.log('Questionnaire service should be starting. Process ID:', nodeProcess.pid);
  console.log('Press Ctrl+C to stop the service.');
} else {
  console.error('Error: Could not find index.js file at:', indexPath);
  console.error('Please check the file structure and try again.');
}
