/**
 * Diagnostic Routes
 * Provides endpoints for system diagnosis and troubleshooting
 * Only enabled in development and test environments
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
// Use environment variables for database connection
const prisma = new PrismaClient();
const frameworkRegistry = require('../data/frameworks/index');
const path = require('path');
const fs = require('fs');

/**
 * @route GET /diagnostic/status
 * @desc Get diagnostic information about the service
 * @access Public (but restricted to non-production environments)
 */
router.get('/status', async (req, res) => {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_DISABLED',
        message: 'Diagnostic endpoints are disabled in production'
      }
    });
  }

  try {
    // Check database connection
    let dbConnectionOk = false;
    let dbErrorMessage = null;
    let templateCount = 0;
    let questionCount = 0;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnectionOk = true;
      
      // Get template count
      templateCount = await prisma.template.count();
      
      // Get question count
      questionCount = await prisma.question.count();
    } catch (dbError) {
      dbErrorMessage = dbError.message;
      console.error('Database connection error in diagnostic endpoint:', dbError);
    }

    // Get framework info from registry
    const frameworks = frameworkRegistry.getAllFrameworks();
    
    // For each framework, check if a template exists in the DB
    let frameworksWithTemplates = [];
    let missingTemplates = [];
    
    if (dbConnectionOk) {
      for (const framework of frameworks) {
        const existingTemplate = await prisma.template.findFirst({
          where: {
            name: framework.displayName
          }
        });
        
        if (existingTemplate) {
          frameworksWithTemplates.push(framework.id);
        } else {
          missingTemplates.push(framework.id);
        }
      }
    }

    // Check env vars
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      PORT: process.env.PORT || '5002 (default)',
      AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'not set',
      BYPASS_AUTH: process.env.BYPASS_AUTH || 'false'
    };
    
    // Check database URL - don't include the actual URL for security
    const dbUrlSet = !!process.env.DATABASE_URL;
    
    // Get service uptime
    const uptime = process.uptime();
    
    // Return diagnostic information
    return res.status(200).json({
      success: true,
      message: 'Diagnostic information retrieved successfully',
      data: {
        service: {
          name: 'questionnaire-service',
          uptime: `${Math.floor(uptime / 60)} minutes, ${Math.floor(uptime % 60)} seconds`,
          env: process.env.NODE_ENV || 'development'
        },
        database: {
          connection: dbConnectionOk,
          message: dbConnectionOk ? 'Connected' : dbErrorMessage,
          url_configured: dbUrlSet,
          templateCount,
          questionCount
        },
        frameworks: {
          registeredCount: frameworks.length,
          frameworkIds: frameworks.map(f => f.id),
          templates: {
            available: frameworksWithTemplates,
            missing: missingTemplates
          },
          missingTemplates
        },
        environment: envVars
      }
    });
  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DIAGNOSTIC_ERROR',
        message: 'Error retrieving diagnostic information',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /diagnostic/provision-default-template
 * @desc Provision a default template in the database for testing
 * @access Restricted (Admin override header required)
 */
router.post('/provision-default-template', async (req, res) => {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_DISABLED',
        message: 'Diagnostic endpoints are disabled in production'
      }
    });
  }

  // Check for admin override header
  if (!req.headers['x-admin-override']) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'Admin override header required for this endpoint'
      }
    });
  }

  try {
    // Get framework info from registry
    const frameworks = frameworkRegistry.getAllFrameworks();
    
    if (frameworks.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_FRAMEWORKS',
          message: 'No frameworks found in registry'
        }
      });
    }
    
    // Use the first framework
    const framework = frameworks[0];
    
    // Check if template already exists
    const existingTemplate = await prisma.template.findFirst({
      where: {
        name: framework.displayName
      }
    });
    
    if (existingTemplate) {
      return res.status(200).json({
        success: true,
        message: 'Template already exists',
        data: {
          id: existingTemplate.id,
          name: existingTemplate.name
        }
      });
    }
    
    // Load the template JSON file
    const templateFilePath = path.join(__dirname, '../data/frameworks', framework.templateFile);
    
    if (!fs.existsSync(templateFilePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_FILE_NOT_FOUND',
          message: `Template file not found: ${framework.templateFile}`
        }
      });
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
    
    // Process each section and create questions
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
      }
    }
    
    return res.status(201).json({
      success: true,
      message: 'Template provisioned successfully',
      data: {
        id: template.id,
        name: template.name,
        questionCount: globalQuestionOrder - 1
      }
    });
  } catch (error) {
    console.error('Error provisioning template:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PROVISION_ERROR',
        message: 'Error provisioning template',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /diagnostic/reseed
 * @desc Run the seed script to populate database with templates
 * @access Restricted (Admin override header required)
 */
router.post('/reseed', async (req, res) => {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_DISABLED',
        message: 'Diagnostic endpoints are disabled in production'
      }
    });
  }

  // Check for admin override header
  if (!req.headers['x-admin-override']) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'Admin override header required for this endpoint'
      }
    });
  }

  try {
    // Require the seed module
    const seed = require('../../prisma/seed');
    
    // Call the main function
    await seed.main();
    
    // Check if templates were created
    const templateCount = await prisma.template.count();
    
    return res.status(200).json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        templateCount
      }
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SEED_ERROR',
        message: 'Error seeding database',
        details: error.message
      }
    });
  }
});

module.exports = router;
