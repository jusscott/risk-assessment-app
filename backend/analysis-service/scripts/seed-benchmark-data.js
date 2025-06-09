/**
 * Script to seed industry benchmark data
 * This script can be used to initialize or refresh industry benchmark data in the database
 */

console.log('Starting industry benchmark data seeding...');

// Import and run the seed script
require('../prisma/benchmark-seed.js');

console.log('Benchmark seeding process initiated.');
