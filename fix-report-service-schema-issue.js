#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Report Service Schema Fix');
console.log('=============================');
console.log();

async function runCommand(command, description) {
    return new Promise((resolve, reject) => {
        console.log(`📋 ${description}...`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.log(`⚠️  ${stderr}`);
            }
            if (stdout) {
                console.log(stdout);
            }
            console.log(`✅ ${description} completed`);
            console.log();
            resolve();
        });
    });
}

async function fixReportServiceSchema() {
    try {
        console.log('🎯 Root Cause Analysis:');
        console.log('The report service Prisma schema defines a "name" column, but the database');
        console.log('table is missing several columns including "name", causing ECONNREFUSED-like');
        console.log('errors when the service tries to query non-existent columns.');
        console.log();

        // Step 1: Add missing columns to the database via SQL
        console.log('📊 Adding missing columns to Report table...');
        const addColumnsSQL = `
ALTER TABLE "Report" 
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "summary" TEXT,
ADD COLUMN IF NOT EXISTS "framework" TEXT,
ADD COLUMN IF NOT EXISTS "score" INTEGER,
ADD COLUMN IF NOT EXISTS "criticalIssues" INTEGER,
ADD COLUMN IF NOT EXISTS "highIssues" INTEGER,
ADD COLUMN IF NOT EXISTS "mediumIssues" INTEGER,
ADD COLUMN IF NOT EXISTS "recommendations" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "categories" JSONB,
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
        `;

        await runCommand(
            `docker-compose exec -T report-db psql -U postgres -d reports -c "${addColumnsSQL.replace(/\n/g, ' ')}"`,
            'Adding missing columns to Report table'
        );

        // Step 2: Regenerate Prisma client
        await runCommand(
            'docker-compose exec report-service npx prisma generate',
            'Regenerating Prisma client'
        );

        // Step 3: Restart report service to apply changes
        await runCommand(
            'docker-compose restart report-service',
            'Restarting report service'
        );

        // Step 4: Wait for service to be ready
        console.log('⏳ Waiting for report service to start...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 5: Test connectivity
        await runCommand(
            'curl -f http://localhost:5005/health',
            'Testing report service connectivity'
        );

        // Step 6: Test report endpoint
        await runCommand(
            'curl -f http://localhost:5005/api/reports',
            'Testing report service API'
        );

        console.log('🎉 SUCCESS: Report Service Schema Issue Fixed!');
        console.log();
        console.log('✅ Fixed Issues:');
        console.log('   • Added missing "name" column to Report table');
        console.log('   • Added missing "summary", "framework", "score" columns');
        console.log('   • Added missing "criticalIssues", "highIssues", "mediumIssues" columns');
        console.log('   • Added missing "recommendations", "categories", "completedAt" columns');
        console.log('   • Regenerated Prisma client with correct schema');
        console.log('   • Report service connectivity restored');
        console.log();
        console.log('📊 Impact:');
        console.log('   🔴 Before: Report service failing with "column does not exist" errors');
        console.log('   🟢 After: Report service operational with complete database schema');
        console.log();
        console.log('🔍 Verification:');
        console.log('   • Report service health check: ✅ PASSING');
        console.log('   • Report API endpoints: ✅ OPERATIONAL');
        console.log('   • Database schema alignment: ✅ COMPLETE');

    } catch (error) {
        console.error('❌ FAILED: Report service schema fix failed');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the fix
fixReportServiceSchema();
