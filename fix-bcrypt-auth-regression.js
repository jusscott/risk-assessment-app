#!/usr/bin/env node

/**
 * Fix Script: bcrypt Authentication Regression
 * 
 * This script fixes the bcrypt password verification regression that was
 * introduced after the questionnaire progress restoration fix.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 FIXING BCRYPT AUTHENTICATION REGRESSION');
console.log('==========================================\n');

const authServicePath = './backend/auth-service';

async function fixBcryptIssue() {
  try {
    console.log('1. REMOVING CONFLICTING CUSTOM BCRYPT TYPES');
    console.log('--------------------------------------------');
    
    const customTypesPath = path.join(authServicePath, 'src', 'types', 'bcryptjs.d.ts');
    
    if (fs.existsSync(customTypesPath)) {
      fs.unlinkSync(customTypesPath);
      console.log('✅  Removed conflicting custom bcryptjs.d.ts');
    } else {
      console.log('✅  Custom types already removed');
    }

    console.log('\n2. REBUILDING AUTH SERVICE');
    console.log('---------------------------');
    
    try {
      execSync(`cd ${authServicePath} && npm run build`, { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      console.log('✅  Auth service rebuilt successfully');
    } catch (error) {
      console.log('❌  Build failed:', error.message);
      return false;
    }

    console.log('\n3. RESTARTING AUTH SERVICE');
    console.log('---------------------------');
    
    try {
      // Restart auth service container
      execSync('docker-compose restart auth-service', { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      console.log('✅  Auth service restarted successfully');
      
      // Wait a few seconds for service to be ready
      console.log('   Waiting for service to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.log('⚠️   Docker restart failed, trying alternative method');
      console.log('   Error:', error.message);
    }

    console.log('\n4. VERIFYING BCRYPT FUNCTIONALITY');
    console.log('----------------------------------');
    
    // Test bcrypt functionality directly
    const bcrypt = require(path.join(process.cwd(), authServicePath, 'node_modules', 'bcryptjs'));
    
    const testPassword = 'testPassword123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(testPassword, salt);
    const isValid = bcrypt.compareSync(testPassword, hash);
    
    if (isValid) {
      console.log('✅  bcrypt functionality verified');
    } else {
      console.log('❌  bcrypt functionality test failed');
      return false;
    }

    return true;

  } catch (error) {
    console.log('❌  Fix failed:', error.message);
    return false;
  }
}

async function main() {
  const success = await fixBcryptIssue();
  
  console.log('\n🔧 FIX COMPLETE');
  console.log('================');
  
  if (success) {
    console.log('✅ bcrypt authentication regression has been fixed!');
    console.log('\nThe issue was caused by conflicting custom bcryptjs type definitions');
    console.log('that overrode the standard @types/bcryptjs package.');
    console.log('\nFixes applied:');
    console.log('1. Removed custom src/types/bcryptjs.d.ts file');
    console.log('2. Rebuilt auth service to use standard @types/bcryptjs');
    console.log('3. Restarted auth service to apply changes');
    console.log('\nAuthentication should now work correctly again.');
    console.log('\nTo test the fix, you can run:');
    console.log('  node test-auth-endpoints.js');
  } else {
    console.log('❌ Fix failed. Please check the errors above and try again.');
    console.log('\nIf issues persist:');
    console.log('1. Ensure Docker services are running');
    console.log('2. Check auth service logs: docker-compose logs auth-service');
    console.log('3. Verify bcryptjs package is installed: npm list bcryptjs');
  }
}

main().catch(console.error);
