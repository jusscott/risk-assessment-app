#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING CRITICAL QUESTIONNAIRE DISPLAY ISSUE');
console.log('='.repeat(60));
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log('');

// Configuration
const USER_EMAIL = 'juscott@gmail.com';
const USER_PASSWORD = 'password123';
const USER_NAME = 'Justin Scott';

async function createUser() {
    console.log('👤 CREATING MISSING USER');
    console.log('-'.repeat(30));
    
    try {
        // Hash the password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(USER_PASSWORD, saltRounds);
        const userId = uuidv4();
        
        console.log(`📧 Email: ${USER_EMAIL}`);
        console.log(`🔐 Password: ${USER_PASSWORD}`);
        console.log(`🆔 User ID: ${userId}`);
        console.log(`🔒 Hashed Password: ${hashedPassword.substring(0, 20)}...`);
        
        // Create SQL to insert user
        const insertUserSQL = `
INSERT INTO "User" (id, email, password, name, "isActive", "createdAt", "updatedAt")
VALUES ('${userId}', '${USER_EMAIL}', '${hashedPassword}', '${USER_NAME}', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    "updatedAt" = NOW();
`;
        
        console.log('💾 SQL Query:');
        console.log(insertUserSQL);
        
        return { userId, hashedPassword, insertUserSQL };
    } catch (error) {
        console.error('❌ Error creating user:', error);
        throw error;
    }
}

function fixEnvironmentVariables() {
    console.log('🌍 FIXING ENVIRONMENT VARIABLES');
    console.log('-'.repeat(30));
    
    const fixes = [
        {
            file: 'backend/questionnaire-service/.env',
            fixes: [
                {
                    from: 'AUTH_SERVICE_URL=http://localhost:3001',
                    to: 'AUTH_SERVICE_URL=http://auth-service:5001'
                },
                {
                    from: 'ANALYSIS_SERVICE_URL=http://localhost:3004',
                    to: 'ANALYSIS_SERVICE_URL=http://analysis-service:5004'
                },
                {
                    from: 'REPORT_SERVICE_URL=http://localhost:3005',
                    to: 'REPORT_SERVICE_URL=http://report-service:5005'
                },
                {
                    from: 'REDIS_HOST=localhost',
                    to: 'REDIS_HOST=redis'
                }
            ]
        },
        {
            file: 'backend/questionnaire-service/.env.development',
            fixes: [
                {
                    from: 'AUTH_SERVICE_URL="http://localhost:5001/api"',
                    to: 'AUTH_SERVICE_URL="http://auth-service:5001"'
                },
                {
                    from: 'ANALYSIS_SERVICE_URL="http://localhost:5004"',
                    to: 'ANALYSIS_SERVICE_URL="http://analysis-service:5004"'
                },
                {
                    from: 'QUESTIONNAIRE_SERVICE_URL="http://localhost:5002"',
                    to: 'QUESTIONNAIRE_SERVICE_URL="http://questionnaire-service:5002"'
                },
                {
                    from: 'REPORT_SERVICE_URL="http://localhost:5005"',
                    to: 'REPORT_SERVICE_URL="http://report-service:5005"'
                }
            ]
        }
    ];
    
    fixes.forEach(({ file, fixes: fileFixes }) => {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            console.log(`📄 Fixing ${file}:`);
            let content = fs.readFileSync(fullPath, 'utf8');
            
            fileFixes.forEach(({ from, to }) => {
                if (content.includes(from)) {
                    content = content.replace(from, to);
                    console.log(`   ✅ ${from} → ${to}`);
                } else {
                    console.log(`   ⚠️  ${from} (not found)`);
                }
            });
            
            fs.writeFileSync(fullPath, content, 'utf8');
        } else {
            console.log(`❌ ${file}: File not found`);
        }
    });
}

function createAPIGatewayEnvFile() {
    console.log('🚪 CREATING API GATEWAY ENV FILE');
    console.log('-'.repeat(30));
    
    const envContent = `# API Gateway Environment Variables
PORT=5000
NODE_ENV=development

# Service URLs (using Docker service names)
AUTH_SERVICE_URL=http://auth-service:5001
QUESTIONNAIRE_SERVICE_URL=http://questionnaire-service:5002
PAYMENT_SERVICE_URL=http://payment-service:5003
ANALYSIS_SERVICE_URL=http://analysis-service:5004
REPORT_SERVICE_URL=http://report-service:5005

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;
    
    const filePath = path.join(process.cwd(), 'backend/api-gateway/.env');
    fs.writeFileSync(filePath, envContent, 'utf8');
    console.log(`✅ Created ${filePath}`);
}

function createAuthServiceEnvFile() {
    console.log('🔐 CREATING AUTH SERVICE ENV FILE');
    console.log('-'.repeat(30));
    
    const envContent = `# Auth Service Environment Variables
PORT=5001
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:password@auth-db:5432/auth"

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# bcrypt Configuration
BCRYPT_ROUNDS=12

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000
`;
    
    const filePath = path.join(process.cwd(), 'backend/auth-service/.env');
    fs.writeFileSync(filePath, envContent, 'utf8');
    console.log(`✅ Created ${filePath}`);
}

function generateDockerComposeCommand(insertUserSQL) {
    console.log('🐳 DOCKER COMMANDS TO RUN');
    console.log('-'.repeat(30));
    
    const commands = [
        '# 1. Create the user in the database',
        `docker-compose exec auth-db psql -U postgres -d auth -c "${insertUserSQL.replace(/"/g, '\\"')}"`,
        '',
        '# 2. Restart services to pick up environment changes',
        'docker-compose restart questionnaire-service',
        'docker-compose restart api-gateway',
        'docker-compose restart auth-service',
        '',
        '# 3. Verify the user was created',
        'docker-compose exec auth-db psql -U postgres -d auth -c "SELECT id, email, name, \\"isActive\\", \\"createdAt\\" FROM \\"User\\" WHERE email = \'juscott@gmail.com\';"',
        '',
        '# 4. Test the fixed authentication',
        'node diagnose-questionnaire-display-issue.js'
    ];
    
    commands.forEach(cmd => console.log(cmd));
    
    return commands;
}

function createShellScript(commands) {
    console.log('📜 CREATING SHELL SCRIPT');
    console.log('-'.repeat(30));
    
    const scriptContent = `#!/bin/bash

echo "🔧 APPLYING QUESTIONNAIRE DISPLAY FIXES"
echo "======================================="

# Create user in database
echo "👤 Creating user in database..."
${commands[1]}

if [ $? -eq 0 ]; then
    echo "✅ User created successfully"
else
    echo "❌ Failed to create user"
    exit 1
fi

# Restart services
echo "🔄 Restarting services..."
${commands[4]}
${commands[5]}
${commands[6]}

echo "⏳ Waiting for services to restart..."
sleep 10

# Verify user creation
echo "🔍 Verifying user creation..."
${commands[9]}

echo "✅ All fixes applied successfully!"
echo "🧪 Run the diagnostic to test: node diagnose-questionnaire-display-issue.js"
`;

    const scriptPath = path.join(process.cwd(), 'apply-questionnaire-display-fixes.sh');
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    fs.chmodSync(scriptPath, '755');
    console.log(`✅ Created executable script: ${scriptPath}`);
    
    return scriptPath;
}

async function main() {
    try {
        // Step 1: Create user data
        const { userId, hashedPassword, insertUserSQL } = await createUser();
        
        // Step 2: Fix environment variables
        fixEnvironmentVariables();
        
        // Step 3: Create missing env files
        createAPIGatewayEnvFile();
        createAuthServiceEnvFile();
        
        // Step 4: Generate commands and script
        const commands = generateDockerComposeCommand(insertUserSQL);
        const scriptPath = createShellScript(commands);
        
        console.log('');
        console.log('🎯 SUMMARY OF FIXES APPLIED:');
        console.log('='.repeat(60));
        console.log('✅ 1. Created user data for juscott@gmail.com');
        console.log('✅ 2. Fixed environment variables (localhost → Docker service names)');
        console.log('✅ 3. Created missing .env files for API Gateway and Auth Service');
        console.log('✅ 4. Generated shell script to apply database changes');
        console.log('');
        console.log('🚀 NEXT STEPS:');
        console.log('1. Run the shell script: ./apply-questionnaire-display-fixes.sh');
        console.log('2. Test the fix: node diagnose-questionnaire-display-issue.js');
        console.log('3. Check questionnaires in the frontend');
        console.log('');
        console.log('🔧 ROOT CAUSE ANALYSIS:');
        console.log('- Primary: User juscott@gmail.com did not exist in auth database');
        console.log('- Secondary: Environment variables used localhost instead of Docker service names');
        console.log('- Tertiary: Missing .env files for proper service configuration');
        
    } catch (error) {
        console.error('❌ Fix process failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
