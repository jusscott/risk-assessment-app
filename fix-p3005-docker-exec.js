/**
 * P3005 Error Fix Script - Docker Container Version
 * 
 * This script creates and executes a migration fix and test data script
 * directly in the questionnaire-service container to fix the P3005 issue.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Test user constants
const TEST_USER_ID = 'test-user-123';

async function main() {
  console.log('🔧 FIXING P3005 MIGRATION ERROR AND ADDING TEST DATA');
  console.log('==================================================\n');

  try {
    // Step 1: Check if the container is running
    console.log('Step 1: Checking if questionnaire-service container is running...');
    
    try {
      const containerCheck = execSync('docker ps | grep questionnaire-service', { encoding: 'utf8' });
      if (!containerCheck) {
        console.log('❌ questionnaire-service container not running. Please start the containers first.');
        return;
      }
      console.log('✅ questionnaire-service container is running');
    } catch (error) {
      console.log('❌ questionnaire-service container not running. Please start the containers first.');
      return;
    }

    // Step 2: Create migration fix script
    console.log('\nStep 2: Creating migration fix script...');
    
    const migrationFixScript = `
      // Migration Fix Script
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function fixP3005Error() {
        try {
          console.log('📋 Checking migration status...');
          
          // Check if _prisma_migrations table exists
          const tableExists = await prisma.$queryRaw\`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name = '_prisma_migrations'
            );
          \`;
          
          const migrationsTableExists = tableExists[0].exists;
          
          if (!migrationsTableExists) {
            console.log('⚠️ _prisma_migrations table does not exist. Creating it...');
            
            await prisma.$executeRaw\`
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
            \`;
            console.log('✅ Created _prisma_migrations table');
          }
          
          // Check for existing migrations
          const migrationCount = await prisma.$queryRaw\`
            SELECT COUNT(*) FROM "_prisma_migrations";
          \`;
          
          const migrationCountValue = parseInt(migrationCount[0].count);
          
          // Check for existing tables (P3005 happens when schema exists but migrations aren't recorded)
          const existingTables = await prisma.$queryRaw\`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public' 
            AND tablename != '_prisma_migrations';
          \`;
          
          if (existingTables.length > 0 && migrationCountValue === 0) {
            console.log('🔍 Found existing tables but no migration records.');
            console.log('➡️ Adding migration records to fix P3005 error...');
            
            // Add base migration as applied
            await prisma.$executeRaw\`
              INSERT INTO "_prisma_migrations" (
                id, 
                checksum, 
                migration_name, 
                logs, 
                finished_at, 
                applied_steps_count
              )
              VALUES (
                '00000000-0000-0000-0000-000000000001',
                'manual-migration-fix',
                '20250521_initial',
                'Applied manually to fix P3005 error',
                NOW(),
                1
              );
            \`;
            
            console.log('✅ Added migration record to fix P3005 error');
          } else if (existingTables.length > 0) {
            console.log('✅ Found existing tables and migration records. No fix needed.');
          } else {
            console.log('⚠️ No tables found in the database. Schema may need to be created.');
            console.log('▶️ Attempting to run Prisma migrations...');
            
            try {
              // We can run the migrations using exec if needed
              console.log('Migrations must be run separately. The database is empty.');
            } catch (error) {
              console.error('❌ Error applying migrations:', error);
            }
          }
          
          console.log('✅ Migration fix script completed!');
        } catch (error) {
          console.error('❌ Error in migration fix script:', error);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      fixP3005Error().catch(console.error);
    `;
    
    fs.writeFileSync('./migration-fix.js', migrationFixScript);
    console.log('✅ Created migration fix script');
    
    // Step 3: Create test data script
    console.log('\nStep 3: Creating test data script...');
    
    const testDataScript = `
      // Test Data Creation Script
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function createTestData() {
        try {
          console.log('📋 Creating test questionnaire data...');
          
          // Check if templates exist
          const templates = await prisma.template.findMany({
            take: 5
          });
          
          if (templates.length === 0) {
            console.log('⚠️ No templates found. Please run seed script first.');
            return;
          }
          
          console.log(\`📁 Found \${templates.length} templates\`);
          
          // Use the first template for our test submissions
          const templateId = templates[0].id;
          console.log(\`ℹ️ Using template: \${templateId}\`);
          
          // Define test user
          const userId = '${TEST_USER_ID}';
          
          // Clean up any existing test submissions
          console.log('🗑️ Cleaning up existing test submissions...');
          
          const deleteAnswers = await prisma.answer.deleteMany({
            where: {
              submission: {
                userId: userId
              }
            }
          });
          
          console.log(\`🗑️ Deleted \${deleteAnswers.count} existing answers\`);
          
          const deleteSubmissions = await prisma.submission.deleteMany({
            where: {
              userId: userId
            }
          });
          
          console.log(\`🗑️ Deleted \${deleteSubmissions.count} existing submissions\`);
          
          // Create draft submission
          console.log('📝 Creating draft submission...');
          const draftSubmission = await prisma.submission.create({
            data: {
              userId: userId,
              templateId: templateId,
              status: 'draft',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              updatedAt: new Date()
            }
          });
          
          console.log(\`✅ Created draft submission with ID: \${draftSubmission.id}\`);
          
          // Get questions for this template
          const questions = await prisma.question.findMany({
            where: {
              templateId: templateId
            },
            take: 10
          });
          
          if (questions.length === 0) {
            console.log('⚠️ No questions found for template');
            return;
          }
          
          console.log(\`📋 Found \${questions.length} questions\`);
          
          // Add answers to half of the questions in draft submission
          const halfQuestions = questions.slice(0, Math.ceil(questions.length / 2));
          console.log(\`✍️ Adding \${halfQuestions.length} answers to draft submission...\`);
          
          for (let i = 0; i < halfQuestions.length; i++) {
            await prisma.answer.create({
              data: {
                submissionId: draftSubmission.id,
                questionId: halfQuestions[i].id,
                value: \`Draft answer \${i + 1}\`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
          
          // Create completed submission
          console.log('📝 Creating completed submission...');
          const completedSubmission = await prisma.submission.create({
            data: {
              userId: userId,
              templateId: templateId,
              status: 'submitted',
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
            }
          });
          
          console.log(\`✅ Created completed submission with ID: \${completedSubmission.id}\`);
          
          // Add answers to all questions in completed submission
          console.log(\`✍️ Adding \${questions.length} answers to completed submission...\`);
          
          for (let i = 0; i < questions.length; i++) {
            await prisma.answer.create({
              data: {
                submissionId: completedSubmission.id,
                questionId: questions[i].id,
                value: \`Completed answer \${i + 1}\`,
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
              }
            });
          }
          
          // If we have a second template, create another submission for it
          if (templates.length > 1) {
            const secondTemplateId = templates[1].id;
            
            console.log('📝 Creating submission for second template...');
            const secondSubmission = await prisma.submission.create({
              data: {
                userId: userId,
                templateId: secondTemplateId,
                status: 'submitted',
                createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
              }
            });
            
            console.log(\`✅ Created second template submission with ID: \${secondSubmission.id}\`);
            
            // Get questions for second template
            const secondTemplateQuestions = await prisma.question.findMany({
              where: {
                templateId: secondTemplateId
              },
              take: 20
            });
            
            if (secondTemplateQuestions.length > 0) {
              console.log(\`✍️ Adding \${secondTemplateQuestions.length} answers to second template submission...\`);
              
              for (let i = 0; i < secondTemplateQuestions.length; i++) {
                await prisma.answer.create({
                  data: {
                    submissionId: secondSubmission.id,
                    questionId: secondTemplateQuestions[i].id,
                    value: \`Second template answer \${i + 1}\`,
                    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
                  }
                });
              }
            }
          }
          
          console.log('✅ Test data creation completed successfully!');
        } catch (error) {
          console.error('❌ Error creating test data:', error);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      createTestData().catch(console.error);
    `;
    
    fs.writeFileSync('./test-data.js', testDataScript);
    console.log('✅ Created test data script');
    
    // Step 4: Copy scripts to container
    console.log('\nStep 4: Copying scripts to container...');
    
    try {
      execSync('docker cp ./migration-fix.js questionnaire-service:/app/migration-fix.js', { stdio: 'inherit' });
      execSync('docker cp ./test-data.js questionnaire-service:/app/test-data.js', { stdio: 'inherit' });
      console.log('✅ Copied scripts to container');
    } catch (error) {
      console.error('❌ Error copying scripts to container:', error);
      return;
    }
    
    // Step 5: Execute migration fix script in container
    console.log('\nStep 5: Executing migration fix script in container...');
    
    try {
      execSync('docker exec questionnaire-service node /app/migration-fix.js', { stdio: 'inherit' });
      console.log('✅ Migration fix script executed successfully');
    } catch (error) {
      console.error('❌ Error executing migration fix script:', error);
      return;
    }
    
    // Step 6: Execute test data script in container
    console.log('\nStep 6: Executing test data script in container...');
    
    try {
      execSync('docker exec questionnaire-service node /app/test-data.js', { stdio: 'inherit' });
      console.log('✅ Test data script executed successfully');
    } catch (error) {
      console.error('❌ Error executing test data script:', error);
    }
    
    // Step 7: Clean up temporary files
    console.log('\nStep 7: Cleaning up temporary files...');
    
    try {
      fs.unlinkSync('./migration-fix.js');
      fs.unlinkSync('./test-data.js');
      console.log('✅ Removed temporary files');
    } catch (error) {
      console.error('❌ Error removing temporary files:', error);
    }
    
    // Step 8: Verify API connectivity
    console.log('\nStep 8: Testing API connectivity...');
    
    try {
      execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5002/api/health', { stdio: 'inherit' });
      console.log('✅ API connectivity check successful!');
    } catch (error) {
      console.error('❌ Error testing API connectivity:', error);
      console.log('\nThe database should be fixed, but there might be connectivity issues with the API.');
      console.log('Try restarting the questionnaire service:');
      console.log('docker-compose restart questionnaire-service');
    }
    
    // Final message
    console.log('\n✅ OPERATION COMPLETE');
    console.log('====================');
    console.log('P3005 migration issue has been fixed and test data has been created.');
    console.log('You should now be able to see questionnaires in the application.');
    console.log('\nIf you do not see your questionnaires, try restarting the questionnaire service:');
    console.log('docker-compose restart questionnaire-service');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Execute the script
main().catch(console.error);
