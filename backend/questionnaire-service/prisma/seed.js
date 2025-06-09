const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Import the framework registry
const frameworkRegistry = require('../src/data/frameworks/index');

/**
 * Load a template from a JSON file and insert it into the database
 * @param {string} frameworkId - The ID of the framework to load
 */
async function loadTemplate(frameworkId) {
  try {
    const framework = frameworkRegistry.getFrameworkById(frameworkId);
    
    if (!framework) {
      console.error(`Framework with ID ${frameworkId} not found in registry`);
      return;
    }
    
    // Check if template already exists in database
    const existingTemplate = await prisma.template.findFirst({
      where: {
        name: framework.displayName
      }
    });
    
    if (existingTemplate) {
      console.log(`Template for ${framework.displayName} already exists, skipping...`);
      return;
    }
    
    // Load the template JSON file
    const templateFilePath = path.join(__dirname, '../src/data/frameworks', framework.templateFile);
    const templateData = JSON.parse(fs.readFileSync(templateFilePath, 'utf8'));
    
    console.log(`Loading template for ${framework.displayName}...`);
    
    // Create the template record
    const template = await prisma.template.create({
      data: {
        name: framework.displayName,
        description: framework.description,
        category: framework.category,
        updatedAt: new Date()
      }
    });
    
    console.log(`Created template: ${template.name} (ID: ${template.id})`);
    
    // Process each section and create questions
    let globalQuestionOrder = 1; // Define this at the outer level
    
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
            templateId: template.id,
            updatedAt: new Date()
          }
        });
      }
    }
    
    console.log(`Successfully created ${globalQuestionOrder - 1} questions for ${framework.displayName}`);
  } catch (error) {
    console.error(`Error loading template for ${frameworkId}:`, error);
  }
}

async function main() {
  console.log('Starting to seed database with framework templates...');
  
  // Get all frameworks from the registry
  const frameworks = frameworkRegistry.getAllFrameworks();
  
  // Load each framework template
  for (const framework of frameworks) {
    await loadTemplate(framework.id);
  }
  
  console.log('Database seeding completed!');
}

// Only run the main function if this file is executed directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Error during seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

// Export the functions to be used by other modules
module.exports = {
  main,
  loadTemplate,
  prisma
};
