/**
 * fix-api-gateway-axios.js
 * 
 * This script installs the axios module in the API Gateway container.
 * The API Gateway's health check controller requires axios to monitor
 * the status of other services including the auth service.
 */

const { exec } = require('child_process');

// Execute the npm install command inside the API Gateway container
const installAxios = () => {
  return new Promise((resolve, reject) => {
    console.log('Installing axios in API Gateway container...');
    
    const command = 'docker exec api-gateway npm install axios --save';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error installing axios:', error);
        console.error('stderr:', stderr);
        reject(error);
        return;
      }
      
      console.log(stdout);
      console.log('Successfully installed axios in API Gateway container');
      resolve();
    });
  });
};

// Restart the API Gateway after installing the dependency
const restartApiGateway = () => {
  return new Promise((resolve, reject) => {
    console.log('Restarting API Gateway service...');
    
    const command = 'docker restart api-gateway';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error restarting API Gateway:', error);
        console.error('stderr:', stderr);
        reject(error);
        return;
      }
      
      console.log(stdout);
      console.log('Successfully restarted API Gateway service');
      resolve();
    });
  });
};

// Check API Gateway status to verify fix
const checkApiGatewayStatus = () => {
  return new Promise((resolve, reject) => {
    console.log('Checking API Gateway service status...');
    
    // Wait a bit to allow the service to start
    setTimeout(() => {
      const command = 'docker logs api-gateway --tail 20';
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error checking API Gateway status:', error);
          console.error('stderr:', stderr);
          reject(error);
          return;
        }
        
        console.log('API Gateway recent logs:');
        console.log('------------------------');
        console.log(stdout);
        
        if (stdout.includes('Successfully loaded Redis') && !stdout.includes('Cannot find module')) {
          console.log('API Gateway appears to be running correctly');
        } else {
          console.log('API Gateway may still have issues. Check the logs for details');
        }
        
        resolve();
      });
    }, 5000);
  });
};

// Main execution flow
const main = async () => {
  try {
    console.log('Starting fix for API Gateway axios module...');
    
    await installAxios();
    await restartApiGateway();
    await checkApiGatewayStatus();
    
    console.log('\nFix complete! The API Gateway should now be able to connect to the auth service.');
    console.log('If the issue persists, check the system logs for additional errors.');
  } catch (error) {
    console.error('An error occurred during the fix process:', error);
    process.exit(1);
  }
};

main();
