#!/usr/bin/env node

/**
 * Script to check if a user exists in the auth database
 * Usage: node check-auth-user.js <email>
 */

const { Client } = require('pg');

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.error('Usage: node check-auth-user.js <email>');
  process.exit(1);
}

async function checkUserExists(userEmail) {
  console.log(`Checking if user "${userEmail}" exists in the auth database...`);

  // Auth database connection parameters (based on docker-compose setup)
  const client = new Client({
    user: 'postgres',
    host: 'localhost',  // Docker exposes the database on localhost
    database: 'auth',   // Correct database name from docker-compose.yml
    password: 'password', // Default password from docker setup
    port: 5432,
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('✅ Connected to auth database');

    // Check if User table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ User table does not exist in the database');
      return;
    }

    // Query for the user
    const userQuery = `
      SELECT 
        id, 
        email, 
        "firstName", 
        "lastName", 
        roles, 
        "isActive", 
        "createdAt", 
        "updatedAt"
      FROM "User" 
      WHERE email = $1
    `;

    const result = await client.query(userQuery, [userEmail]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\n✅ User found!');
      console.log('User details:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
      console.log(`  Roles: ${JSON.stringify(user.roles) || 'N/A'}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log(`  Updated: ${user.updatedAt}`);

      // Check for questionnaire submissions
      try {
        const submissionQuery = `
          SELECT COUNT(*) as count 
          FROM "QuestionnaireSubmission" 
          WHERE "userId" = $1
        `;
        const submissions = await client.query(submissionQuery, [user.id]);
        const submissionCount = submissions.rows[0]?.count || 0;
        console.log(`  Questionnaire Submissions: ${submissionCount}`);
      } catch (submissionError) {
        console.log(`  Questionnaire Submissions: Unable to check (table may not exist)`);
      }
    } else {
      console.log('\n❌ User not found');
      console.log(`No user with email "${userEmail}" exists in the database.`);
      
      // Show total user count for context
      try {
        const countResult = await client.query('SELECT COUNT(*) as total FROM "User"');
        console.log(`Total users in database: ${countResult.rows[0].total}`);
      } catch (err) {
        console.log('Unable to get total user count');
      }
    }

  } catch (error) {
    console.error('\n🚨 Error checking user:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Database connection refused. Make sure Docker services are running:');
      console.error('  docker-compose up -d');
    } else if (error.code === '28000') {
      console.error('Authentication failed. Check database credentials.');
    } else if (error.code === '3D000') {
      console.error('Database "auth_db" does not exist.');
    } else if (error.code === '42P01') {
      console.error('Table "User" does not exist. Database migrations may not have been run.');
    }
    
    console.error('\nTroubleshooting steps:');
    console.error('1. Ensure Docker services are running: docker-compose ps');
    console.error('2. Check database logs: docker-compose logs auth-db');
    console.error('3. Try connecting manually: docker exec -it risk-assessment-app-auth-db-1 psql -U postgres -d auth_db');
  } finally {
    await client.end();
  }
}

// Run the check
checkUserExists(email);
