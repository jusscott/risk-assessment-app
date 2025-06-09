/**
 * API Gateway Port Fix
 * 
 * This script fixes the port mismatch issue between the API Gateway service
 * and Docker configuration. The API Gateway code is using port 5050 by default,
 * but Docker is configured to expose port 5000 and health checks are looking for
 * the service on port 5000.
 * 
 * The fix adds a PORT environment variable to the api-gateway service in docker-compose.yml
 * to ensure the service runs on port 5000 internally.
 */

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Path to the docker-compose.yml file
const dockerComposePath = path.join(__dirname, 'docker-compose.yml');

try {
  console.log('Reading docker-compose.yml...');
  
  // Read the docker-compose.yml file
  const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
  
  // Parse the YAML content
  const dockerCompose = yaml.load(dockerComposeContent);
  
  // Check if api-gateway service exists
  if (!dockerCompose.services || !dockerCompose.services['api-gateway']) {
    console.error('Error: api-gateway service not found in docker-compose.yml');
    process.exit(1);
  }
  
  // Set the PORT environment variable to 5000
  if (!dockerCompose.services['api-gateway'].environment) {
    dockerCompose.services['api-gateway'].environment = [];
  }
  
  const apiGatewayEnv = dockerCompose.services['api-gateway'].environment;
  
  // Remove existing PORT entry if it exists
  const portEnvIndex = apiGatewayEnv.findIndex(env => 
    typeof env === 'string' && env.startsWith('PORT=')
  );
  
  if (portEnvIndex !== -1) {
    apiGatewayEnv[portEnvIndex] = 'PORT=5000';
    console.log('Updated existing PORT environment variable to 5000');
  } else {
    apiGatewayEnv.push('PORT=5000');
    console.log('Added PORT=5000 environment variable');
  }
  
  // Write the updated content back to docker-compose.yml
  const updatedContent = yaml.dump(dockerCompose, { lineWidth: 120 });
  fs.writeFileSync(dockerComposePath, updatedContent, 'utf8');
  
  console.log('Successfully updated docker-compose.yml');
  console.log('The api-gateway service now has PORT=5000 set in its environment variables.');
  console.log('This aligns with the Docker health check which expects the service to be running on port 5000.');
  console.log('\nTo apply changes, restart the services with:');
  console.log('  docker-compose down && docker-compose up -d');

} catch (error) {
  console.error('Error updating docker-compose.yml:', error.message);
  process.exit(1);
}
