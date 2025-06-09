/**
 * API Gateway Restart Script (JavaScript version)
 * This script restarts the API Gateway by stopping any running instances and starting a new one.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('===== API GATEWAY RESTART =====');
console.log('Stopping any running API Gateway instances...');

// Function to run a shell command and return a Promise
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.warn(`Warning: ${error.message}`);
        // Don't reject on error, just continue
      }
      
      if (stderr) {
        console.warn(`Command stderr: ${stderr}`);
      }
      
      resolve(stdout);
    });
  });
}

// Kill any running API Gateway processes
async function killGatewayProcesses() {
  try {
    // Get process ID of any running API Gateway instances
    // This works on both macOS/Linux and should fail gracefully on Windows
    const findCmd = "ps aux | grep 'node.*api-gateway' | grep -v grep | awk '{print $2}'";
    const pids = await runCommand(findCmd);
    
    if (pids.trim()) {
      console.log(`Found running API Gateway processes: ${pids.trim()}`);
      
      // Kill each process
      for (const pid of pids.trim().split('\n')) {
        if (pid) {
          console.log(`Killing process ${pid}...`);
          await runCommand(`kill ${pid}`);
          
          // Wait a moment to ensure the process has time to shut down
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if process is still running and force kill if necessary
          const checkCmd = `ps -p ${pid} > /dev/null 2>&1 && echo "Running" || echo "Stopped"`;
          const status = (await runCommand(checkCmd)).trim();
          
          if (status === 'Running') {
            console.log(`Process ${pid} still running, force killing...`);
            await runCommand(`kill -9 ${pid}`);
          }
        }
      }
    } else {
      console.log('No running API Gateway instances found');
    }
  } catch (error) {
    console.warn(`Warning during process killing: ${error.message}`);
    // Continue even if there's an error, to attempt starting the service
  }
}

// Start the API Gateway
async function startGateway() {
  try {
    const gatewayRoot = path.resolve(__dirname, '..');
    console.log(`Starting API Gateway from ${gatewayRoot}...`);
    
    // Check if the gateway has a start script in package.json
    const packageJsonPath = path.join(gatewayRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.scripts && packageJson.scripts.start) {
        console.log('Using npm start script...');
        // Run npm start in a detached process
        const child = exec('npm start', { cwd: gatewayRoot, detached: true, stdio: 'ignore' });
        // Detach the child process
        child.unref();
        console.log('API Gateway started in background');
      } else {
        console.log('No start script found, starting index.js directly...');
        // Try to start index.js directly
        const indexPath = path.join(gatewayRoot, 'src/index.js');
        if (fs.existsSync(indexPath)) {
          const child = exec(`node ${indexPath}`, { cwd: gatewayRoot, detached: true, stdio: 'ignore' });
          child.unref();
          console.log('API Gateway started in background');
        } else {
          console.error('Error: Could not find index.js');
        }
      }
    } else {
      console.log('No package.json found, starting index.js directly...');
      // Try to start index.js directly
      const indexPath = path.join(gatewayRoot, 'src/index.js');
      if (fs.existsSync(indexPath)) {
        const child = exec(`node ${indexPath}`, { cwd: gatewayRoot, detached: true, stdio: 'ignore' });
        child.unref();
        console.log('API Gateway started in background');
      } else {
        console.error('Error: Could not find index.js');
      }
    }
  } catch (error) {
    console.error(`Error starting API Gateway: ${error.message}`);
  }
}

// Main function
async function main() {
  try {
    await killGatewayProcesses();
    await startGateway();
    console.log('===== API GATEWAY RESTART COMPLETE =====');
    console.log('You can now clear your browser cache and refresh the Plans page');
  } catch (error) {
    console.error(`Error during restart: ${error.message}`);
  }
}

// Run the main function
main();
