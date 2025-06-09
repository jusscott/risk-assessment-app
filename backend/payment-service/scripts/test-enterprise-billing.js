const axios = require('axios');
const config = require('../src/config/config');

const BASE_URL = `http://localhost:${config.app.port}/api`;
const API_KEY = config.internalApiKey || 'test-internal-api-key';

/**
 * Script to test enterprise billing functionality
 */
async function testEnterpriseBilling() {
  try {
    console.log('Testing Enterprise Billing System');
    console.log('================================\n');

    // 1. Create an organization
    console.log('1. Creating organization...');
    const orgResponse = await axios.post(`${BASE_URL}/enterprise/organizations`, {
      name: 'Acme Corporation',
      billingEmail: 'billing@acmecorp.example',
      billingAddress: '123 Acme Road, Acme City, AC 12345',
      taxId: 'US-ACME-12345'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    const organization = orgResponse.data.data;
    console.log(`✓ Organization created: ${organization.name} (ID: ${organization.id})\n`);

    // 2. Create departments
    console.log('2. Creating departments...');
    const deptNames = ['IT Security', 'Compliance', 'DevOps', 'Executive'];
    const departments = [];
    
    for (const name of deptNames) {
      const deptResponse = await axios.post(`${BASE_URL}/enterprise/departments`, {
        organizationId: organization.id,
        name,
        costCenter: `CC-${name.toUpperCase().replace(/\s+/g, '-')}`
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        }
      });
      
      const department = deptResponse.data.data;
      departments.push(department);
      console.log(`✓ Department created: ${department.name} (ID: ${department.id})`);
    }
    console.log();

    // 3. Create an enterprise plan
    console.log('3. Creating enterprise plan...');
    // First, get available plans
    const plansResponse = await axios.get(`${BASE_URL}/plans?isActive=true`, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    
    const availablePlans = plansResponse.data.data;
    if (availablePlans.length === 0) {
      throw new Error('No active plans available. Please create at least one active plan.');
    }
    
    // Use the most expensive plan for enterprise
    const basePlan = availablePlans.sort((a, b) => b.price - a.price)[0];
    
    const enterprisePlanResponse = await axios.post(`${BASE_URL}/enterprise/plans`, {
      organizationId: organization.id,
      planId: basePlan.id,
      seats: 50,
      customPrice: basePlan.price * 50 * 0.85, // 15% bulk discount
      volumeDiscount: 15,
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    const enterprisePlan = enterprisePlanResponse.data.data;
    console.log(`✓ Enterprise plan created: Base plan "${basePlan.name}" with ${enterprisePlan.seats} seats (ID: ${enterprisePlan.id})\n`);

    // 4. Create usage quotas
    console.log('4. Creating usage quotas...');
    const usageTypes = [
      { 
        type: 'report_generation',
        pooled: true, 
        totalQuota: 500,
        perSeatQuota: null,
        unitPrice: 5.99
      },
      { 
        type: 'analysis',
        pooled: true, 
        totalQuota: 1000,
        perSeatQuota: null,
        unitPrice: 3.99
      },
      {
        type: 'questionnaire_submission',
        pooled: false,
        totalQuota: 250,
        perSeatQuota: 5,
        unitPrice: 2.99
      }
    ];
    
    for (const quota of usageTypes) {
      const quotaResponse = await axios.post(`${BASE_URL}/enterprise/quotas`, {
        enterprisePlanId: enterprisePlan.id,
        usageType: quota.type,
        pooled: quota.pooled,
        totalQuota: quota.totalQuota,
        perSeatQuota: quota.perSeatQuota,
        unitPrice: quota.unitPrice
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        }
      });
      
      const usageQuota = quotaResponse.data.data;
      console.log(`✓ Usage quota created: ${usageQuota.usageType} - ${usageQuota.totalQuota} units (ID: ${usageQuota.id})`);
    }
    console.log();

    // 5. Create subscriptions for test users
    console.log('5. Creating test subscriptions...');
    const testUsers = [
      { id: 'user1', department: departments[0] }, // IT Security
      { id: 'user2', department: departments[0] }, // IT Security
      { id: 'user3', department: departments[1] }, // Compliance
      { id: 'user4', department: departments[2] }, // DevOps
      { id: 'user5', department: departments[3] }  // Executive
    ];
    
    for (const user of testUsers) {
      const subscriptionResponse = await axios.post(`${BASE_URL}/enterprise/subscriptions`, {
        enterprisePlanId: enterprisePlan.id,
        userId: user.id,
        departmentId: user.department.id
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        }
      });
      
      const subscription = subscriptionResponse.data.data;
      console.log(`✓ Subscription created for user ${user.id} in ${user.department.name} (ID: ${subscription.id})`);
    }
    console.log();

    // 6. Record usage for test users
    console.log('6. Recording usage...');
    // Generate some random usage for each user
    for (const user of testUsers) {
      // Report generation usage
      const reportCount = Math.floor(Math.random() * 15) + 5;
      for (let i = 0; i < reportCount; i++) {
        await axios.post(`${BASE_URL}/enterprise/usage`, {
          userId: user.id,
          usageType: 'report_generation',
          quantity: 1,
          description: `Generated report #${i+1}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          }
        });
      }
      
      // Analysis usage
      const analysisCount = Math.floor(Math.random() * 30) + 10;
      await axios.post(`${BASE_URL}/enterprise/usage`, {
        userId: user.id,
        usageType: 'analysis',
        quantity: analysisCount,
        description: 'Batch analysis processing'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        }
      });
      
      // Questionnaire submission usage
      const submissionCount = Math.floor(Math.random() * 8) + 2;
      for (let i = 0; i < submissionCount; i++) {
        await axios.post(`${BASE_URL}/enterprise/usage`, {
          userId: user.id,
          usageType: 'questionnaire_submission',
          quantity: 1,
          description: `Submitted questionnaire #${i+1}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          }
        });
      }
      
      console.log(`✓ Recorded usage for user ${user.id}: ${reportCount} reports, ${analysisCount} analysis units, ${submissionCount} questionnaire submissions`);
    }
    console.log();

    // 7. Generate an invoice for the organization
    console.log('7. Generating invoice...');
    const billingStart = new Date();
    billingStart.setMonth(billingStart.getMonth() - 1);
    const billingEnd = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    
    const invoiceResponse = await axios.post(`${BASE_URL}/enterprise/invoices`, {
      organizationId: organization.id,
      billingPeriodStart: billingStart.toISOString(),
      billingPeriodEnd: billingEnd.toISOString(),
      dueDate: dueDate.toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    const invoice = invoiceResponse.data.data;
    console.log(`✓ Invoice generated: ${invoice.amount} ${invoice.currency} (ID: ${invoice.id})`);
    console.log(`  Items: ${JSON.stringify(invoice.items, null, 2)}`);
    
    console.log('\nEnterprise billing test completed successfully!');
  } catch (error) {
    console.error('Error during enterprise billing test:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the test
testEnterpriseBilling();
