const axios = require('axios');
const { exec } = require('child_process');

async function addTestSubmissions() {
  console.log('🔧 ADDING TEST QUESTIONNAIRE SUBMISSIONS');
  console.log('\nThis script will add test questionnaire submissions for the current user\n');

  try {
    // Create a direct SQL script that will run inside the container
    const sqlScript = `
    const pg = require('pg');

    async function createTestData() {
      try {
        // Connect to PostgreSQL
        const client = new pg.Client({
          host: 'questionnaire-db',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'questionnaires'
        });
        
        await client.connect();
        console.log('Connected to database successfully');
        
        // Find templates
        const templatesResult = await client.query('SELECT * FROM "Template" LIMIT 5');
        if (templatesResult.rows.length === 0) {
          console.error('No templates found');
          await client.end();
          return;
        }
        
        console.log(\`Found \${templatesResult.rows.length} templates\`);
        const templateId = templatesResult.rows[0].id;
        
        // Use a fixed test user ID that will work with the frontend
        const userId = 'test-user-123';
        
        // Delete any existing test submissions to avoid duplicates
        console.log('Removing any existing submissions for test user...');
        await client.query('DELETE FROM "Answer" WHERE "submissionId" IN (SELECT id FROM "Submission" WHERE "userId" = $1)', [userId]);
        await client.query('DELETE FROM "Submission" WHERE "userId" = $1', [userId]);
        
        // Create in-progress submission
        console.log('Creating in-progress submission...');
        const inProgressResult = await client.query(
          'INSERT INTO "Submission" ("userId", "templateId", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, templateId, 'draft', new Date(Date.now() - 7*24*60*60*1000), new Date()]
        );
        
        const inProgressId = inProgressResult.rows[0].id;
        console.log('Created in-progress submission with ID:', inProgressId);
        
        // Get questions for template
        const questionsResult = await client.query(
          'SELECT * FROM "Question" WHERE "templateId" = $1 LIMIT 10',
          [templateId]
        );
        
        if (questionsResult.rows.length === 0) {
          console.log('No questions found for template');
          await client.end();
          return;
        }
        
        console.log(\`Found \${questionsResult.rows.length} questions for template\`);
        
        // Add answers to the in-progress submission (about half of them)
        const answerCount = Math.ceil(questionsResult.rows.length / 2);
        console.log(\`Adding \${answerCount} answers to in-progress submission...\`);
        
        for (let i = 0; i < answerCount; i++) {
          const question = questionsResult.rows[i];
          await client.query(
            'INSERT INTO "Answer" ("submissionId", "questionId", "value", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)',
            [inProgressId, question.id, \`Test answer \${i+1}\`, new Date(), new Date()]
          );
        }
        
        // Create completed submission
        console.log('Creating completed submission...');
        const completedResult = await client.query(
          'INSERT INTO "Submission" ("userId", "templateId", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, templateId, 'submitted', new Date(Date.now() - 30*24*60*60*1000), new Date(Date.now() - 25*24*60*60*1000)]
        );
        
        const completedId = completedResult.rows[0].id;
        console.log('Created completed submission with ID:', completedId);
        
        // Add answers to all questions in the completed submission
        console.log(\`Adding \${questionsResult.rows.length} answers to completed submission...\`);
        
        for (let i = 0; i < questionsResult.rows.length; i++) {
          const question = questionsResult.rows[i];
          await client.query(
            'INSERT INTO "Answer" ("submissionId", "questionId", "value", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)',
            [completedId, question.id, \`Completed answer \${i+1}\`, new Date(Date.now() - 30*24*60*60*1000), new Date(Date.now() - 25*24*60*60*1000)]
          );
        }
        
        // Add a second completed submission if we have multiple templates
        if (templatesResult.rows.length > 1) {
          const secondTemplateId = templatesResult.rows[1].id;
          
          console.log('Creating second completed submission with different template...');
          const secondCompletedResult = await client.query(
            'INSERT INTO "Submission" ("userId", "templateId", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, secondTemplateId, 'submitted', new Date(Date.now() - 45*24*60*60*1000), new Date(Date.now() - 40*24*60*60*1000)]
          );
          
          const secondCompletedId = secondCompletedResult.rows[0].id;
          console.log('Created second completed submission with ID:', secondCompletedId);
          
          // Get questions for second template
          const secondQuestionsResult = await client.query(
            'SELECT * FROM "Question" WHERE "templateId" = $1 LIMIT 20',
            [secondTemplateId]
          );
          
          if (secondQuestionsResult.rows.length > 0) {
            console.log(\`Adding \${secondQuestionsResult.rows.length} answers to second completed submission...\`);
            
            for (let i = 0; i < secondQuestionsResult.rows.length; i++) {
              const question = secondQuestionsResult.rows[i];
              await client.query(
                'INSERT INTO "Answer" ("submissionId", "questionId", "value", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)',
                [secondCompletedId, question.id, \`Second template answer \${i+1}\`, new Date(Date.now() - 45*24*60*60*1000), new Date(Date.now() - 40*24*60*60*1000)]
              );
            }
          }
        }
        
        console.log('Test data creation completed successfully!');
        await client.end();
      } catch (error) {
        console.error('Error creating test data:', error);
      }
    }

    createTestData().catch(console.error);
    `;

    // Check if the container is running
    console.log('Checking if questionnaire-service container is running...');
    exec('docker ps | grep questionnaire-service', (err, stdout, stderr) => {
      if (err || !stdout) {
        console.error('Error: questionnaire-service container is not running. Please start the container and try again.');
        return;
      }

      console.log('✅ questionnaire-service container is running');

      // Create the script file in the container
      const createScriptCommand = `docker exec questionnaire-service bash -c "echo '${sqlScript.replace(/'/g, "'\\''")}' > /app/create-test-data.js"`;
      
      exec(createScriptCommand, (err, stdout, stderr) => {
        if (err) {
          console.error('Error creating script file:', err);
          return;
        }

        console.log('✅ Created test data script in container');
        
        // Run the script in the container
        console.log('Running test data script in container...');
        exec('docker exec questionnaire-service node /app/create-test-data.js', (err, stdout, stderr) => {
          if (err) {
            console.error('Error executing script:', err);
            return;
          }
          
          if (stdout) console.log(stdout);
          if (stderr) console.error(stderr);
          
          console.log('Testing API endpoint connectivity...');
          // Test the questionnaire service endpoint
          setTimeout(() => {
            axios.get('http://localhost:5002/api/health')
              .then(response => {
                console.log('Questionnaire service health check successful:', response.data);
                
                console.log('\n✅ Test data creation process completed successfully!');
                console.log('\nYou can now navigate to http://localhost:3000/questionnaires to see the test submissions.');
              })
              .catch(error => {
                console.error('Error connecting to API:', error.message);
                console.log('\nThe submissions should be created in the database, but there may be issues connecting to the API.');
                console.log('Try restarting the questionnaire-service: docker-compose restart questionnaire-service');
              });
          }, 2000);
        });
      });
    });

  } catch (error) {
    console.error('Script error:', error);
  }
}

addTestSubmissions();
