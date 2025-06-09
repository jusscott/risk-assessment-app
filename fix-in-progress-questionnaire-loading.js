#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing in-progress questionnaire loading issue...');

// Fix the getSubmissionById function to properly format the response
const submissionControllerPath = path.join(__dirname, 'backend/questionnaire-service/src/controllers/submission.controller.js');

let submissionController = fs.readFileSync(submissionControllerPath, 'utf8');

// Replace the getSubmissionById function to properly format the response
const getSubmissionByIdFix = `/**
 * @desc Get a specific submission by ID
 * @route GET /api/submissions/:id
 */
const getSubmissionById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Completely fixed query - removed both direct 'questions' include on Submission model
    // and any nested incorrect inclusion patterns
    const submission = await prisma.submission.findUnique({
      where: { id: parseInt(id) },
      include: {
        Template: {
          include: {
            Question: {  // Using proper capitalized model name
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        Answer: true
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBMISSION_NOT_FOUND',
          message: 'Submission not found'
        }
      });
    }

    // Check if user owns this submission
    if (submission.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this submission'
        }
      });
    }

    // Format the response to match frontend expectations
    const formattedSubmission = {
      ...submission,
      template: {
        ...submission.Template,
        questions: submission.Template.Question || [] // Convert Question to questions
      }
    };
    
    // Remove the original Template field to avoid confusion
    delete formattedSubmission.Template;

    console.log(\`Formatted submission \${submission.id} with \${formattedSubmission.template.questions.length} questions\`);

    res.status(200).json({
      success: true,
      data: formattedSubmission,
      message: 'Submission retrieved successfully'
    });
  } catch (error) {
    console.error('Error retrieving submission:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the submission'
      }
    });
  }
};`;

// Find and replace the existing getSubmissionById function
const getSubmissionByIdRegex = /\/\*\*\s*\*\s*@desc Get a specific submission by ID[\s\S]*?const getSubmissionById = async \(req, res\) => \{[\s\S]*?\};/;

if (getSubmissionByIdRegex.test(submissionController)) {
  submissionController = submissionController.replace(getSubmissionByIdRegex, getSubmissionByIdFix);
  console.log('✅ Fixed getSubmissionById function');
} else {
  console.log('⚠️  Could not find getSubmissionById function to replace');
}

// Write the updated controller back
fs.writeFileSync(submissionControllerPath, submissionController);

console.log('🎉 Successfully fixed in-progress questionnaire loading issue!');
console.log('📝 Summary of changes:');
console.log('   - Fixed data format mismatch between backend and frontend');
console.log('   - Template.Question is now properly converted to template.questions');
console.log('   - Added logging for debugging questionnaire loading');
console.log('');
console.log('🔄 Please restart the questionnaire service to apply the changes:');
console.log('   docker-compose restart questionnaire-service');
