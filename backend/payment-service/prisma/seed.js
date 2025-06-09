/**
 * Prisma seed script for payment-service
 * Creates initial data for the payment service database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding payment service database...');
  
  try {
    // Create subscription plans
    await createPlans();
    
    // Create sample data if in development mode
    if (process.env.NODE_ENV === 'development') {
      await createSampleData();
    }
    
    console.log('Payment service database seeding completed.');
  } catch (error) {
    console.error('Error seeding payment service database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createPlans() {
  const plans = [
    {
      id: 1,
      name: 'Free',
      description: 'Basic risk assessment features',
      price: 0,
      interval: 'monthly',
      features: JSON.stringify(['1 questionnaire per month', 'Basic report generation', 'Email support']),
      isActive: true,
      trialDays: 0,
      maxQuestionnaires: 1,
      maxReports: 1
    },
    {
      id: 2,
      name: 'Professional',
      description: 'Advanced risk assessment tools for professional use',
      price: 29.99,
      interval: 'monthly',
      features: JSON.stringify([
        'Unlimited questionnaires', 
        'Advanced reports with recommendations', 
        'Export to PDF/DOCX', 
        'Priority email support'
      ]),
      isActive: true,
      trialDays: 7,
      maxQuestionnaires: 20,
      maxReports: 10
    },
    {
      id: 3,
      name: 'Enterprise',
      description: 'Complete risk management solution for organizations',
      price: 99.99,
      interval: 'monthly',
      features: JSON.stringify([
        'Unlimited questionnaires and reports', 
        'Custom compliance frameworks', 
        'Team collaboration tools', 
        'API access', 
        'Dedicated support'
      ]),
      isActive: true,
      trialDays: 14,
      maxQuestionnaires: null, // unlimited
      maxReports: null // unlimited
    }
  ];

  console.log('Creating subscription plans...');
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan
    });
    console.log(`Created plan: ${plan.name}`);
  }
}

async function createSampleData() {
  console.log('Creating sample payments and subscriptions...');

  // Sample user IDs
  const userIds = ['user123', 'user456', 'user789'];
  
  // Create sample payments
  for (let i = 0; i < 3; i++) {
    const userId = userIds[i];
    const planId = i + 1;
    
    // Create a payment
    await prisma.payment.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        userId: userId,
        planId: planId,
        amount: planId === 1 ? 0 : planId === 2 ? 29.99 : 99.99,
        currency: 'USD',
        status: 'completed',
        paymentMethod: planId === 1 ? null : 'credit_card',
        transactionId: planId === 1 ? null : `txn_${Date.now()}_${i}`,
        metadata: planId === 1 ? null : JSON.stringify({
          cardLast4: '4242',
          cardBrand: 'visa'
        })
      }
    });
    console.log(`Created sample payment for user ${userId}`);
    
    // Create a subscription
    await prisma.subscription.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        userId: userId,
        planId: planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
      }
    });
    console.log(`Created sample subscription for user ${userId}`);
  }
}

seed();
