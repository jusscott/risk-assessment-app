/**
 * Controller for custom rules functionality
 */

const rulesService = require('../services/rules.service');

/**
 * Get all rules for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRules = async (req, res) => {
  try {
    const userId = req.user.id;
    const rules = await rulesService.getRulesByUser(userId);
    
    return res.status(200).json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error(`Error retrieving rules: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving rules'
      }
    });
  }
};

/**
 * Get a specific rule by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRuleById = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const rule = await rulesService.getRuleById(ruleId);
    
    // Check if rule belongs to the requesting user
    if (rule.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to access this rule'
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error(`Error retrieving rule: ${error.message}`);
    
    if (error.message === 'Rule not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested rule was not found'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the rule'
      }
    });
  }
};

/**
 * Create a new rule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createRule = async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      userId: req.user.id
    };
    
    const rule = await rulesService.createRule(ruleData);
    
    return res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error(`Error creating rule: ${error.message}`);
    
    // Handle validation errors
    if (error.message.startsWith('Rule criteria')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CRITERIA',
          message: error.message
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating the rule'
      }
    });
  }
};

/**
 * Update an existing rule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const ruleData = {
      ...req.body,
      userId: req.user.id
    };
    
    const rule = await rulesService.updateRule(ruleId, ruleData);
    
    return res.status(200).json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error(`Error updating rule: ${error.message}`);
    
    if (error.message === 'Rule not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested rule was not found'
        }
      });
    }
    
    if (error.message.startsWith('Unauthorized:')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to update this rule'
        }
      });
    }
    
    if (error.message.startsWith('Rule criteria')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CRITERIA',
          message: error.message
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating the rule'
      }
    });
  }
};

/**
 * Delete a rule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const userId = req.user.id;
    
    await rulesService.deleteRule(ruleId, userId);
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Rule deleted successfully'
      }
    });
  } catch (error) {
    console.error(`Error deleting rule: ${error.message}`);
    
    if (error.message === 'Rule not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested rule was not found'
        }
      });
    }
    
    if (error.message.startsWith('Unauthorized:')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to delete this rule'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while deleting the rule'
      }
    });
  }
};

/**
 * Evaluate rules for an analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const evaluateRules = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const userId = req.user.id;
    
    const results = await rulesService.evaluateRulesForAnalysis(analysisId, userId);
    
    return res.status(200).json({
      success: true,
      data: {
        analysisId: parseInt(analysisId),
        results
      }
    });
  } catch (error) {
    console.error(`Error evaluating rules: ${error.message}`);
    
    if (error.message === 'Analysis not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested analysis was not found'
        }
      });
    }
    
    if (error.message.startsWith('Unauthorized:')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to access this analysis'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while evaluating rules'
      }
    });
  }
};

/**
 * Get rule results for an analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRuleResults = async (req, res) => {
  try {
    const { analysisId } = req.params;
    
    // TODO: Add authorization check to ensure the user can access this analysis
    
    const results = await rulesService.getRuleResultsForAnalysis(analysisId);
    
    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error(`Error retrieving rule results: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving rule results'
      }
    });
  }
};

module.exports = {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  evaluateRules,
  getRuleResults
};
