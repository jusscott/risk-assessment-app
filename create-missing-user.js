#!/usr/bin/env node

/**
 * Simple script to create the missing user in the auth database
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const TARGET_EMAIL = 'jusscott@gmail.com';
const TARGET_PASSWORD = 'Password123';

console.log('🔧 Creating missing user account...');
console.log(`📧 Email: ${TARGET_EMAIL}`);
console.log(`🔐 Password: ${TARGET_PASSWORD}`);

async function createUser() {
    try {
        console.log('\n📊 Creating user directly in auth database...');
        
        const createUserCommand = `docker exec auth-service node -e "
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
            await prisma.\\$disconnect();
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
        
        await prisma.\\$disconnect();
        
    } catch (error) {
        console.error('CREATE_USER_ERROR:', error.message);
        await prisma.\\$disconnect();
        process.exit(1);
    }
}

createUser();
"`;
        
        const { stdout, stderr } = await execAsync(createUserCommand);
        
        console.log('Database operation output:');
        console.log(stdout);
        
        if (stderr) {
            console.log('Stderr:', stderr);
        }
        
        if (stdout.includes('USER_CREATED_SUCCESS')) {
            console.log('\n✅ SUCCESS: User created successfully!');
            return true;
        } else if (stdout.includes('USER_ALREADY_EXISTS')) {
            console.log('\n✅ SUCCESS: User already exists!');
            return true;
        } else {
            console.log('\n❌ FAILED: User creation did not complete successfully');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        return false;
    }
}

async function testLogin() {
    console.log('\n🧪 Testing login with created user...');
    
    try {
        const loginData = JSON.stringify({
            email: TARGET_EMAIL,
            password: TARGET_PASSWORD
        });
        
        // Test direct auth service
        const authResult = await execAsync(`curl -s -X POST -H "Content-Type: application/json" -d '${loginData}' http://localhost:5001/auth/login`);
        
        console.log('Direct auth service response:');
        console.log(authResult.stdout);
        
        if (authResult.stdout) {
            try {
                const response = JSON.parse(authResult.stdout);
                if (response.success && response.data && response.data.user) {
                    console.log('\n✅ LOGIN SUCCESS: User can authenticate!');
                    console.log(`👤 User: ${response.data.user.firstName} ${response.data.user.lastName}`);
                    console.log(`📧 Email: ${response.data.user.email}`);
                    console.log(`🔑 Role: ${response.data.user.role}`);
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

async function main() {
    console.log('\n🚀 FIXING AUTHENTICATION ISSUE');
    console.log('================================');
    
    const userCreated = await createUser();
    
    if (userCreated) {
        const loginSuccess = await testLogin();
        
        if (loginSuccess) {
            console.log('\n🎉 AUTHENTICATION ISSUE RESOLVED!');
            console.log('');
            console.log('✅ User account created in database');
            console.log('✅ Password properly hashed with bcrypt');
            console.log('✅ Login test successful');
            console.log('');
            console.log('👤 User can now login with:');
            console.log(`   📧 Email: ${TARGET_EMAIL}`);
            console.log(`   🔐 Password: ${TARGET_PASSWORD}`);
            console.log('');
            console.log('🔄 Next: Test login in the frontend application');
        } else {
            console.log('\n⚠️  USER CREATED BUT LOGIN STILL FAILING');
            console.log('This may indicate API Gateway routing issues');
            console.log('The user exists but endpoints may not be accessible');
        }
    } else {
        console.log('\n❌ FAILED TO CREATE USER');
        console.log('Cannot resolve authentication issue');
    }
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
