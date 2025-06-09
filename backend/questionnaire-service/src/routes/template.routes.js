const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middlewares/auth.middleware');
const optimizedAuth = require('../middlewares/optimized-auth.middleware');
const templateController = require('../controllers/template.controller');

// GET /api/templates - Get all templates (public access)
router.get('/', templateController.getTemplates);

// GET /api/templates/:id - Get a template by ID (requires authentication)
router.get('/:id', optimizedAuth.authenticate, templateController.getTemplateById);

// POST /api/templates - Create a new template (admin only)
router.post('/', optimizedAuth.authenticate, checkRole(['ADMIN']), templateController.createTemplate);

// PUT /api/templates/:id - Update a template (admin only)
router.put('/:id', optimizedAuth.authenticate, checkRole(['ADMIN']), templateController.updateTemplate);

// DELETE /api/templates/:id - Delete a template (admin only)
router.delete('/:id', optimizedAuth.authenticate, checkRole(['ADMIN']), templateController.deleteTemplate);

module.exports = router;
