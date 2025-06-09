/**
 * Prisma Client Utility
 * 
 * This module provides a factory function for creating a Prisma client
 * that can be replaced with a mock for testing.
 */

let { PrismaClient } = require('@prisma/client');
const config = require('../config/config');

// Use mock client if configured
if (config.mockPrismaClient) {
  try {
    const mockPrisma = require('../mocks/mock-prisma-client');
    PrismaClient = mockPrisma.PrismaClient;
    console.log('Using mock Prisma client for database operations');
  } catch (error) {
    console.error('Failed to load mock Prisma client, using real client:', error.message);
  }
}

// Create and export client instance
const prisma = new PrismaClient();
module.exports = prisma;