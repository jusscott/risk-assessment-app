#!/usr/bin/env node

/**
 * Comprehensive Authentication Issue Diagnostic Script
 * 
 * This script diagnoses why real user jusscott@gmail.com gets 401 Invalid email or password
 * despite correct credentials after infrastructure fixes are complete.
 * 
 * Diagnostic Areas:
 * 1. User existence in database
 * 2. Password hash verification 
 * 3. bcrypt functionality testing
 * 4. Direct login endpoint testing
 * 5. Database connectivity verification
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
const AUTH_SERVICE_URL = 'http://localhost:5001';
const COMMON_PASSWORDS = ['password', 'Password123', 'admin', 'test123', 'jusscott123', 'jusscott@gmail.com'];

function log(message, color = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
    console.log(`\n${colors.cyan}${colors.bright}=== ${message} ===${colors.reset}`);
}

function logSubHeader(message) {
    console.log(`\n${colors.blue}${colors.bright}--- ${message} ---${colors.reset}`);
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

async function checkServiceHealth() {
    logHeader('Service Health Check');
    
    try {
        const healthCheck = await runCommand(
            'curl -s http://localhost:5001/health',
            'Auth service health check'
        );
        
        if (healthCheck.success) {
            const healthData = JSON.parse(healthCheck.output);
            if (healthData.success && (healthData.data?.status === 'healthy' || healthData.status === 'OK')) {
                logSuccess('Auth service is healthy');
                return true;
            } else {
                logError(`Auth service unhealthy: ${JSON.stringify(healthData)}`);
                return false;
            }
        } else {
            logError('Auth service not responding');
            return false;
        }
    } catch (error) {
        logError(`Health check failed: ${error.message}`);
        return false;
    }
}

async function checkUserInDatabase() {
    logHeader('Database User Verification');
    
    const checkUserScript = `
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkUser() {
    const prisma = new PrismaClient();
    
    try {
        console.log('Connecting to database...');
        
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: '${TARGET_EMAIL}' },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        
        if (!user) {
            console.log('USER_NOT_FOUND');
            
            // List all users to see what's in the database
            const allUsers = await prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    createdAt: true
                }
            });
            
            console.log('ALL_USERS:', JSON.stringify(allUsers, null, 2));
        } else {
            console.log('USER_FOUND');
            console.log('USER_DATA:', JSON.stringify({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organizationId: user.organizationId,
                organization: user.organization,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                passwordLength: user.password.length,
                passwordPrefix: user.password.substring(0, 10) + '...'
            }, null, 2));
            
            // Test bcrypt with common passwords
            console.log('BCRYPT_TESTS:');
            for (const testPassword of ['password', 'Password123', 'admin', 'test123', 'jusscott123']) {
                try {
                    const isValid = await bcrypt.compare(testPassword, user.password);
                    console.log(\`  \${testPassword}: \${isValid ? 'MATCH' : 'NO_MATCH'}\`);
                    if (isValid) {
                        console.log(\`CORRECT_PASSWORD: \${testPassword}\`);
                        break;
                    }
                } catch (error) {
                    console.log(\`  \${testPassword}: ERROR - \${error.message}\`);
                }
            }
        }
        
        await prisma.\$disconnect();
    } catch (error) {
        console.error('DATABASE_ERROR:', error.message);
        await prisma.\$disconnect();
        process.exit(1);
    }
}

checkUser();
`;

    // Write and execute the database check script
    await runCommand(
        `echo '${checkUserScript}' > /tmp/check_user.js`,
        'Creating database check script'
    );
    
    const dbResult = await runCommand(
        'cd risk-assessment-app/backend/auth-service && node /tmp/check_user.js',
        'Checking user in database'
    );
    
    if (dbResult.success) {
        log(dbResult.output);
        
        if (dbResult.output.includes('USER_NOT_FOUND')) {
            logError(`User ${TARGET_EMAIL} not found in database`);
            
            if (dbResult.output.includes('ALL_USERS:')) {
                logInfo('Available users in database:');
                const usersMatch = dbResult.output.match(/ALL_USERS: ([\s\S]*?)(?=\n[A-Z_]+:|$)/);
                if (usersMatch) {
                    log(usersMatch[1], colors.dim);
                }
            }
            return { userExists: false, correctPassword: null };
        } else if (dbResult.output.includes('USER_FOUND')) {
            logSuccess(`User ${TARGET_EMAIL} found in database`);
            
            // Extract correct password if found
            const passwordMatch = dbResult.output.match(/CORRECT_PASSWORD: (.+)/);
            const correctPassword = passwordMatch ? passwordMatch[1] : null;
            
            if (correctPassword) {
                logSuccess(`Correct password identified: ${correctPassword}`);
                return { userExists: true, correctPassword };
            } else {
                logWarning('User exists but no common password matches');
                return { userExists: true, correctPassword: null };
            }
        }
    } else {
        logError('Database check failed');
        return { userExists: false, correctPassword: null };
    }
}

async function testBcryptFunctionality() {
    logHeader('bcrypt Functionality Test');
    
    const bcryptTestScript = `
const bcrypt = require('bcryptjs');

async function testBcrypt() {
    try {
        console.log('Testing bcrypt functionality...');
        
        const testPassword = 'testPassword123';
        console.log(\`Original password: \${testPassword}\`);
        
        // Generate salt and hash
        const salt = await bcrypt.genSalt(10);
        console.log(\`Salt generated: \${salt}\`);
        
        const hash = await bcrypt.hash(testPassword, salt);
        console.log(\`Hash generated: \${hash}\`);
        
        // Test comparison
        const isValid = await bcrypt.compare(testPassword, hash);
        console.log(\`Comparison result: \${isValid}\`);
        
        if (isValid) {
            console.log('BCRYPT_WORKING');
        } else {
            console.log('BCRYPT_BROKEN');
        }
        
        // Test with wrong password
        const wrongResult = await bcrypt.compare('wrongPassword', hash);
        console.log(\`Wrong password test: \${wrongResult}\`);
        
    } catch (error) {
        console.error('BCRYPT_ERROR:', error.message);
    }
}

testBcrypt();
`;

    await runCommand(
        `echo '${bcryptTestScript}' > /tmp/test_bcrypt.js`,
        'Creating bcrypt test script'
    );
    
    const bcryptResult = await runCommand(
        'cd risk-assessment-app/backend/auth-service && node /tmp/test_bcrypt.js',
        'Testing bcrypt functionality'
    );
    
    if (bcryptResult.success) {
        log(bcryptResult.output);
        
        if (bcryptResult.output.includes('BCRYPT_WORKING')) {
            logSuccess('bcrypt is functioning correctly');
            return true;
        } else {
            logError('bcrypt appears to be broken');
            return false;
        }
    } else {
        logError('bcrypt test failed');
        return false;
    }
}

async function testLoginEndpoint(email, password) {
    logSubHeader(`Testing login with ${email} and password: ${password}`);
    
    const loginData = JSON.stringify({ email, password });
    
    const loginResult = await runCommand(
        `curl -s -X POST -H "Content-Type: application/json" -d '${loginData}' ${AUTH_SERVICE_URL}/auth/login`,
        'Testing login endpoint'
    );
    
    if (loginResult.success) {
        try {
            const response = JSON.parse(loginResult.output);
            
            if (response.success) {
                logSuccess(`Login successful for ${email}`);
                log(`User: ${response.data.user.firstName} ${response.data.user.lastName}`);
                log(`Role: ${response.data.user.role}`);
                return { success: true, response };
            } else {
                logError(`Login failed: ${response.error.message}`);
                log(`Error code: ${response.error.code}`, colors.dim);
                return { success: false, response };
            }
        } catch (error) {
            logError(`Invalid JSON response: ${loginResult.output}`);
            return { success: false, response: null };
        }
    } else {
        logError('Login endpoint not accessible');
        return { success: false, response: null };
    }
}

async function attemptPasswordReset() {
    logHeader('Password Reset Test');
    
    logInfo(`Attempting password reset for ${TARGET_EMAIL}`);
    
    const resetData = JSON.stringify({ email: TARGET_EMAIL });
    
    const resetResult = await runCommand(
        `curl -s -X POST -H "Content-Type: application/json" -d '${resetData}' ${AUTH_SERVICE_URL}/auth/forgot-password`,
        'Requesting password reset'
    );
    
    if (resetResult.success) {
        try {
            const response = JSON.parse(resetResult.output);
            
            if (response.success) {
                logSuccess('Password reset requested successfully');
                if (response.data && response.data.resetToken) {
                    logInfo(`Reset token: ${response.data.resetToken}`);
                    return response.data.resetToken;
                }
            } else {
                logError(`Password reset failed: ${response.error.message}`);
            }
        } catch (error) {
            logError(`Invalid JSON response: ${resetResult.output}`);
        }
    }
    
    return null;
}

async function createTestUser() {
    logHeader('Test User Creation');
    
    const testUserData = {
        email: 'test-' + Date.now() + '@example.com',
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Organization'
    };
    
    logInfo(`Creating test user: ${testUserData.email}`);
    
    const registerResult = await runCommand(
        `curl -s -X POST -H "Content-Type: application/json" -d '${JSON.stringify(testUserData)}' ${AUTH_SERVICE_URL}/auth/register`,
        'Creating test user'
    );
    
    if (registerResult.success) {
        try {
            const response = JSON.parse(registerResult.output);
            
            if (response.success) {
                logSuccess(`Test user created: ${testUserData.email}`);
                
                // Try to login immediately
                const loginTest = await testLoginEndpoint(testUserData.email, testUserData.password);
                
                if (loginTest.success) {
                    logSuccess('Test user login successful - authentication system is working');
                    return testUserData;
                } else {
                    logError('Test user login failed - authentication system has issues');
                }
            } else {
                logError(`Test user creation failed: ${response.error.message}`);
            }
        } catch (error) {
            logError(`Invalid JSON response: ${registerResult.output}`);
        }
    }
    
    return null;
}

async function main() {
    console.log(`${colors.cyan}${colors.bright}`);
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL LOGIN AUTHENTICATION DIAGNOSTIC                      ║');
    console.log('║                                                                                ║');
    console.log('║  Diagnosing why jusscott@gmail.com gets "401 Invalid email or password"      ║');
    console.log('║  despite correct credentials after infrastructure fixes are complete          ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
    
    try {
        // Step 1: Check service health
        const isHealthy = await checkServiceHealth();
        if (!isHealthy) {
            logError('Auth service is not healthy - cannot proceed with diagnosis');
            process.exit(1);
        }
        
        // Step 2: Test bcrypt functionality
        const bcryptWorking = await testBcryptFunctionality();
        if (!bcryptWorking) {
            logError('bcrypt is not working properly - this may be the root cause');
        }
        
        // Step 3: Check user in database
        const userCheck = await checkUserInDatabase();
        
        // Step 4: Test login attempts
        logHeader('Login Endpoint Testing');
        
        if (userCheck.userExists) {
            if (userCheck.correctPassword) {
                // Test with the identified correct password
                await testLoginEndpoint(TARGET_EMAIL, userCheck.correctPassword);
            }
            
            // Test with common passwords
            logSubHeader('Testing Common Passwords');
            for (const password of COMMON_PASSWORDS) {
                const result = await testLoginEndpoint(TARGET_EMAIL, password);
                if (result.success) {
                    logSuccess(`Successful login found with password: ${password}`);
                    break;
                }
            }
        } else {
            logWarning(`User ${TARGET_EMAIL} does not exist - this is likely the root cause`);
            
            // Step 5: Create and test a new user to verify authentication system
            const testUser = await createTestUser();
            if (!testUser) {
                logError('Cannot create test users - authentication system has fundamental issues');
            }
        }
        
        // Step 6: Attempt password reset
        const resetToken = await attemptPasswordReset();
        
        // Summary
        logHeader('DIAGNOSTIC SUMMARY');
        
        if (!userCheck.userExists) {
            logError(`ROOT CAUSE: User ${TARGET_EMAIL} does not exist in the database`);
            logInfo('SOLUTIONS:');
            log('  1. Create the user account through registration', colors.yellow);
            log('  2. Check if user data was lost during recent fixes', colors.yellow);
            log('  3. Verify database seeding scripts are working properly', colors.yellow);
        } else if (!userCheck.correctPassword) {
            logError('ROOT CAUSE: User exists but password hash does not match any common passwords');
            logInfo('SOLUTIONS:');
            log('  1. Use password reset functionality', colors.yellow);
            log('  2. Check if password was changed during recent fixes', colors.yellow);
            log('  3. Verify password hashing is working correctly', colors.yellow);
        } else if (!bcryptWorking) {
            logError('ROOT CAUSE: bcrypt functionality is broken');
            logInfo('SOLUTIONS:');
            log('  1. Reinstall bcryptjs dependency', colors.yellow);
            log('  2. Check for conflicting type definitions', colors.yellow);
            log('  3. Verify Node.js version compatibility', colors.yellow);
        } else {
            logSuccess('Authentication system appears to be working correctly');
            logWarning('The issue may be with the specific credentials being used');
        }
        
        logInfo('Next steps based on findings above');
        
    } catch (error) {
        logError(`Diagnostic failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
    
    // Cleanup temporary files
    await runCommand('rm -f /tmp/check_user.js /tmp/test_bcrypt.js', 'Cleaning up temporary files');
    
    console.log(`\n${colors.green}${colors.bright}Diagnostic completed successfully${colors.reset}`);
}

// Handle script interruption
process.on('SIGINT', async () => {
    console.log('\n\nDiagnostic interrupted by user');
    await runCommand('rm -f /tmp/check_user.js /tmp/test_bcrypt.js', 'Cleaning up temporary files');
    process.exit(0);
});

// Run the diagnostic
main().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
