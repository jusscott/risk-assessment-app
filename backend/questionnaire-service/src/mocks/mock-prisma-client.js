/**
 * Mock Prisma Client
 * 
 * This module provides mock implementations of Prisma client functions
 * for testing without a database connection.
 */

const mockData = require('./mock-data');

// Create mock client instance
const mockPrismaClient = {
  // Mock template operations
  template: {
    findMany: async () => mockData.templates,
    findUnique: async ({ where }) => {
      if (!where || !where.id) return null;
      return mockData.templates.find(t => t.id === where.id) || null;
    },
    create: async ({ data }) => {
      const newTemplate = { ...data, id: 'template-' + Date.now() };
      mockData.templates.push(newTemplate);
      return newTemplate;
    },
    update: async ({ where, data }) => {
      const template = mockData.templates.find(t => t.id === where.id);
      if (!template) throw new Error('Template not found');
      Object.assign(template, data);
      return template;
    },
    delete: async ({ where }) => {
      const index = mockData.templates.findIndex(t => t.id === where.id);
      if (index === -1) throw new Error('Template not found');
      const [deletedTemplate] = mockData.templates.splice(index, 1);
      return deletedTemplate;
    }
  },
  
  // Mock submission operations
  submission: {
    findMany: async () => mockData.submissions,
    findUnique: async ({ where }) => {
      if (!where || !where.id) return null;
      return mockData.submissions.find(s => s.id === where.id) || null;
    },
    create: async ({ data }) => {
      const newSubmission = { ...data, id: 'submission-' + Date.now() };
      mockData.submissions.push(newSubmission);
      return newSubmission;
    },
    update: async ({ where, data }) => {
      const submission = mockData.submissions.find(s => s.id === where.id);
      if (!submission) throw new Error('Submission not found');
      Object.assign(submission, data);
      return submission;
    }
  },
  
  // Mock user operations
  user: {
    findMany: async () => mockData.users,
    findUnique: async ({ where }) => {
      if (!where) return null;
      if (where.id) return mockData.users.find(u => u.id === where.id) || null;
      if (where.email) return mockData.users.find(u => u.email === where.email) || null;
      return null;
    }
  },
  
  // Mock raw query execution
  $queryRaw: async () => [],
  
  // Mock transactions
  $transaction: async (operations) => {
    return Promise.all(operations);
  }
};

// Export mock client factory
module.exports = {
  PrismaClient: function() {
    return mockPrismaClient;
  }
};