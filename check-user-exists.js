#!/usr/bin/env node

/**
 * Script to check if a user exists in the database
 * Usage: node check-user-exists.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.error('Usage: node check-user-exists.js <email>');
  process.exit(1);
}

async function checkUserExists(userEmail) {
  // Initialize Prisma client for auth service
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.AUTH_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/auth_db'
      }
    }
  });

  try {
    console.log(`Checking if user "${userEmail}" exists in the database...`);
    
    // Query the user table
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user) {
      console.log('\n✅ User found!');
      console.log('User details:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
      console.log(`  Roles: ${JSON.stringify(user.roles) || 'N/A'}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log(`  Updated: ${user.updatedAt}`);
      
      // Also check for any questionnaire submissions by this user
      try {
        const submissions = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM "QuestionnaireSubmission" 
          WHERE "userId" = ${user.id}::uuid
        `;
        const submissionCount = submissions[0]?.count || 0;
        console.log(`  Questionnaire Submissions: ${submissionCount}`);
      } catch (submissionError) {
        console.log(`  Questionnaire Submissions: Unable to check (${submissionError.message})`);
      }
      
    } else {
      console.log('\n❌ User not found');
      console.log(`No user with email "${userEmail}" exists in the database.`);
    }

  } catch (error) {
    console.error('\n🚨 Error checking user:', error.message);
    
    if (error.code === 'P1001') {
      console.error('Database connection failed. Make sure the auth-service database is running.');
    } else if (error.code === 'P2021') {
      console.error('Table does not exist. Make sure database migrations have been run.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkUserExists(email);
