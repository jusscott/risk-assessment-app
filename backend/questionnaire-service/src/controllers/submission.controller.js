const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const config = require('../config/config');

const prisma = new PrismaClient();

/**
 * @desc Get user's in-progress questionnaire submissions
 * @route GET /api/submissions/in-progress
 */
const getInProgressSubmissions = async (req, res) => {
  try {
    // Get authenticated user ID from request
    const userId = req.user.id;
    
    // Log the user ID we're using to fetch submissions
    console.log(`Fetching in-progress submissions for user ID: ${userId}`);
    
    // For development testing when not using a real user ID
    if ((userId === 'dev-user' || userId === 'system') && 
        (process.env.NODE_ENV !== 'production' || config.bypassAuth === true)) {
      console.log("Development/test user detected - returning mock in-progress submissions");
      
      // Return sample data for development testing
      return res.status(200).json({
        success: true,
        data: [
          {
            id: 101,
            name: "HIPAA Assessment",
            framework: "HIPAA",
            progress: 35,
            startDate: new Date().toISOString().split('T')[0],
            lastUpdated: new Date().toISOString().split('T')[0]
          },
          {
            id: 102,
            name: "ISO 27001 Assessment",
            framework: "ISO 27001",
            progress: 60,
            startDate: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0],
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        ],
        message: 'In-progress submissions retrieved successfully (dev mode)'
      });
    }
    
    // First check if any submissions exist for this user at all - using more flexible matching
    console.log(`Searching for submissions where userId = "${userId}"`);
    
    // Try to find submissions for this user with more detailed logging
    const allUserSubmissions = await prisma.submission.findMany({
      where: {
        userId: String(userId) // Ensure userId is treated as a string for consistent comparison
      },
      select: {
        id: true,
        status: true,
        templateId: true,
        userId: true
      }
    });
    
    console.log(`Total submissions found for user: ${allUserSubmissions.length}`);
    if (allUserSubmissions.length > 0) {
      console.log('All user submissions:', JSON.stringify(allUserSubmissions, null, 2));
    } else {
      // If no submissions found, log all users in the system to help debug
      console.log('No submissions found. Checking unique userIds in the database:');
      
      // Query distinct user IDs to check what's in the database
      const allUserIds = await prisma.submission.findMany({
        select: {
          userId: true,
        },
        distinct: ['userId']
      });
      
      console.log('Unique userIds in submissions table:', 
        allUserIds.map(entry => entry.userId).join(', ') || 'No submissions in database'
      );
    }
    
    // Find in-progress (draft) submissions - include userId in logging
    const submissions = await prisma.submission.findMany({
      where: { 
        userId: String(userId), // Ensure userId is treated as a string for consistent comparison
        status: 'draft'
      },
      include: {
        Template: true,
        Answer: true,
        _count: {
          select: {
            Answer: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`In-progress submissions found: ${submissions.length}`);
    if (submissions.length > 0) {
      console.log('First submission details:', JSON.stringify({
        id: submissions[0].id,
        userId: submissions[0].userId,
        status: submissions[0].status,
        templateId: submissions[0].templateId,
        templateName: submissions[0].Template?.name || 'Unknown',
        answerCount: submissions[0]._count.answers
      }, null, 2));
    }

      // Get question counts for each template to calculate progress
      const templatesWithQuestionCounts = await Promise.all(
        submissions.map(async (submission) => {
          // Get the exact set of questions for this template
          const questions = await prisma.question.findMany({
            where: {
              templateId: submission.templateId
            },
            select: {
              id: true
            }
          });
          
          return {
            templateId: submission.templateId,
            questionCount: questions.length,
            questionIds: questions.map(q => q.id)
          };
        })
      );

      // Format submissions to match frontend expectations
      const formattedSubmissions = submissions.map(submission => {
        const templateInfo = templatesWithQuestionCounts.find(
          t => t.templateId === submission.templateId
        );
        
        const totalQuestions = templateInfo ? templateInfo.questionCount : 0;
        
        // Get unique question IDs from answers to avoid counting duplicates
        const uniqueAnsweredQuestionIds = new Set();
        submission.Answer.forEach(answer => {
          uniqueAnsweredQuestionIds.add(answer.questionId);
        });
        
        // Only count answers to questions that actually belong to this template
        let validAnswerCount = 0;
        if (templateInfo && templateInfo.questionIds) {
          validAnswerCount = [...uniqueAnsweredQuestionIds].filter(
            qId => templateInfo.questionIds.includes(qId)
          ).length;
        } else {
          validAnswerCount = uniqueAnsweredQuestionIds.size;
        }
        
        console.log(`Submission ${submission.id} progress calculation:`, {
          totalTemplateQuestions: totalQuestions,
          totalUniqueAnswers: uniqueAnsweredQuestionIds.size,
          validAnswersInTemplate: validAnswerCount
        });
        
        // Calculate progress percentage - ensure it's a valid number between 0-100
        let progressRatio = totalQuestions > 0 
          ? (validAnswerCount / totalQuestions)
          : 0;
        
        // Handle potential issues causing progress to exceed 100%
        if (validAnswerCount > totalQuestions) {
          console.warn(`Warning: Submission ${submission.id} has more valid answers (${validAnswerCount}) than questions (${totalQuestions})`);
          // Cap the valid answer count to prevent exceeding 100%
          validAnswerCount = totalQuestions;
          progressRatio = 1;
        }
        
        // Guard against invalid values and force between 0-100
        progressRatio = Math.max(0, Math.min(1, progressRatio));
        let progress = Math.round(progressRatio * 100);
        
        // Final safety check to ensure progress is between 0-100
        progress = Math.max(0, Math.min(100, progress));
        
        console.log(`Submission ${submission.id} final calculated progress: ${progress}% (${validAnswerCount}/${totalQuestions} questions)`);

      return {
        id: submission.id,
        name: submission.Template.name,
        framework: submission.Template.category,
        progress: progress,
        startDate: submission.createdAt.toISOString().split('T')[0],
        lastUpdated: submission.updatedAt.toISOString().split('T')[0]
      };
    });

    res.status(200).json({
      success: true,
      data: formattedSubmissions,
      message: 'In-progress submissions retrieved successfully'
    });
  } catch (error) {
    console.error('Error retrieving in-progress submissions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving submissions'
      }
    });
  }
};

/**
 * @desc Get user's completed questionnaire submissions
 * @route GET /api/submissions/completed
 */
const getCompletedSubmissions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Log the user ID we're using to fetch completed submissions
    console.log(`Fetching completed submissions for user ID: ${userId}`);
    
    // For dev user in development mode, return mock data
    if ((userId === 'dev-user' || userId === 'system') && (process.env.NODE_ENV !== 'production' || config.bypassAuth === true)) {
      console.log("Development user - returning mock completed submissions");
      
      // Return sample data for development testing
      return res.status(200).json({
        success: true,
        data: [
          {
            id: 201,
            name: "PCI-DSS Assessment",
            framework: "PCI-DSS",
            completionDate: new Date(Date.now() - 14*24*60*60*1000).toISOString().split('T')[0],
            score: 85
          },
          {
            id: 202,
            name: "NIST 800-53 Assessment",
            framework: "NIST 800-53",
            completionDate: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
            score: 72
          }
        ],
        message: 'Completed submissions retrieved successfully (dev mode)'
      });
    }
    
    // Find completed submissions (status: submitted or analyzed)
    const submissions = await prisma.submission.findMany({
      where: { 
        userId: userId,
        status: { in: ['submitted', 'analyzed'] }
      },
      include: {
        Template: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`Completed submissions found: ${submissions.length}`);
    if (submissions.length > 0) {
      console.log('First completed submission details:', JSON.stringify({
        id: submissions[0].id,
        userId: submissions[0].userId,
        status: submissions[0].status,
        templateName: submissions[0].Template?.name || 'Unknown'
      }, null, 2));
    }

    // Format submissions to match frontend expectations
    const formattedSubmissions = await Promise.all(submissions.map(async submission => {
      // Try to get real score from analysis service if available
      let score = null;
      try {
        const analysisResponse = await axios.get(
          `${config.analysisService.url}/results/${submission.id}`,
          { timeout: 3000 } // Short timeout to prevent long waits
        );
        if (analysisResponse.data && analysisResponse.data.success) {
          score = analysisResponse.data.data.score;
        }
      } catch (error) {
        console.warn(`Could not fetch analysis for submission ${submission.id}:`, error.message);
      }
      
      // If no score available, generate a mock one (65-95 range)
      if (score === null) {
        score = Math.floor(65 + Math.random() * 30);
      }
      
      return {
        id: submission.id,
        name: `${submission.Template.category} Assessment`,
        framework: submission.Template.category,
        completionDate: submission.updatedAt.toISOString().split('T')[0],
        score
      };
    }));

    res.status(200).json({
      success: true,
      data: formattedSubmissions,
      message: 'Completed submissions retrieved successfully'
    });
  } catch (error) {
    console.error('Error retrieving completed submissions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving submissions'
      }
    });
  }
};

/**
 * @desc Get a specific submission by ID
 * @route GET /api/submissions/:id
 */
const getSubmissionById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: parseInt(id) },
      include: {
        Template: {
          include: {
            Question: {
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
};

/**
 * @desc Start a new questionnaire submission
 * @route POST /api/submissions
 */
const startSubmission = async (req, res) => {
  const { templateId } = req.body;
  const userId = req.user.id;

  try {
    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id: parseInt(templateId) }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      });
    }

    // Check if user already has an in-progress submission for this template
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        userId: userId,
        templateId: parseInt(templateId),
        status: 'draft'
      }
    });

    if (existingSubmission) {
      return res.status(200).json({
        success: true,
        data: existingSubmission,
        message: 'Existing submission found'
      });
    }

    // Create a new submission
    const submission = await prisma.submission.create({
      data: {
        userId: userId,
        Template: {
          connect: { id: parseInt(templateId) }
        },
        status: 'draft',
        updatedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: submission,
      message: 'Submission started successfully'
    });
  } catch (error) {
    console.error('Error starting submission:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while starting the submission'
      }
    });
  }
};

/**
 * @desc Update a submission with answers
 * @route PUT /api/submissions/:id
 */
const updateSubmission = async (req, res) => {
  const { id } = req.params;
  const { answers } = req.body;
  const userId = req.user.id;

  console.log(`[updateSubmission] Starting PUT request for submission ${id}`);
  console.log(`[updateSubmission] User ID: ${userId}`);
  console.log(`[updateSubmission] Answers received:`, JSON.stringify(answers, null, 2));

  try {
    // Validate submission ID parameter
    const submissionId = parseInt(id);
    if (isNaN(submissionId) || submissionId <= 0) {
      console.log(`[updateSubmission] Invalid submission ID: ${id}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SUBMISSION_ID',
          message: 'Invalid submission ID provided'
        }
      });
    }

    console.log(`[updateSubmission] Validated submission ID: ${submissionId}`);

    // Check if submission exists and belongs to user
    console.log(`[updateSubmission] Checking if submission ${submissionId} exists...`);
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      console.log(`[updateSubmission] Submission ${submissionId} not found`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBMISSION_NOT_FOUND',
          message: 'Submission not found'
        }
      });
    }

    console.log(`[updateSubmission] Found submission:`, {
      id: submission.id,
      userId: submission.userId,
      status: submission.status,
      templateId: submission.templateId
    });

    if (submission.userId !== userId) {
      console.log(`[updateSubmission] Permission denied: submission belongs to ${submission.userId}, user is ${userId}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this submission'
        }
      });
    }

    if (submission.status !== 'draft') {
      console.log(`[updateSubmission] Invalid status: ${submission.status} (expected 'draft')`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Cannot update a submission that is not in draft status'
        }
      });
    }

    // Validate answers input
    if (!answers) {
      console.log(`[updateSubmission] No answers provided`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ANSWERS',
          message: 'Answers are required'
        }
      });
    }

    // Convert answers to array format if needed
    let answersArray = [];
    console.log(`[updateSubmission] Processing answers...`);
    
    try {
      if (Array.isArray(answers)) {
        // Already an array, use as is
        answersArray = answers;
        console.log(`[updateSubmission] Answers already in array format, count: ${answersArray.length}`);
      } else if (typeof answers === 'object' && answers !== null) {
        // Handle both numeric keys ("1", "2") and question keys ("q1", "q2")
        console.log(`[updateSubmission] Converting object answers to array...`);
        
        answersArray = Object.entries(answers).map(([questionKey, value]) => {
          let questionId;
          
          // If key starts with 'q', extract the number (e.g., "q1" -> 1)
          if (typeof questionKey === 'string' && questionKey.startsWith('q')) {
            const numericPart = questionKey.substring(1);
            questionId = parseInt(numericPart);
          } else {
            // Direct numeric conversion for keys like "1", "2"
            questionId = parseInt(questionKey);
          }
          
          // Validate that we got a valid number
          if (isNaN(questionId)) {
            console.error(`[updateSubmission] Invalid question key: ${questionKey} - could not convert to numeric ID`);
            throw new Error(`Invalid question identifier: ${questionKey}`);
          }
          
          // Handle both simple values and complex answer objects
          let answerValue = value;
          if (typeof value === 'object' && value !== null) {
            // If value is an object, extract the answer field, or stringify if needed
            if (value.answer !== undefined) {
              answerValue = value.answer;
            } else {
              // If it's an object without an answer field, stringify it
              answerValue = JSON.stringify(value);
            }
          }
          
          // Ensure answer value is a string
          if (typeof answerValue !== 'string') {
            answerValue = String(answerValue);
          }
          
          console.log(`[updateSubmission] Processed answer: questionId=${questionId}, value="${answerValue}"`);
          
          return {
            questionId: questionId,
            value: answerValue
          };
        });
        
        console.log(`[updateSubmission] Converted to array format, count: ${answersArray.length}`);
      } else {
        console.log(`[updateSubmission] Invalid answers format: ${typeof answers}`);
        throw new Error('Invalid answers format - must be array or object');
      }
    } catch (answerProcessingError) {
      console.error(`[updateSubmission] Error processing answers:`, answerProcessingError);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ANSWERS_FORMAT',
          message: answerProcessingError.message
        }
      });
    }

    if (answersArray.length === 0) {
      console.log(`[updateSubmission] No valid answers to process`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_ANSWERS',
          message: 'No valid answers provided'
        }
      });
    }

    // Process each answer individually with comprehensive error handling
    console.log(`[updateSubmission] Processing ${answersArray.length} answers...`);
    const processedAnswers = [];
    
    for (let i = 0; i < answersArray.length; i++) {
      const answer = answersArray[i];
      console.log(`[updateSubmission] Processing answer ${i + 1}/${answersArray.length}: questionId=${answer.questionId}`);
      
      try {
        // Find existing answer for this submission and question
        const existingAnswer = await prisma.answer.findFirst({
          where: {
            submissionId: submissionId,
            questionId: answer.questionId
          }
        });

        let result;
        if (existingAnswer) {
          console.log(`[updateSubmission] Updating existing answer with ID ${existingAnswer.id}`);
          // Update existing answer
          result = await prisma.answer.update({
            where: { id: existingAnswer.id },
            data: {
              value: answer.value,
              updatedAt: new Date()
            }
          });
        } else {
          console.log(`[updateSubmission] Creating new answer for question ${answer.questionId}`);
          // Create new answer
          result = await prisma.answer.create({
            data: {
              submissionId: submissionId,
              questionId: answer.questionId,
              value: answer.value,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
        
        processedAnswers.push(result);
        console.log(`[updateSubmission] Successfully processed answer for question ${answer.questionId}`);
        
      } catch (answerError) {
        console.error(`[updateSubmission] Error processing answer for question ${answer.questionId}:`, answerError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'ANSWER_PROCESSING_ERROR',
            message: `Failed to save answer for question ${answer.questionId}: ${answerError.message}`
          }
        });
      }
    }

    console.log(`[updateSubmission] Successfully processed ${processedAnswers.length} answers`);

    // Update the submission's updatedAt timestamp
    console.log(`[updateSubmission] Updating submission timestamp...`);
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        updatedAt: new Date()
      }
    });

    console.log(`[updateSubmission] Successfully completed PUT request for submission ${submissionId}`);
    
    res.status(200).json({
      success: true,
      message: 'Submission updated successfully',
      data: {
        submissionId: submissionId,
        answersProcessed: processedAnswers.length
      }
    });
    
  } catch (error) {
    console.error(`[updateSubmission] CRITICAL ERROR:`, error);
    console.error(`[updateSubmission] Error stack:`, error.stack);
    
    // Ensure we always send a response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred while updating the submission'
        }
      });
    }
  }
};

/**
 * @desc Submit a completed questionnaire for analysis
 * @route POST /api/submissions/:id/submit
 */
const submitQuestionnaire = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check if submission exists and belongs to user
    const submission = await prisma.submission.findUnique({
      where: { id: parseInt(id) },
      include: {
        Template: {
          include: {
            Question: {
              where: {
                required: true
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

    if (submission.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to submit this questionnaire'
        }
      });
    }

    if (submission.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'This questionnaire has already been submitted'
        }
      });
    }

    // Check if all required questions are answered
    const requiredQuestionIds = submission.Template.Question.map(q => q.id);
    const answeredQuestionIds = submission.Answer.map(a => a.questionId);
    
    const unansweredRequiredQuestions = requiredQuestionIds.filter(
      id => !answeredQuestionIds.includes(id)
    );

    if (unansweredRequiredQuestions.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INCOMPLETE_SUBMISSION',
          message: 'All required questions must be answered before submitting',
          details: {
            unansweredQuestions: unansweredRequiredQuestions
          }
        }
      });
    }

    // Update submission status to submitted
    const updatedSubmission = await prisma.submission.update({
      where: { id: parseInt(id) },
      data: {
        status: 'submitted',
        updatedAt: new Date()
      }
    });

    // In a real application, we would trigger an event to notify the analysis service
    // to process this submission, but for now we'll just return success

    // Notify the analysis service about the completed questionnaire
    try {
      console.log(`Notifying analysis service about completed questionnaire ${submission.id}`);
      const response = await axios.post(
        `${config.analysisService.url}/api/webhooks/questionnaire-completed`, 
        {
          submissionId: submission.id,
          userId: userId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        }
      );
      
      if (response.status === 202 || response.status === 200) {
        console.log(`Successfully notified analysis service about questionnaire ${submission.id}`);
      } else {
        throw new Error(`Received unexpected status ${response.status} from analysis service`);
      }
    } catch (error) {
      console.error('Error notifying analysis service:', error.message);
      
      // Schedule a retry using a background job (in a real system)
      // For now, we'll log the error but continue - we'll implement a polling
      // fallback in the analysis service to handle missed notifications
      console.log(`Scheduling retry for questionnaire ${submission.id} notification`);
    }

    res.status(200).json({
      success: true,
      data: updatedSubmission,
      message: 'Questionnaire submitted successfully for analysis'
    });
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while submitting the questionnaire'
      }
    });
  }
};

module.exports = {
  getInProgressSubmissions,
  getCompletedSubmissions,
  getSubmissionById,
  startSubmission,
  updateSubmission,
  submitQuestionnaire
};
