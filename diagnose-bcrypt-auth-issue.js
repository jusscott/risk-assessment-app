#!/usr/bin/env node

/**
 * Diagnostic Script: bcrypt Authentication Issue Investigation
 * 
 * This script investigates the bcrypt password verification regression
 * introduced after the questionnaire progress restoration fix.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 BCRYPT AUTHENTICATION REGRESSION DIAGNOSIS');
console.log('===============================================\n');

// Test 1: Check bcryptjs installation and version
console.log('1. CHECKING BCRYPTJS INSTALLATION');
console.log('--------------------------------');

const authServicePath = './backend/auth-service';
const packageJsonPath = path.join(authServicePath, 'package.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('✅ bcryptjs version:', packageJson.dependencies.bcryptjs);
  console.log('✅ @types/bcryptjs version:', packageJson.devDependencies['@types/bcryptjs']);
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

// Test 2: Check TypeScript configuration
console.log('\n2. CHECKING TYPESCRIPT CONFIGURATION');
console.log('------------------------------------');

const tsconfigPath = path.join(authServicePath, 'tsconfig.json');
try {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  console.log('✅ TypeScript target:', tsconfig.compilerOptions?.target);
  console.log('✅ Module resolution:', tsconfig.compilerOptions?.moduleResolution);
  console.log('✅ ES module interop:', tsconfig.compilerOptions?.esModuleInterop);
  console.log('✅ Allow synthetic imports:', tsconfig.compilerOptions?.allowSyntheticDefaultImports);
} catch (error) {
  console.log('❌ Error reading tsconfig.json:', error.message);
}

// Test 3: Check custom bcrypt type definitions
console.log('\n3. CHECKING CUSTOM BCRYPT TYPE DEFINITIONS');
console.log('------------------------------------------');

const customTypesPath = path.join(authServicePath, 'src', 'types', 'bcryptjs.d.ts');
try {
  const customTypes = fs.readFileSync(customTypesPath, 'utf8');
  console.log('✅ Custom bcryptjs types found');
  
  // Check for potential conflicts
  if (customTypes.includes('export = bcrypt')) {
    console.log('⚠️  Using CommonJS export style in custom types');
  }
  if (customTypes.includes('namespace bcrypt')) {
    console.log('⚠️  Using namespace declaration in custom types');
  }
} catch (error) {
  console.log('❌ Error reading custom types:', error.message);
}

// Test 4: Check auth controller import statement
console.log('\n4. CHECKING AUTH CONTROLLER IMPORT');
console.log('----------------------------------');

const authControllerPath = path.join(authServicePath, 'src', 'controllers', 'auth.controller.ts');
try {
  const authController = fs.readFileSync(authControllerPath, 'utf8');
  
  // Extract bcrypt import line
  const bcryptImportMatch = authController.match(/import.*bcrypt.*from.*['"]bcryptjs['"];?/);
  if (bcryptImportMatch) {
    console.log('✅ bcrypt import found:', bcryptImportMatch[0]);
  } else {
    console.log('❌ bcrypt import not found in expected format');
  }
  
  // Check for bcrypt usage
  const bcryptUsage = [
    { method: 'genSalt', found: authController.includes('bcrypt.genSalt') },
    { method: 'hash', found: authController.includes('bcrypt.hash') },
    { method: 'compare', found: authController.includes('bcrypt.compare') }
  ];
  
  bcryptUsage.forEach(usage => {
    console.log(`${usage.found ? '✅' : '❌'} bcrypt.${usage.method} usage: ${usage.found ? 'Found' : 'Not found'}`);
  });
  
} catch (error) {
  console.log('❌ Error reading auth controller:', error.message);
}

// Test 5: Check for compilation issues
console.log('\n5. CHECKING FOR TYPESCRIPT COMPILATION ISSUES');
console.log('---------------------------------------------');

const { execSync } = require('child_process');

try {
  console.log('Attempting TypeScript compilation check...');
  const result = execSync(`cd ${authServicePath} && npm run build`, { 
    encoding: 'utf8',
    timeout: 30000
  });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout || error.stderr || error.message);
}

// Test 6: Test bcrypt functionality directly
console.log('\n6. TESTING BCRYPT FUNCTIONALITY DIRECTLY');
console.log('----------------------------------------');

try {
  // Try to require bcryptjs directly
  const bcrypt = require(path.join(process.cwd(), authServicePath, 'node_modules', 'bcryptjs'));
  
  // Test basic functionality
  const testPassword = 'testPassword123';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(testPassword, salt);
  const isValid = bcrypt.compareSync(testPassword, hash);
  
  console.log('✅ bcryptjs basic functionality test passed');
  console.log(`   - Salt generated: ${salt.substring(0, 20)}...`);
  console.log(`   - Hash generated: ${hash.substring(0, 20)}...`);
  console.log(`   - Password verification: ${isValid}`);
  
} catch (error) {
  console.log('❌ bcryptjs functionality test failed:', error.message);
}

// Test 7: Check for conflicting modules
console.log('\n7. CHECKING FOR CONFLICTING MODULES');
console.log('-----------------------------------');

const nodeModulesPath = path.join(authServicePath, 'node_modules');
const potentialConflicts = ['bcrypt', 'bcryptjs', '@types/bcrypt', '@types/bcryptjs'];

potentialConflicts.forEach(moduleName => {
  const modulePath = path.join(nodeModulesPath, moduleName);
  try {
    if (fs.existsSync(modulePath)) {
      const packagePath = path.join(modulePath, 'package.json');
      if (fs.existsSync(packagePath)) {
        const modulePackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        console.log(`✅ ${moduleName}: v${modulePackage.version}`);
      } else {
        console.log(`⚠️  ${moduleName}: directory exists but no package.json`);
      }
    } else {
      console.log(`❌ ${moduleName}: not installed`);
    }
  } catch (error) {
    console.log(`❌ ${moduleName}: error checking - ${error.message}`);
  }
});

// Test 8: Check recent git changes
console.log('\n8. CHECKING RECENT GIT CHANGES TO AUTH SERVICE');
console.log('----------------------------------------------');

try {
  const gitLog = execSync(`cd ${authServicePath} && git log --oneline -10 --`, { 
    encoding: 'utf8',
    timeout: 10000
  });
  console.log('Recent commits affecting auth service:');
  console.log(gitLog);
} catch (error) {
  console.log('❌ Unable to check git history:', error.message);
}

console.log('\n🔍 DIAGNOSIS COMPLETE');
console.log('====================');
console.log('\nNext steps:');
console.log('1. Review the compilation errors if any');
console.log('2. Check for import/export conflicts between custom types and installed types');
console.log('3. Verify bcryptjs module is properly installed and accessible');
console.log('4. Test auth endpoints directly to confirm the issue');
