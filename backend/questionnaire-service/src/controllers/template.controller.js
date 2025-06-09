const { PrismaClient } = require('@prisma/client');
const NodeCache = require('node-cache');
const redisClient = require('../utils/redis.client');
const config = require('../config/config');

// Create a Prisma client with query logging in dev mode
const prisma = new PrismaClient(
  process.env.NODE_ENV === 'development' ? {
    log: ['query', 'info', 'warn', 'error'],
  } : {}
);

/**
 * Initialize template cache
 * TTL: 30 minutes for templates, check period: 60 seconds
 */
const templateCache = new NodeCache({ 
  stdTTL: 1800, 
  checkperiod: 60,
  useClones: false // Better performance by avoiding deep cloning
});

/**
 * @desc Get all available questionnaire templates
 * @route GET /api/templates
 */
const getTemplates = async (req, res) => {
  console.log('getTemplates controller called');
  
  try {
    // Try to get templates from cache first
    const cacheKey = 'all_templates';
    const cachedTemplates = templateCache.get(cacheKey);
    
    if (cachedTemplates) {
      console.log('Returning templates from cache');
      return res.status(200).json({
        success: true,
        data: cachedTemplates,
        message: 'Templates retrieved successfully',
        count: cachedTemplates.length,
        source: 'cache'
      });
    }

    // First check if database is connected properly
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error in getTemplates:', dbError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to connect to the database',
          details: dbError.message
        }
      });
    }
    
    console.log('Fetching templates from database...');
    
    // Optimize database query by only selecting necessary fields
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        createdAt: true,
        _count: {
          select: {
            Question: true
          }
        }
      }
    });
    
    console.log(`Found ${templates.length} templates`);

    // If no templates are found, try to seed the database
    if (templates.length === 0) {
      console.log('No templates found, checking if we need to run seed script...');
      
      // Get frameworks from registry to check if there are any to load
      const frameworkRegistry = require('../data/frameworks/index');
      const frameworks = frameworkRegistry.getAllFrameworks();
      
      if (frameworks && frameworks.length > 0) {
        console.log(`Found ${frameworks.length} frameworks in registry, but no templates in database.`);
        console.log('Consider running the seed script to populate the database.');
        
        // Return useful error message
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_TEMPLATES',
            message: 'No templates found in the database. Database may need to be seeded.',
            frameworks: frameworks.map(f => f.displayName)
          }
        });
      }
    }

    // Transform the data to match frontend expectations
    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description || '',
      category: template.category,
      questions: template._count.Question,
      estimatedTime: getEstimatedTime(template._count.Question)
    }));
    
    console.log('Templates formatted successfully');

    // Cache the formatted templates
    templateCache.set(cacheKey, formattedTemplates);
    
    // Ensure we're returning an array with the expected properties
    const response = {
      success: true,
      data: formattedTemplates,
      message: 'Templates retrieved successfully',
      count: formattedTemplates.length
    };
    
    console.log(`Returning ${formattedTemplates.length} templates to client`);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error retrieving templates:', error);
    console.error('Stack trace:', error.stack);
    
    // Check for specific Prisma errors
    if (error.code === 'P1001') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_CONNECTION_ERROR',
          message: 'Cannot reach database server',
          details: error.message
        }
      });
    } else if (error.code === 'P1003') {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_TIMEOUT',
          message: 'Database operation timeout',
          details: error.message
        }
      });
    } else if (error.code === 'P2021') {
      return res.status(500).json({
        success: false,
        error: {
          code: 'TABLE_NOT_FOUND',
          message: 'The required database table does not exist',
          details: error.message
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving templates',
        details: error.message
      }
    });
  }
};

/**
 * @desc Get a specific template by ID
 * @route GET /api/templates/:id
 */
const getTemplateById = async (req, res) => {
  const { id } = req.params;
  const { page = '1', pageSize = '50', loadQuestions = 'true' } = req.query;
  const parsedPage = parseInt(page);
  const parsedPageSize = parseInt(pageSize);
  const shouldLoadQuestions = loadQuestions === 'true';

  try {
    console.log(`Getting template ${id} with pagination: page=${parsedPage}, pageSize=${parsedPageSize}, loadQuestions=${shouldLoadQuestions}`);
    
    // Generate unique cache key for this request
    const cacheKey = `template_${id}_p${parsedPage}_s${parsedPageSize}_q${shouldLoadQuestions}`;
    
    // Try to get from cache first
    const cachedTemplate = templateCache.get(cacheKey);
    if (cachedTemplate) {
      console.log(`Retrieved template ${id} from cache`);
      return res.status(200).json({
        success: true,
        data: cachedTemplate,
        message: 'Template retrieved successfully',
        source: 'cache'
      });
    }
    
    // First get the template without questions to verify it exists
    // Use Prisma transaction to batch database calls for better performance
    const [templateBasic, totalQuestions] = await prisma.$transaction([
      prisma.template.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prisma.question.count({
        where: { templateId: parseInt(id) }
      })
    ]);

    if (!templateBasic) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }

    // Create the response object with template metadata
    const response = {
      ...templateBasic,
      totalQuestions,
      questions: [],
      pagination: {
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages: Math.ceil(totalQuestions / parsedPageSize)
      }
    };

    // If questions are requested, load them with pagination
    if (shouldLoadQuestions) {
      const skip = (parsedPage - 1) * parsedPageSize;
      
      console.log(`Loading questions with skip=${skip}, take=${parsedPageSize}`);
      
      // Use a query with only necessary fields and efficient ordering
      const questions = await prisma.question.findMany({
        where: { templateId: parseInt(id) },
        select: {
          id: true,
          text: true,
          type: true,
          options: true,
          required: true,
          order: true
        },
        orderBy: { order: 'asc' },
        skip,
        take: parsedPageSize
      });
      
      response.questions = questions;
      console.log(`Loaded ${questions.length} questions for template ${id}`);
    }

    // Cache the template data
    templateCache.set(cacheKey, response, 1800); // Cache for 30 minutes

    res.status(200).json({
      success: true,
      data: response,
      message: 'Template retrieved successfully'
    });
  } catch (error) {
    console.error('Error retrieving template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the template',
        details: error.message
      }
    });
  }
};

/**
 * @desc Create a new template
 * @route POST /api/templates
 * @access Admin only
 */
const createTemplate = async (req, res) => {
  const { name, description, category, questions } = req.body;

  try {
    // Create the template
    const template = await prisma.template.create({
      data: {
        name,
        description,
        category,
        questions: {
          create: questions.map((question, index) => ({
            text: question.text,
            type: question.type,
            options: question.options || [],
            required: question.required || false,
            order: index + 1
          }))
        }
      },
      include: { Question: true }
    });

    // Clear the all templates cache when a new template is created
    templateCache.del('all_templates');

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating the template'
      }
    });
  }
};

/**
 * @desc Update a template
 * @route PUT /api/templates/:id
 * @access Admin only
 */
const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, description, category } = req.body;

  try {
    // Check if template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }

    // Update the template
    const updatedTemplate = await prisma.template.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        category
      }
    });

    // Invalidate caches for this template and the all templates list
    templateCache.del('all_templates');
    // Remove all cache entries for this template using template ID prefix
    const keysToDelete = templateCache.keys().filter(key => key.startsWith(`template_${id}`));
    keysToDelete.forEach(key => templateCache.del(key));

    res.status(200).json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating the template'
      }
    });
  }
};

/**
 * @desc Delete a template
 * @route DELETE /api/templates/:id
 * @access Admin only
 */
const deleteTemplate = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }

    // Use Prisma transaction for atomicity
    await prisma.$transaction([
      // Delete all questions related to this template
      prisma.question.deleteMany({
        where: { templateId: parseInt(id) }
      }),
      // Delete the template
      prisma.template.delete({
        where: { id: parseInt(id) }
      })
    ]);

    // Invalidate caches for this template and the all templates list
    templateCache.del('all_templates');
    // Remove all cache entries for this template using template ID prefix
    const keysToDelete = templateCache.keys().filter(key => key.startsWith(`template_${id}`));
    keysToDelete.forEach(key => templateCache.del(key));

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while deleting the template'
      }
    });
  }
};

/**
 * Helper function to estimate completion time based on number of questions
 * @param {number} questionCount - The number of questions in the template
 * @returns {string} - Estimated time to complete
 */
const getEstimatedTime = (questionCount) => {
  if (questionCount < 50) return '30-45 minutes';
  if (questionCount < 100) return '1-1.5 hours';
  if (questionCount < 150) return '1.5-2 hours';
  if (questionCount < 200) return '2-3 hours';
  return '3+ hours';
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
