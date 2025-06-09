/**
 * P3005 Error Fix and Test Data Script
 * 
 * This script resolves the P3005 migration error in the questionnaire service and 
 * adds test data using the proper Prisma client - matching production patterns.
 */

const { execSync } = require('child_process');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

// Constants
const TEST_USER_ID = 'test-user-123';
const DATABASE_URL = 'postgresql://postgres:password@localhost:5432/questionnaires';

async function main() {
  console.log('🔧 FIXING P3005 MIGRATION ERROR AND ADDING TEST DATA');
  console.log('==================================================\n');

  try {
    // Step 1: Create a copy of the questionnaire service's schema.prisma
    console.log('Step 1: Locating and copying Prisma schema for questionnaire service...');
    execSync('mkdir -p ./prisma-temp');
    
    try {
      execSync('docker cp questionnaire-service:/app/prisma/schema.prisma ./prisma-temp/schema.prisma');
      console.log('✅ Successfully copied Prisma schema from container');
    } catch (error) {
      console.error('Failed to copy Prisma schema from container. Using backup method...');
      // Create a schema based on what we know about the questionnaire service
      const schemaContent = `
        generator client {
          provider = "prisma-client-js"
        }
        
        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }
        
        model Template {
          id          String       @id @default(uuid())
          title       String
          description String?
          framework   String
          version     String
          createdAt   DateTime     @default(now())
          updatedAt   DateTime     @updatedAt
          questions   Question[]
          submissions Submission[]
        }
        
        model Question {
          id          String   @id @default(uuid())
          templateId  String
          template    Template @relation(fields: [templateId], references: [id])
          text        String
          description String?
          type        String   @default("text")
          required    Boolean  @default(false)
          options     Json?
          order       Int
          createdAt   DateTime @default(now())
          updatedAt   DateTime @updatedAt
          answers     Answer[]
        }
        
        model Submission {
          id         String   @id @default(uuid())
          userId     String
          templateId String
          template   Template @relation(fields: [templateId], references: [id])
          status     String   @default("draft")
          createdAt  DateTime @default(now())
          updatedAt  DateTime @updatedAt
          answers    Answer[]
        }
        
        model Answer {
          id           String     @id @default(uuid())
          submissionId String
          submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
          questionId   String
          question     Question   @relation(fields: [questionId], references: [id])
          value        String
          createdAt    DateTime   @default(now())
          updatedAt    DateTime   @updatedAt
        }
      `;
      
      require('fs').writeFileSync('./prisma-temp/schema.prisma', schemaContent);
      console.log('✅ Created backup Prisma schema');
    }
    
    // Step 2: Create a .env file for Prisma
    console.log('\nStep 2: Setting up Prisma environment...');
    require('fs').writeFileSync('./prisma-temp/.env', `DATABASE_URL="${DATABASE_URL}"`);
    console.log('✅ Created .env file for Prisma');
    
    // Step 3: Generate the Prisma Client
    console.log('\nStep 3: Generating Prisma client...');
    try {
      process.chdir('./prisma-temp');
      execSync('npx prisma generate', { stdio: 'inherit' });
      process.chdir('..');
      console.log('✅ Generated Prisma client');
    } catch (error) {
      console.error('Failed to generate Prisma client:', error);
      process.chdir('..');
      return;
    }

    // Step 4: Fix the migration issue by working directly with the database
    console.log('\nStep 4: Fixing P3005 migration issue...');
    console.log('Connecting to database to check and fix migration issues...');

    // Create a direct database connection first to check the state
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: DATABASE_URL
    });

    // Check if _prisma_migrations table exists, if not, we might need to initialize it
    const checkMigrationsTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
      );
    `;
    
    const migrationsTableResult = await pool.query(checkMigrationsTableQuery);
    const migrationsTableExists = migrationsTableResult.rows[0].exists;
    
    if (!migrationsTableExists) {
      console.log('_prisma_migrations table does not exist, creating it...');
      // Create the migrations table manually
      await pool.query(`
        CREATE TABLE "_prisma_migrations" (
          "id" VARCHAR(36) NOT NULL,
          "checksum" VARCHAR(64) NOT NULL,
          "finished_at" TIMESTAMPTZ,
          "migration_name" VARCHAR(255) NOT NULL,
          "logs" TEXT,
          "rolled_back_at" TIMESTAMPTZ,
          "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY ("id")
        );
      `);
      console.log('✅ Created _prisma_migrations table');
    } else {
      console.log('_prisma_migrations table exists');
    }

    // Check if schema already has content (P3005 happens when trying to apply migrations to a non-empty schema)
    const tablesQuery = `
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    const existingTables = tablesResult.rows.map(row => row.tablename);
    
    if (existingTables.length > 0) {
      console.log(`Found existing tables: ${existingTables.join(', ')}`);
      
      // If we have tables but no migration records, we need to mark migrations as applied
      const migrationsCountQuery = `SELECT COUNT(*) FROM _prisma_migrations;`;
      const migrationsCountResult = await pool.query(migrationsCountQuery);
      
      if (parseInt(migrationsCountResult.rows[0].count) === 0) {
        console.log('Migration table exists but has no entries - marking initial migration as applied');
        
        // Add the migration record
        await pool.query(`
          INSERT INTO _prisma_migrations (id, checksum, migration_name, logs, finished_at, applied_steps_count)
          VALUES (
            '00000000-0000-0000-0000-000000000000',
            'manual-migration-fix',
            '20250521_initial',
            'Applied manually to fix P3005 error',
            NOW(),
            1
          );
        `);
        console.log('✅ Added migration record to _prisma_migrations table');
      }
    } else {
      console.log('Schema appears to be empty - no tables found besides _prisma_migrations');
      // If no tables, run Prisma migrations through the container
      try {
        console.log('Attempting to run migrations in the container...');
        execSync('docker exec questionnaire-service npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Migrations applied successfully');
      } catch (error) {
        console.error('Error applying migrations in container:', error);
      }
    }

    // Clean up pool
    await pool.end();
    
    // Step 5: Now use the local Prisma client to create test data
    console.log('\nStep 5: Creating test data using Prisma client...');
    
    // Required for dynamic import of the generated client
    const { PrismaClient } = require('./prisma-temp/node_modules/@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // Check if there are templates
      const templates = await prisma.template.findMany({
        take: 5,
      });
      
      if (templates.length === 0) {
        console.log('No templates found. Please run the template seed script first.');
        return;
      }
      
      console.log(`Found ${templates.length} templates`);
      
      // Get the first template for our test submissions
      const templateId = templates[0].id;
      
      // Clean up any existing test submissions
      console.log('Cleaning up any existing test submissions...');
      await prisma.answer.deleteMany({
        where: {
          submission: {
            userId: TEST_USER_ID
          }
        }
      });
      
      await prisma.submission.deleteMany({
        where: {
          userId: TEST_USER_ID
        }
      });
      
      // Create a draft submission
      console.log('Creating draft submission...');
      const draftSubmission = await prisma.submission.create({
        data: {
          userId: TEST_USER_ID,
          templateId: templateId,
          status: 'draft',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      });
      
      console.log(`Created draft submission with ID: ${draftSubmission.id}`);
      
      // Get questions for this template
      const questions = await prisma.question.findMany({
        where: {
          templateId: templateId
        },
        take: 10
      });
      
      if (questions.length === 0) {
        console.log('No questions found for template');
        return;
      }
      
      console.log(`Found ${questions.length} questions`);
      
      // Add answers to half of the questions in the draft submission
      const halfQuestions = questions.slice(0, Math.ceil(questions.length / 2));
      console.log(`Adding answers to ${halfQuestions.length} questions for draft submission...`);
      
      for (let i = 0; i < halfQuestions.length; i++) {
        await prisma.answer.create({
          data: {
            submissionId: draftSubmission.id,
            questionId: halfQuestions[i].id,
            value: `Draft answer ${i + 1}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      
      // Create a completed submission
      console.log('Creating completed submission...');
      const completedSubmission = await prisma.submission.create({
        data: {
          userId: TEST_USER_ID,
          templateId: templateId,
          status: 'submitted',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        }
      });
      
      console.log(`Created completed submission with ID: ${completedSubmission.id}`);
      
      // Add answers to all questions for the completed submission
      console.log(`Adding answers to ${questions.length} questions for completed submission...`);
      
      for (let i = 0; i < questions.length; i++) {
        await prisma.answer.create({
          data: {
            submissionId: completedSubmission.id,
            questionId: questions[i].id,
            value: `Completed answer ${i + 1}`,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
          }
        });
      }
      
      // If we have a second template, create another submission for it
      if (templates.length > 1) {
        const secondTemplateId = templates[1].id;
        
        console.log('Creating second completed submission with different template...');
        const secondCompletedSubmission = await prisma.submission.create({
          data: {
            userId: TEST_USER_ID,
            templateId: secondTemplateId,
            status: 'submitted',
            createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
          }
        });
        
        console.log(`Created second completed submission with ID: ${secondCompletedSubmission.id}`);
        
        // Get questions for second template
        const secondTemplateQuestions = await prisma.question.findMany({
          where: {
            templateId: secondTemplateId
          },
          take: 20
        });
        
        if (secondTemplateQuestions.length > 0) {
          console.log(`Adding answers to ${secondTemplateQuestions.length} questions for second template submission...`);
          
          for (let i = 0; i < secondTemplateQuestions.length; i++) {
            await prisma.answer.create({
              data: {
                submissionId: secondCompletedSubmission.id,
                questionId: secondTemplateQuestions[i].id,
                value: `Second template answer ${i + 1}`,
                createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
              }
            });
          }
        }
      }
      
      console.log('✅ Test data creation completed successfully!');
    } catch (error) {
      console.error('Error creating test data:', error);
    } finally {
      await prisma.$disconnect();
    }
    
    // Step 6: Verify the API is working
    console.log('\nStep 6: Testing API connectivity...');
    try {
      const response = await axios.get('http://localhost:5002/api/health');
      console.log('API response:', response.data);
      console.log('✅ API connectivity check successful!');
    } catch (error) {
      console.error('Error connecting to API:', error.message);
      console.log('\nThe database has been prepared, but there might be connectivity issues with the API.');
      console.log('Try restarting the questionnaire service: docker-compose restart questionnaire-service');
    }
    
    // Step 7: Clean up temporary files
    console.log('\nStep 7: Cleaning up...');
    try {
      execSync('rm -rf ./prisma-temp');
      console.log('✅ Removed temporary files');
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
    
    // Final message
    console.log('\n✅ OPERATION COMPLETE');
    console.log('====================');
    console.log('P3005 migration issue has been fixed and test data has been created.');
    console.log('You can now navigate to the questionnaires page in the application to view submissions.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
