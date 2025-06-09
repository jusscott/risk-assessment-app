#!/usr/bin/env node

/**
 * Script to reset the user password to a known value
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const TARGET_EMAIL = 'jusscott@gmail.com';
const NEW_PASSWORD = 'Password123';

console.log('🔐 Resetting user password...');
console.log(`📧 Email: ${TARGET_EMAIL}`);
console.log(`🔑 New Password: ${NEW_PASSWORD}`);

async function resetPassword() {
    try {
        console.log('\n🔄 Resetting password in database...');
        
        const resetPasswordCommand = `docker exec auth-service node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    const prisma = new PrismaClient();
    
    try {
        console.log('Connecting to database...');
        
        // Find the user first
        const existingUser = await prisma.user.findUnique({
            where: { email: '${TARGET_EMAIL}' }
        });
        
        if (!existingUser) {
            console.log('USER_NOT_FOUND');
            await prisma.\\$disconnect();
            return;
        }
        
        console.log('User found:', existingUser.id);
        
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('${NEW_PASSWORD}', salt);
        
        console.log('New password hashed successfully');
        
        // Update the user's password
        const updatedUser = await prisma.user.update({
            where: { email: '${TARGET_EMAIL}' },
            data: {
                password: hashedPassword
            }
        });
        
        console.log('PASSWORD_RESET_SUCCESS');
        console.log('User ID:', updatedUser.id);
        console.log('Email:', updatedUser.email);
        
        // Verify the new password works
        const passwordCheck = await bcrypt.compare('${NEW_PASSWORD}', updatedUser.password);
        console.log('Password verification:', passwordCheck ? 'SUCCESS' : 'FAILED');
        
        await prisma.\\$disconnect();
        
    } catch (error) {
        console.error('RESET_PASSWORD_ERROR:', error.message);
        await prisma.\\$disconnect();
        process.exit(1);
    }
}

resetPassword();
"`;
        
        const { stdout, stderr } = await execAsync(resetPasswordCommand);
        
        console.log('Password reset output:');
        console.log(stdout);
        
        if (stderr) {
            console.log('Stderr:', stderr);
        }
        
        if (stdout.includes('PASSWORD_RESET_SUCCESS')) {
            console.log('\n✅ SUCCESS: Password reset successfully!');
            return true;
        } else if (stdout.includes('USER_NOT_FOUND')) {
            console.log('\n❌ FAILED: User not found');
            return false;
        } else {
            console.log('\n❌ FAILED: Password reset did not complete successfully');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        return false;
    }
}

async function testLogin() {
    console.log('\n🧪 Testing login with reset password...');
    
    try {
        const loginData = JSON.stringify({
            email: TARGET_EMAIL,
            password: NEW_PASSWORD
        });
        
        // Test direct auth service
        const authResult = await execAsync(`curl -s -X POST -H "Content-Type: application/json" -d '${loginData}' http://localhost:5001/login`);
        
        console.log('Login test response:');
        console.log(authResult.stdout);
        
        if (authResult.stdout) {
            try {
                const response = JSON.parse(authResult.stdout);
                if (response.success && response.data && response.data.user) {
                    console.log('\n✅ LOGIN SUCCESS: Password reset worked!');
                    console.log(`👤 User: ${response.data.user.firstName} ${response.data.user.lastName}`);
                    console.log(`📧 Email: ${response.data.user.email}`);
                    console.log(`🔑 Role: ${response.data.user.role}`);
                    if (response.data.tokens) {
                        console.log(`🎫 Token: ${response.data.tokens.accessToken.substring(0, 20)}...`);
                    }
                    return true;
                } else if (response.error) {
                    console.log(`\n❌ LOGIN FAILED: ${response.error.message}`);
                    return false;
                }
            } catch (parseError) {
                console.log('\n❌ Invalid JSON response from login test');
                return false;
            }
        }
        
    } catch (error) {
        console.error('\n❌ Login test failed:', error.message);
        return false;
    }
}

async function testAPIGateway() {
    console.log('\n🌐 Testing API Gateway login...');
    
    try {
        const loginData = JSON.stringify({
            email: TARGET_EMAIL,
            password: NEW_PASSWORD
        });
        
        // Test API Gateway endpoint
        const gatewayResult = await execAsync(`curl -s -X POST -H "Content-Type: application/json" -d '${loginData}' http://localhost:3000/auth/login`);
        
        console.log('API Gateway response:');
        console.log(gatewayResult.stdout);
        
        if (gatewayResult.stdout) {
            try {
                const response = JSON.parse(gatewayResult.stdout);
                if (response.success && response.data && response.data.user) {
                    console.log('\n✅ API GATEWAY SUCCESS: Full login flow working!');
                    return true;
                } else if (response.error) {
                    console.log(`\n⚠️  API Gateway login failed: ${response.error.message}`);
                    return false;
                }
            } catch (parseError) {
                console.log('\n⚠️  Invalid JSON response from API Gateway');
                return false;
            }
        }
        
    } catch (error) {
        console.error('\n⚠️  API Gateway test failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('\n🚀 FIXING AUTHENTICATION PASSWORD ISSUE');
    console.log('=====================================');
    
    const passwordReset = await resetPassword();
    
    if (passwordReset) {
        const loginSuccess = await testLogin();
        
        if (loginSuccess) {
            console.log('\n🎉 DIRECT AUTH SERVICE WORKING!');
            
            // Also test API Gateway
            const gatewaySuccess = await testAPIGateway();
            
            if (gatewaySuccess) {
                console.log('\n🎉 FULL AUTHENTICATION FLOW WORKING!');
                console.log('');
                console.log('✅ User password reset successfully');
                console.log('✅ Direct auth service login working');
                console.log('✅ API Gateway login working');
                console.log('');
                console.log('🎯 FINAL SOLUTION:');
                console.log(`   📧 Email: ${TARGET_EMAIL}`);
                console.log(`   🔐 Password: ${NEW_PASSWORD}`);
                console.log('');
                console.log('🔄 Users can now login successfully in the frontend!');
            } else {
                console.log('\n⚠️  API GATEWAY ISSUE REMAINS');
                console.log('Direct auth works but API Gateway routing needs attention');
                console.log('');
                console.log('👤 User can login with:');
                console.log(`   📧 Email: ${TARGET_EMAIL}`);
                console.log(`   🔐 Password: ${NEW_PASSWORD}`);
                console.log('');
                console.log('🔧 Check API Gateway configuration for auth routing');
            }
        } else {
            console.log('\n❌ PASSWORD RESET FAILED');
            console.log('Login still not working after password reset');
        }
    } else {
        console.log('\n❌ FAILED TO RESET PASSWORD');
        console.log('Cannot proceed with authentication fix');
    }
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
