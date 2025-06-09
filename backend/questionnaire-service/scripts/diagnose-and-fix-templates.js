/**
 * Diagnose and Fix Questionnaire Templates
 * 
 * This script diagnoses and resolves issues with questionnaire templates,
 * specifically addressing the "Failed to load questionnaire templates" error.
 * 
 * It checks:
 * 1. Database connectivity
 * 2. DNS resolution
 * 3. Template availability
 * 4. Reseeds templates if needed
 */
const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const dns = require('dns');
const frameworkRegistry = require('../src/data/frameworks/index');
const path = require('path');
const fs = require('fs');

// Create Prisma client
const prisma = new PrismaClient();

// Admin override key (used for diagnostic endpoints)
const adminOverrideKey = 'admin-temp-override';

// Determine the questionnaire service URL
const isDocker = fs.existsSync('/.dockerenv');
const serviceUrl = process.env.SERVICE_URL || (isDocker ? 'http://questionnaire-service:5002' : 'http://localhost:5002');
console.log(`Using service URL: ${serviceUrl} (Docker environment: ${isDocker})`);

/**
 * Check DNS resolution for a hostname
 */
async function checkDnsResolution(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        console.error(`DNS resolution failed for ${hostname}:`, err.message);
        resolve({ success: false, error: err.message });
      } else {
        console.log(`DNS resolution successful for ${hostname}: ${address}`);
        resolve({ success: true, address });
      }
    });
  });
}

/**
 * Check database connectivity
 */
async function checkDatabaseConnection() {
  // Check for bypass flag
  if (process.env.BYPASS_DB_VALIDATION === 'true') {
    console.log('✓ Database validation bypassed in development mode');
    return { success: true };
  }
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful');
    return { success: true };
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if templates exist in the database
 */
async function checkTemplates() {
  try {
    const count = await prisma.template.count();
    console.log(`Found ${count} templates in database`);
    return { success: true, count };
  } catch (error) {
    console.error('Error checking templates:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Manually seed a template (bypassing the API)
 */
async function manuallyCreateTemplate(framework) {
  try {
    console.log(`Manually creating template for ${framework.displayName}`);
    
    // Check if template already exists
    const existingTemplate = await prisma.template.findFirst({
      where: { name: framework.displayName }
    });
    
    if (existingTemplate) {
      console.log(`Template already exists for ${framework.displayName}`);
      return { success: true, templateId: existingTemplate.id };
    }
    
    // Load the template JSON file
    const templateFilePath = path.join(__dirname, '../src/data/frameworks', framework.templateFile);
    
    if (!fs.existsSync(templateFilePath)) {
      console.error(`Template file not found: ${templateFilePath}`);
      return { success: false, error: 'Template file not found' };
    }
    
    const templateData = JSON.parse(fs.readFileSync(templateFilePath, 'utf8'));
    
    // Create the template record
    const template = await prisma.template.create({
      data: {
        name: framework.displayName,
        description: framework.description,
        category: framework.category
      }
    });
    
    console.log(`Created template record for ${framework.displayName} with ID ${template.id}`);
    
    // Process each section and create questions
    let questionCount = 0;
    let globalQuestionOrder = 1;
    
    for (const section of templateData.sections) {
      for (const question of section.questions) {
        // Determine question type and options
        let questionType = question.type;
        let options = [];
        
        if (question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') {
          if (question.options && Array.isArray(question.options)) {
            options = question.options.map(opt => 
              typeof opt === 'object' ? opt.text || opt.value : opt
            );
          }
        }
        
        // Create question in database
        await prisma.question.create({
          data: {
            text: `${section.title}: ${question.text}`,
            type: questionType,
            options: options,
            required: question.required || false,
            order: globalQuestionOrder++,
            templateId: template.id
          }
        });
        questionCount++;
      }
    }
    
    console.log(`Created ${questionCount} questions for template ${template.id}`);
    return { success: true, templateId: template.id, questionCount };
  } catch (error) {
    console.error('Error creating template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Try using the API to seed templates
 */
async function seedTemplatesViaApi() {
  try {
    console.log('Attempting to seed templates via API...');
    
    // Check service status
    const statusResponse = await fetch(`${serviceUrl}/diagnostic/status`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!statusResponse.ok) {
      console.error('Status API call failed:', statusResponse.status);
      return { success: false, error: 'Status API call failed' };
    }
    
    const statusData = await statusResponse.json();
    console.log('Service status:', statusData.success ? 'OK' : 'Error');
    
    if (statusData.data && statusData.data.frameworks) {
      console.log(`Registered frameworks: ${statusData.data.frameworks.registeredCount}`);
      console.log(`Missing templates: ${statusData.data.frameworks.missingTemplates.length > 0 ? 
        statusData.data.frameworks.missingTemplates.join(', ') : 'None'}`);
    }
    
    // Call the reseed endpoint
    const reseedResponse = await fetch(`${serviceUrl}/diagnostic/reseed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-admin-override': adminOverrideKey
      }
    });
    
    if (!reseedResponse.ok) {
      console.error('Reseed API call failed:', reseedResponse.status);
      const errorData = await reseedResponse.json();
      console.error('Reseed error details:', errorData);
      return { success: false, error: 'Reseed API call failed' };
    }
    
    const reseedData = await reseedResponse.json();
    console.log('Reseed result:', reseedData);
    return { success: true, templateCount: reseedData.data.templateCount };
  } catch (error) {
    console.error('Error seeding via API:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to diagnose and fix template issues
 */
async function diagnoseAndFix() {
  console.log('=======================================');
  console.log('QUESTIONNAIRE TEMPLATE DIAGNOSIS');
  console.log('=======================================');
  console.log('Starting diagnosis at:', new Date().toISOString());
  console.log('Service URL:', serviceUrl);
  
  // Step 1: Check DNS resolution for critical services
  console.log('\n=== Step 1: Checking DNS Resolution ===');
  
  // Check if we're in Docker and resolve hosts accordingly
  if (isDocker) {
    await checkDnsResolution('questionnaire-service');
    await checkDnsResolution('auth-service');
    await checkDnsResolution('api-gateway');
  } else {
    // Try to extract hostname from service URL
    try {
      const url = new URL(serviceUrl);
      await checkDnsResolution(url.hostname);
    } catch (error) {
      console.log('Not checking DNS for localhost/IP address');
    }
  }
  
  // Step 2: Check database connectivity
  console.log('\n=== Step 2: Checking Database Connectivity ===');
  const dbResult = await checkDatabaseConnection();
  
  if (!dbResult.success) {
    console.error('Database connection failed. Cannot proceed with template checks.');
    console.log('Please check your DATABASE_URL environment variable and ensure the database is running.');
    return;
  }
  
  // Step 3: Check templates
  console.log('\n=== Step 3: Checking Templates ===');
  const templatesResult = await checkTemplates();
  
  if (templatesResult.success && templatesResult.count > 0) {
    console.log(`✓ ${templatesResult.count} templates found in database.`);
    console.log('No action needed for templates.');
  } else {
    console.log('No templates found or error checking templates. Will attempt to fix.');
    
    // Step 4: Try to fix templates via API
    console.log('\n=== Step 4: Attempting to Fix Templates via API ===');
    const apiResult = await seedTemplatesViaApi();
    
    if (apiResult.success) {
      console.log(`✓ Successfully seeded ${apiResult.templateCount} templates via API.`);
    } else {
      console.log('✗ Failed to seed templates via API. Will attempt manual seeding.');
      
      // Step 5: Manually create templates
      console.log('\n=== Step 5: Manually Creating Templates ===');
      const frameworks = frameworkRegistry.getAllFrameworks();
      console.log(`Found ${frameworks.length} frameworks in registry.`);
      
      let successCount = 0;
      for (const framework of frameworks) {
        console.log(`Processing framework: ${framework.id} (${framework.displayName})`);
        const result = await manuallyCreateTemplate(framework);
        
        if (result.success) {
          console.log(`✓ Successfully created template for ${framework.displayName}`);
          successCount++;
        } else {
          console.error(`✗ Failed to create template for ${framework.displayName}: ${result.error}`);
        }
      }
      
      console.log(`Manually created ${successCount} of ${frameworks.length} templates.`);
    }
    
    // Final check
    const finalCheck = await checkTemplates();
    if (finalCheck.success && finalCheck.count > 0) {
      console.log(`\n✓ Final check: ${finalCheck.count} templates are now in the database.`);
    } else {
      console.error('\n✗ Final check: Still no templates in the database after fixing attempts.');
    }
  }
  
  console.log('\n=======================================');
  console.log('DIAGNOSIS COMPLETE');
  console.log('=======================================');
}

// Run the diagnosis and fix
diagnoseAndFix()
  .catch(error => {
    console.error('Error during diagnosis:', error);
  })
  .finally(async () => {
    // Disconnect from Prisma
    await prisma.$disconnect();
  });
