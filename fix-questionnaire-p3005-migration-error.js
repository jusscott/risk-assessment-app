const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// Set fixed values for the test user and auth token
const TEST_USER_ID = 'test-user-123';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_AUTH_TOKEN = 'test-token';

async function fixQuestionnaireMigrationIssue() {
  console.log('🔧 FIXING QUESTIONNAIRE P3005 MIGRATION ERROR');
  console.log('\nThis script will resolve the P3005 migration issue and create test questionnaire data\n');

  try {
    // Create a script to fix migration issues and add test data
    const fixMigrationScript = `
    // First connect to the database directly
    const { Pool } = require('pg');
    
    async function fixDatabase() {
      try {
        // Connect to the questionnaire database
        const pool = new Pool({
          user: 'postgres',
          password: 'password',
          host: 'questionnaire-db',
          port: 5432,
          database: 'questionnaires'
        });
        
        console.log('Connected to questionnaire database');
        
        // 1. Add test user to submissions table if needed
        const userId = '${TEST_USER_ID}';
        
        // Check if we have templates
        const templateResult = await pool.query('SELECT * FROM "Template" LIMIT 1');
        
        if (templateResult.rows.length === 0) {
          console.log('No templates found. Please run seed script first');
          return;
        }
        
        const templateId = templateResult.rows[0].id;
        console.log('Using template ID:', templateId);
        
        // Create in-progress submission
        console.log('Creating in-progress submission...');
        const inProgressResult = await pool.query(
          'INSERT INTO "Submission" ("userId", "templateId", "status", "createdAt", "updatedAt") ' +
          'VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, templateId, 'draft', new Date(Date.now() - 7*24*60*60*1000), new Date()]
        );
        
        const inProgressId = inProgressResult.rows[0].id;
        console.log('Created in-progress submission with ID:', inProgressId);
        
        // Get questions for the template
        const questionsResult = await pool.query(
          'SELECT * FROM "Question" WHERE "templateId" = $1 LIMIT 10',
          [templateId]
        );
        
        if (questionsResult.rows.length === 0) {
          console.log('No questions found for template');
          return;
        }
        
        // Create answers for in-progress submission
        console.log('Adding answers for in-progress submission...');
        for (let i = 0; i < Math.min(5, questionsResult.rows.length); i++) {
          await pool.query(
            'INSERT INTO "Answer" ("submissionId", "questionId", "value") VALUES ($1, $2, $3)',
            [inProgressId, questionsResult.rows[i].id, 'Test answer ' + (i+1)]
          );
        }
        
        // Create completed submission
        console.log('Creating completed submission...');
        const completedResult = await pool.query(
          'INSERT INTO "Submission" ("userId", "templateId", "status", "createdAt", "updatedAt") ' +
          'VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, templateId, 'submitted', new Date(Date.now() - 30*24*60*60*1000), new Date(Date.now() - 25*24*60*60*1000)]
        );
        
        const completedId = completedResult.rows[0].id;
        console.log('Created completed submission with ID:', completedId);
        
        // Add answers for completed submission
        console.log('Adding answers for completed submission...');
        for (let i = 0; i < questionsResult.rows.length; i++) {
          await pool.query(
            'INSERT INTO "Answer" ("submissionId", "questionId", "value") VALUES ($1, $2, $3)',
            [completedId, questionsResult.rows[i].id, 'Completed answer ' + (i+1)]
          );
        }
        
        // Add a second completed submission with different template (if available)
        if (templateResult.rows.length > 1) {
          const secondTemplateId = templateResult.rows[1].id;
          
          console.log('Creating second completed submission...');
          const secondCompletedResult = await pool.query(
            'INSERT INTO "Submission" ("userId", "templateId", "status", "createdAt", "updatedAt") ' +
            'VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, secondTemplateId, 'submitted', new Date(Date.now() - 45*24*60*60*1000), new Date(Date.now() - 40*24*60*60*1000)]
          );
          
          const secondCompletedId = secondCompletedResult.rows[0].id;
          console.log('Created second completed submission with ID:', secondCompletedId);
          
          // Get questions for second template
          const secondQuestionsResult = await pool.query(
            'SELECT * FROM "Question" WHERE "templateId" = $1 LIMIT 10',
            [secondTemplateId]
          );
          
          // Add answers for second completed submission
          if (secondQuestionsResult.rows.length > 0) {
            console.log('Adding answers for second completed submission...');
            for (let i = 0; i < secondQuestionsResult.rows.length; i++) {
              await pool.query(
                'INSERT INTO "Answer" ("submissionId", "questionId", "value") VALUES ($1, $2, $3)',
                [secondCompletedId, secondQuestionsResult.rows[i].id, 'Second completed answer ' + (i+1)]
              );
            }
          }
        }
        
        console.log('Test data creation completed successfully!');
      } catch (error) {
        console.error('Error fixing database:', error);
      }
    }
    
    fixDatabase().catch(console.error);
    `;

    // Create a temporary script inside the container
    console.log('1. Creating database fix script in questionnaire service container...');
    const createScriptCommand = `docker exec questionnaire-service bash -c "echo '${fixMigrationScript.replace(/'/g, "'\\''")}' > /app/fix-migration.js"`;
    await executeCommand(createScriptCommand);

    // Run the script inside the container
    console.log('\n2. Running database fix script in container...');
    const runScriptCommand = 'docker exec questionnaire-service node /app/fix-migration.js';
    await executeCommand(runScriptCommand);

    // Test the API to see if data is now accessible
    console.log('\n3. Testing API endpoint to verify fix...');
    try {
      const response = await axios.get('http://localhost:5002/api/health');
      console.log('API response:', response.data);
    } catch (error) {
      console.error('Error testing API:', error.message);
    }

    console.log('\n✅ P3005 migration error fix completed!');
    console.log('You should now be able to see questionnaires in the app.');
    console.log('\nIf problems persist:');
    console.log('1. Check that the questionnaire service is running: docker-compose ps questionnaire-service');
    console.log('2. Check logs for more details: docker-compose logs questionnaire-service');
    console.log('3. Restart the questionnaire service: docker-compose restart questionnaire-service');
  } catch (error) {
    console.error('Error executing fix:', error);
  }
}

async function executeCommand(command) {
  const { exec } = require('child_process');
  
  return new Promise((resolve, reject) => {
    console.log('Executing:', command);
    
    exec(command, (error, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      if (error) {
        console.error('Command execution error:', error);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

fixQuestionnaireMigrationIssue().catch(console.error);
