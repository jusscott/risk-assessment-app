const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middlewares/auth.middleware');
const submissionController = require('../controllers/submission.controller');

// GET /api/submissions/in-progress - Get user's in-progress submissions
router.get('/in-progress', authMiddleware, submissionController.getInProgressSubmissions);

// GET /api/submissions/completed - Get user's completed submissions
router.get('/completed', authMiddleware, submissionController.getCompletedSubmissions);

// GET /api/submissions/:id - Get a specific submission
router.get('/:id', authMiddleware, submissionController.getSubmissionById);

// POST /api/submissions - Start a new submission
router.post('/', authMiddleware, submissionController.startSubmission);

// PUT /api/submissions/:id - Update a submission with answers
router.put('/:id', authMiddleware, submissionController.updateSubmission);

// POST /api/submissions/:id/submit - Submit a completed questionnaire
router.post('/:id/submit', authMiddleware, submissionController.submitQuestionnaire);

module.exports = router;
