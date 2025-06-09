const fs = require('fs');
const path = require('path');

// Path to the submission controller file
const filePath = path.join('risk-assessment-app', 'backend', 'questionnaire-service', 'src', 'controllers', 'submission.controller.js');

try {
  console.log(`Reading file: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the getSubmissionById function and extract its content
  const functionRegex = /const getSubmissionById = async \(req, res\) => \{[\s\S]+?\};/;
  const match = content.match(functionRegex);
  
  if (!match) {
    console.error('Could not locate getSubmissionById function in the file');
    process.exit(1);
  }
  
  // Replace the function with the fixed version
  const fixedFunction = `const getSubmissionById = async (req, res) => {
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

    res.status(200).json({
      success: true,
      data: submission,
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

  // Replace the function in the content
  const updatedContent = content.replace(functionRegex, fixedFunction);

  // Write the updated content back to the file
  console.log(`Writing fixed function to ${filePath}`);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  
  console.log('Successfully fixed submission controller Prisma error');
} catch (err) {
  console.error('Error fixing submission controller:', err);
  process.exit(1);
}
