
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    
    async function createTestUser() {
      const prisma = new PrismaClient();
      
      try {
        // Check if test user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: 'test@example.com' }
        });
        
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash('testpassword123', 10);
          
          const user = await prisma.user.create({
            data: {
              email: 'test@example.com',
              name: 'Test User',
              password: hashedPassword,
              role: 'USER'
            }
          });
          
          console.log('Test user created:', user.email);
        } else {
          console.log('Test user already exists:', existingUser.email);
        }
      } catch (error) {
        console.error('Error creating test user:', error.message);
      } finally {
        await prisma.$disconnect();
      }
    }
    
    createTestUser();
  