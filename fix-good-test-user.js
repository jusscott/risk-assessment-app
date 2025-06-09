#!/usr/bin/env node

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function fixGoodTestUser() {
  console.log('🔧 Fixing good@test.com user password...');
  
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'auth',
    password: 'password',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('✅ Connected to auth database');

    // Generate new password hash
    const newPassword = 'Password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log('✅ Generated new password hash');

    // Update the user's password
    const updateResult = await client.query(
      'UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE email = $2 RETURNING id, email',
      [hashedPassword, 'good@test.com']
    );

    if (updateResult.rows.length > 0) {
      console.log('✅ Password updated successfully');
      console.log(`User ID: ${updateResult.rows[0].id}`);
      console.log(`Email: ${updateResult.rows[0].email}`);
      
      // Test the password immediately
      console.log('\n🧪 Testing new password...');
      const testUser = await client.query(
        'SELECT id, email, password FROM "User" WHERE email = $1',
        ['good@test.com']
      );
      
      if (testUser.rows.length > 0) {
        const passwordTest = await bcrypt.compare(newPassword, testUser.rows[0].password);
        console.log(`Password verification: ${passwordTest ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (passwordTest) {
          console.log('\n🎉 Password fix completed successfully!');
          console.log('Credentials for good@test.com:');
          console.log(`📧 Email: good@test.com`);
          console.log(`🔐 Password: ${newPassword}`);
        }
      }
    } else {
      console.log('❌ User not found or update failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixGoodTestUser();
