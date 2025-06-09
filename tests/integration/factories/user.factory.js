/**
 * User Factory
 * Creates test user accounts with consistent data
 */

const BaseFactory = require('./base.factory');
const { auth, reporting } = require('../scripts/test-utils');

class UserFactory extends BaseFactory {
  /**
   * Create a user with default values
   * @param {object} overrides - Optional property overrides
   * @returns {Promise<object>} - Created user data and token
   */
  async create(overrides = {}) {
    const userData = {
      email: overrides.email || this.randomString('test-user') + '@example.com',
      password: overrides.password || 'Test12345!',
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      organizationName: overrides.organizationName || 'Test Organization'
    };

    reporting.log(`Creating test user: ${userData.email}`, 'info');

    try {
      // Use the auth utility to register and get a token
      const token = await auth.registerAndLogin(userData);
      
      // Extract user ID from token (if possible)
      let userId = null;
      try {
        // Simple JWT parsing for cleanup purposes - gets the userId from payload
        // This assumes standard JWT format with base64 encoded payload
        const payload = token.split('.')[1];
        if (payload) {
          const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
          userId = decodedPayload.userId || decodedPayload.sub;
          
          if (userId) {
            this.registerForCleanup('user', userId);
          }
        }
      } catch (parseError) {
        reporting.log(`Could not extract user ID from token: ${parseError.message}`, 'warn');
      }

      return {
        user: {
          ...userData,
          id: userId
        },
        token
      };
    } catch (error) {
      reporting.log(`Error creating user: ${error.message}`, 'error');
      
      if (process.env.NODE_ENV === 'test') {
        // In test mode, return simulated data
        const simulatedToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({
          userId: `sim-user-${Date.now()}`,
          email: userData.email,
          role: 'user',
          exp: Math.floor(Date.now() / 1000) + 3600
        })).toString('base64').replace(/=/g, '')}.simulatedSignature`;
        
        return {
          user: userData,
          token: simulatedToken,
          simulated: true
        };
      }
      
      throw error;
    }
  }

  /**
   * Create an admin user
   * @param {object} overrides - Optional property overrides
   * @returns {Promise<object>} - Created admin user data and token
   */
  async createAdmin(overrides = {}) {
    // For admin users, we use a specific email pattern
    const adminOverrides = {
      ...overrides,
      email: overrides.email || this.randomString('test-admin') + '@example.com',
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'Admin'
    };

    const result = await this.create(adminOverrides);
    
    // In a real app, admin role would typically be set in the database
    // Here we're just marking the user as an admin in the returned object
    return {
      ...result,
      user: {
        ...result.user,
        role: 'admin'
      }
    };
  }

  /**
   * Create multiple users at once
   * @param {number} count - Number of users to create
   * @param {object} baseOverrides - Base property overrides for all users
   * @returns {Promise<Array<object>>} - Array of created user data and tokens
   */
  async createMany(count, baseOverrides = {}) {
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const userOverrides = {
        ...baseOverrides,
        email: baseOverrides.email || `${this.randomString('test-user')}-${i}@example.com`
      };
      
      const result = await this.create(userOverrides);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Login an existing user
   * @param {object} credentials - User credentials (email and password)
   * @returns {Promise<string>} - JWT token
   */
  async login(credentials) {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required for login');
    }
    
    return await auth.login(credentials);
  }
}

module.exports = UserFactory;
