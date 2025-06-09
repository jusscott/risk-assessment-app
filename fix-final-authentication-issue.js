#!/usr/bin/env node

/**
 * Final Authentication Issue Fix
 * 
 * This script fixes the final authentication hurdle by:
 * 1. Creating the missing user jusscott@gmail.com directly in database
 * 2. Testing the authentication flow end-to-end
 * 3. Verifying API Gateway routing for auth endpoints
 * 4. Providing comprehensive verification of the fix
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ANSI color codes for output formatting
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m'
};

// Configuration
const TARGET_EMAIL = 'jusscott@gmail.com';
const TARGET_PASSWORD = 'Password123';
const API_GATEWAY_URL = 'http://localhost:3000';
const AUTH_SERVICE_URL = 'http://localhost:5001';

function log(message, color = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
    console.log(`\n${colors.cyan}${colors.bright}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, colors.green);
}

function logError(message) {
    log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
    log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, colors.blue);
}

async function runCommand(command, description) {
    try {
        logInfo(`Running: ${description}`);
        log(`Command: ${command}`, colors.dim);
        
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && !stderr.includes('warning')) {
            logWarning(`Stderr: ${stderr}`);
        }
        
        return { success: true, output: stdout, error: stderr };
    } catch (error) {
        logError(`Failed: ${description}`);
        logError(`Error: ${error.message}`);
        return { success: false, output: null, error: error.message };
    }
}

async function createUserDirectly() {
    logHeader('Creating Missing User Directly in Database');
    
    const createUserScript = `
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createUser() {
    const prisma = new PrismaClient();
    
    try {
        console.log('Connecting to database...');
        
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: '${TARGET_EMAIL}' }
        });
        
        if (existingUser) {
            console.log('USER_ALREADY_EXISTS');
            await prisma.\$disconnect();
            return;
        }
        
        // Create organization first
        const organization = await prisma.organization.create({
            data: {
                name: 'Risk Assessment Company'
            }
        });
        
        console.log('Organization created:', organization.id);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('${TARGET_PASSWORD}', salt);
        
        console.log('Password hashed successfully');
        
        // Create user
        const user = await prisma.user.create({
            data: {
                email: '${TARGET_EMAIL}',
                password: hashedPassword,
                firstName: 'Justin',
                lastName: 'Scott',
                role: 'ADMIN',
                organizationId: organization.id
            }
        });
        
        console.log('USER_CREATED_SUCCESS');
        console.log('User ID:', user.id);
        console.log('Email:', user.email);
        console.log('Organization:', organization.name);
        
        // Verify the password hash works
        const passwordCheck = await bcrypt.compare('${TARGET_PASSWORD}', user.password);
        console.log('Password verification:', passwordCheck ? 'SUCCESS' : 'FAILED');
        
        await prisma.\$disconnect();
        
    } catch (error) {
        console.error('CREATE_USER_ERROR:', error.message);
        await prisma.\$disconnect();
        process.exit(1);
    }
}

createUser();
`;

    // Write the user creation script to a file first
    await runCommand(
        `cat > /tmp/create_user.js << 'EOF'
${createUserScript}
EOF`,
        'Creating user creation script'
    );
    
    const result = await runCommand(
        'cd risk-assessment-app && docker exec risk-assessment-app-auth-service-1 node -e "' +
        'const { PrismaClient } = require(\'@prisma/client\'); ' +
        'const bcrypt = require(\'bcryptjs\'); ' +
        'async function createUser() { ' +
        '  const prisma = new PrismaClient(); ' +
        '  try { ' +
        '    console.log(\'Connecting to database...\'); ' +
        '    const existingUser = await prisma.user.findUnique({ where: { email: \'' + TARGET_EMAIL + '\' } }); ' +
        '    if (existingUser) { ' +
        '      console.log(\'USER_ALREADY_EXISTS\'); ' +
        '      await prisma.$disconnect(); ' +
        '      return; ' +
        '    } ' +
        '    const organization = await prisma.organization.create({ data: { name: \'Risk Assessment Company\' } }); ' +
        '    console.log(\'Organization created:\', organization.id); ' +
        '    const salt = await bcrypt.genSalt(10); ' +
        '    const hashedPassword = await bcrypt.hash(\'' + TARGET_PASSWORD + '\', salt); ' +
        '    console.log(\'Password hashed successfully\'); ' +
        '    const user = await prisma.user.create({ ' +
        '      data: { ' +
        '        email: \'' + TARGET_EMAIL + '\', ' +
        '        password: hashedPassword, ' +
        '        firstName: \'Justin\', ' +
        '        lastName: \'Scott\', ' +
        '        role: \'ADMIN\', ' +
        '        organizationId: organization.id ' +
        '      } ' +
        '    }); ' +
        '    console.log(\'USER_CREATED_SUCCESS\'); ' +
        '    console.log(\'User ID:\', user.id); ' +
        '    console.log(\'Email:\', user.email); ' +
        '    console.log(\'Organization:\', organization.name); ' +
        '    const passwordCheck = await bcrypt.compare(\'' + TARGET_PASSWORD + '\', user.password); ' +
        '    console.log(\'Password verification:\', passwordCheck ? \'SUCCESS\' : \'FAILED\'); ' +
        '    await prisma.$disconnect(); ' +
        '  } catch (error) { ' +
        '    console.error(\'CREATE_USER_ERROR:\', error.message); ' +
        '    await prisma.$disconnect(); ' +
        '    process.exit(1); ' +
        '  } ' +
        '} ' +
        'createUser();"',
        'Creating user directly in database via Docker'
    );
    
    if (result.success) {
        log(result.output);
        
        if (result.output.includes('USER_CREATED_SUCCESS')) {
            logSuccess(`User ${TARGET_EMAIL} created successfully`);
            return true;
        } else if (result.output.includes('USER_ALREADY_EXISTS')) {
            logSuccess(`User ${TARGET_EMAIL} already exists`);
            return true;
        } else {
            logError('User creation did not complete successfully');
            return false;
        }
    } else {
        logError('Failed to create user directly in database');
        return false;
    }
}

async function testAuthEndpoints() {
    logHeader('Testing Authentication Endpoints');
    
    // Test different endpoint variations
    const endpoints = [
        { url: `${API_GATEWAY_URL}/auth/login`, name: 'API Gateway /auth/login' },
        { url: `${API_GATEWAY_URL}/api/auth/login`, name: 'API Gateway /api/auth/login' },
        { url: `${AUTH_SERVICE_URL}/auth/login`, name: 'Direct Auth Service /auth/login' },
        { url: `${AUTH_SERVICE_URL}/login`, name: 'Direct Auth Service /login' }
    ];
    
    const loginData = JSON.stringify({
        email: TARGET_EMAIL,
        password: TARGET_PASSWORD
    });
    
    let successfulLogin = null;
    
    for (const endpoint of endpoints) {
        logInfo(`Testing ${endpoint.name}`);
        
        const result = await runCommand(
            `curl -s -X POST -H "Content-Type: application/json" -d '${loginData}' ${endpoint.url}`,
            `Testing ${endpoint.name}`
        );
        
        if (result.success && result.output) {
            try {
                const response = JSON.parse(result.output);
                
                if (response.success && response.data && response.data.user) {
                    logSuccess(`✅ Login successful via ${endpoint.name}`);
                    log(`User: ${response.data.user.firstName} ${response.data.user.lastName}`);
                    log(`Email: ${response.data.user.email}`);
                    log(`Role: ${response.data.user.role}`);
                    if (response.data.tokens && response.data.tokens.accessToken) {
                        log(`Access Token: ${response.data.tokens.accessToken.substring(0, 20)}...`);
                    }
                    successfulLogin = endpoint;
                    break;
                } else if (response.error) {
                    logWarning(`❌ ${endpoint.name}: ${response.error.message}`);
                } else {
                    logWarning(`❌ ${endpoint.name}: Unexpected response format`);
                }
            } catch (parseError) {
                logWarning(`❌ ${endpoint.name}: Invalid JSON response: ${result.output.substring(0, 100)}`);
            }
        } else {
            logWarning(`❌ ${endpoint.name}: Request failed`);
        }
    }
    
    return successfulLogin;
}

async function testRegistrationEndpoints() {
    logHeader('Testing Registration Endpoints');
    
    // Test different endpoint variations for registration
    const endpoints = [
        { url: `${API_GATEWAY_URL}/auth/register`, name: 'API Gateway /auth/register' },
        { url: `${API_GATEWAY_URL}/api/auth/register`, name: 'API Gateway /api/auth/register' },
        { url: `${AUTH_SERVICE_URL}/auth/register`, name: 'Direct Auth Service /auth/register' },
        { url: `${AUTH_SERVICE_URL}/register`, name: 'Direct Auth Service /register' }
    ];
    
    const testEmail = `test-${Date.now()}@example.com`;
    const registerData = JSON.stringify({
        email: testEmail,
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Organization'
    });
    
    let workingEndpoint = null;
    
    for (const endpoint of endpoints) {
        logInfo(`Testing ${endpoint.name}`);
        
        const result = await runCommand(
            `curl -s -X POST -H "Content-Type: application/json" -d '${registerData}' ${endpoint.url}`,
            `Testing ${endpoint.name}`
        );
        
        if (result.success && result.output) {
            try {
                const response = JSON.parse(result.output);
                
                if (response.success && response.data && response.data.user) {
                    logSuccess(`✅ Registration successful via ${endpoint.name}`);
                    log(`User: ${response.data.user.firstName} ${response.data.user.lastName}`);
                    log(`Email: ${response.data.user.email}`);
                    workingEndpoint = endpoint;
                    break;
                } else if (response.error) {
                    logWarning(`❌ ${endpoint.name}: ${response.error.message}`);
                } else {
                    logWarning(`❌ ${endpoint.name}: Unexpected response format`);
                }
            } catch (parseError) {
                logWarning(`❌ ${endpoint.name}: Invalid JSON response: ${result.output.substring(0, 100)}`);
            }
        } else {
            logWarning(`❌ ${endpoint.name}: Request failed`);
        }
    }
    
    return workingEndpoint;
}

async function verifyUserExists() {
    logHeader('Verifying User Exists in Database');
    
    const result = await runCommand(
        'cd risk-assessment-app && docker exec risk-assessment-app-auth-service-1 node -e "' +
        'const { PrismaClient } = require(\'@prisma/client\'); ' +
        'async function checkUser() { ' +
        '  const prisma = new PrismaClient(); ' +
        '  try { ' +
        '    const user = await prisma.user.findUnique({ ' +
        '      where: { email: \'' + TARGET_EMAIL + '\' }, ' +
        '      include: { organization: { select: { name: true } } } ' +
        '    }); ' +
        '    if (user) { ' +
        '      console.log(\'USER_FOUND\'); ' +
        '      console.log(\'Email:\', user.email); ' +
        '      console.log(\'Name:\', user.firstName, user.lastName); ' +
        '      console.log(\'Role:\', user.role); ' +
        '      console.log(\'Organization:\', user.organization?.name); ' +
        '      console.log(\'Created:\', user.createdAt); ' +
        '    } else { ' +
        '      console.log(\'USER_NOT_FOUND\'); ' +
        '    } ' +
        '    await prisma.$disconnect(); ' +
        '  } catch (error) { ' +
        '    console.error(\'ERROR:\', error.message); ' +
        '    await prisma.$disconnect(); ' +
        '  } ' +
        '} ' +
        'checkUser();"',
        'Verifying user exists in database'
    );
    
    if (result.success) {
        log(result.output);
        return result.output.includes('USER_FOUND');
    }
    
    return false;
}

async function main() {
    console.log(`${colors.cyan}${colors.bright}`);
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL AUTHENTICATION ISSUE FIX                            ║');
    console.log('║                                                                                ║');
    console.log('║  Fixing the final login authentication hurdle by creating the missing user    ║');
    console.log('║  and verifying the complete authentication flow works properly                 ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
    
    try {
        // Step 1: Create the missing user
        const userCreated = await createUserDirectly();
        if (!userCreated) {
            logError('Failed to create user - cannot proceed');
            process.exit(1);
        }
        
        // Step 2: Verify user exists
        const userExists = await verifyUserExists();
        if (!userExists) {
            logError('User verification failed after creation');
            process.exit(1);
        }
        
        // Step 3: Test login endpoints
        const workingLoginEndpoint = await testAuthEndpoints();
        
        // Step 4: Test registration endpoints (to verify system works for new users)
        const workingRegEndpoint = await testRegistrationEndpoints();
        
        // Summary
        logHeader('FIX SUMMARY');
        
        if (workingLoginEndpoint) {
            logSuccess(`✅ AUTHENTICATION FIXED: User ${TARGET_EMAIL} can now login successfully`);
            logSuccess(`✅ Working login endpoint: ${workingLoginEndpoint.name}`);
            logSuccess(`✅ Login URL: ${workingLoginEndpoint.url}`);
            
            logInfo('SOLUTION APPLIED:');
            log('  1. ✅ Created missing user account in database', colors.green);
            log('  2. ✅ User password properly hashed with bcrypt', colors.green);
            log('  3. ✅ User linked to organization', colors.green);
            log('  4. ✅ Authentication endpoint verified working', colors.green);
            
            logInfo('USER CAN NOW:');
            log(`  • Login with email: ${TARGET_EMAIL}`, colors.yellow);
            log(`  • Login with password: ${TARGET_PASSWORD}`, colors.yellow);
            log('  • Access questionnaires and other features', colors.yellow);
            log('  • Perform all authenticated operations', colors.yellow);
            
            if (workingRegEndpoint) {
                logSuccess(`✅ Registration system also working: ${workingRegEndpoint.name}`);
            } else {
                logWarning('⚠️  Registration endpoints may need attention for new users');
            }
            
        } else {
            logError(`❌ AUTHENTICATION STILL FAILING: None of the tested endpoints work`);
            logError('Additional investigation needed for API Gateway routing');
            
            logInfo('POSSIBLE ADDITIONAL ISSUES:');
            log('  • API Gateway routing configuration', colors.yellow);
            log('  • Service discovery problems', colors.yellow);
            log('  • Network connectivity between services', colors.yellow);
            log('  • Missing middleware or path rewriting', colors.yellow);
            
            logInfo('MANUAL VERIFICATION NEEDED:');
            log('  1. Check API Gateway logs for routing errors', colors.yellow);
            log('  2. Verify auth service is accessible from API Gateway', colors.yellow);
            log('  3. Check if frontend can reach working endpoints', colors.yellow);
        }
        
        logInfo('Next steps: Test login in the frontend application');
        
    } catch (error) {
        logError(`Fix failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
    
    // Cleanup
    await runCommand('rm -f /tmp/create_user.js', 'Cleaning up temporary files');
    
    console.log(`\n${colors.green}${colors.bright}Fix attempt completed${colors.reset}`);
}

// Handle script interruption
process.on('SIGINT', async () => {
    console.log('\n\nFix interrupted by user');
    await runCommand('rm -f /tmp/create_user.js', 'Cleaning up temporary files');
    process.exit(0);
});

// Run the fix
main().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
