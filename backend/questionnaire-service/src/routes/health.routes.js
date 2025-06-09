/**
 * Health check routes for questionnaire service
 */
const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        data: {
            service: 'questionnaire-service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }
    });
});

module.exports = router;
