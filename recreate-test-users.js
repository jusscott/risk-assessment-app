#!/usr/bin/env node

/**
 * Recreate Test Users After Project Relocation
 * 
 * This script recreates the test users that were lost during project relocation.
 * It uses the auth-service API to create users with proper bcrypt password hashing.
 */

const axios = require('axios');
const bcrypt = require('bcryptjs');

class UserRecreator {
  constructor() {
    this.authServiceURL = 'http://localhost:5001';
    this.testUsers = [
      {
        email: 'good@test.com',
        password: 'Password123',
        firstName: 'Good',
        lastName: 'Test User',
        role: 'USER'
      },
      {
        email: 'jusscott@gmail.com',
        password: 'Password123',
        firstName: 'Justin',
        lastName: 'Scott',
        role: 'ADMIN'
      }
    ];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Check if auth service is available
  async checkAuthService() {
    try {
      const response = await axios.get(`${this.authServiceURL}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      await this.log(`Auth service not available: ${error.message}`, 'error');
      return false;
    }
  }

  // Create user via registration endpoint
  async createUser(user) {
    try {
      await this.log(`Creating user: ${user.email}`, 'info');
      
      const response = await axios.post(`${this.authServiceURL}/register`, {
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName
      }, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 201 || response.status === 200) {
        if (response.data.success) {
          await this.log(`Successfully created user: ${user.email}`, 'success');
          return true;
        } else {
          await this.log(`Failed to create user ${user.email}: ${response.data.error?.message || 'Unknown error'}`, 'error');
          return false;
        }
      } else {
        await this.log(`Failed to create user ${user.email}: HTTP ${response.status}`, 'error');
        if (response.data.error) {
          await this.log(`Error details: ${response.data.error.message}`, 'error');
        }
        return false;
      }
    } catch (error) {
      await this.log(`Error creating user ${user.email}: ${error.message}`, 'error');
      if (error.response?.data?.error) {
        await this.log(`API Error: ${error.response.data.error.message}`, 'error');
      }
      return false;
    }
  }

  // Verify user was created and can login
  async verifyUser(user) {
    try {
      const response = await axios.post(`http://localhost:5000/api/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200 && response.data.success) {
        await this.log(`Login verification successful for: ${user.email}`, 'success');
        return true;
      } else {
        await this.log(`Login verification failed for: ${user.email}`, 'error');
        return false;
      }
    } catch (error) {
      await this.log(`Login verification error for ${user.email}: ${error.message}`, 'error');
      return false;
    }
  }

  // Direct database creation (fallback method)
  async createUserDirectDatabase() {
    await this.log('Attempting direct database user creation...', 'info');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    for (const user of this.testUsers) {
      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(user.password, 12);
        const userId = require('crypto').randomUUID();
        
        const insertQuery = `
          INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "isEmailVerified", "createdAt", "updatedAt")
          VALUES ('${userId}', '${user.email}', '${hashedPassword}', '${user.firstName}', '${user.lastName}', '${user.role}', true, NOW(), NOW())
          ON CONFLICT (email) DO NOTHING;
        `;

        await execAsync(`docker-compose exec -T auth-db psql -U postgres -d auth -c "${insertQuery}"`);
        await this.log(`Direct database creation successful for: ${user.email}`, 'success');
      } catch (error) {
        await this.log(`Direct database creation failed for ${user.email}: ${error.message}`, 'error');
      }
    }
  }

  // Main recreation process
  async recreateUsers() {
    await this.log('🚀 Starting Test User Recreation Process', 'info');
    
    // Check if auth service is available
    const authAvailable = await this.checkAuthService();
    if (!authAvailable) {
      await this.log('Auth service not available. Trying direct database approach...', 'warning');
      await this.createUserDirectDatabase();
      
      // Wait a bit and try verification
      await this.log('Waiting 5 seconds for changes to take effect...', 'info');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      // Try API approach first
      await this.log('Auth service available. Using registration API...', 'info');
      
      let allCreated = true;
      for (const user of this.testUsers) {
        const created = await this.createUser(user);
        if (!created) {
          allCreated = false;
        }
      }

      if (!allCreated) {
        await this.log('API creation had issues. Trying direct database approach...', 'warning');
        await this.createUserDirectDatabase();
      }
    }

    // Verify all users can login
    await this.log('🔍 Verifying created users...', 'info');
    
    let allVerified = true;
    for (const user of this.testUsers) {
      const verified = await this.verifyUser(user);
      if (!verified) {
        allVerified = false;
      }
    }

    // Final status
    if (allVerified) {
      await this.log('✅ SUCCESS: All test users recreated and verified!', 'success');
      await this.log('', 'info');
      await this.log('You can now login with:', 'info');
      this.testUsers.forEach(user => {
        this.log(`  - ${user.email} / ${user.password}`, 'info');
      });
      await this.log('', 'info');
      await this.log('Next steps:', 'info');
      await this.log('1. Test login at http://localhost:3000', 'info');
      await this.log('2. Run comprehensive tests: node comprehensive-login-e2e-test.js', 'info');
    } else {
      await this.log('❌ FAILED: Some users could not be verified', 'error');
      await this.log('Try running: docker-compose restart auth-service', 'warning');
      await this.log('Then run this script again', 'warning');
    }

    return allVerified;
  }
}

async function main() {
  const recreator = new UserRecreator();
  const success = await recreator.recreateUsers();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ User recreation failed:', error);
    process.exit(1);
  });
}

module.exports = UserRecreator;
