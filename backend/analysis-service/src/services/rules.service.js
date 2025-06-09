/**
 * Service for managing custom analysis rules
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all custom rules for a user
 * @param {string} userId - ID of the user
 * @returns {Array} - List of rules
 */
const getRulesByUser = async (userId) => {
  try {
    const rules = await prisma.customRule.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return rules;
  } catch (error) {
    throw new Error(`Error retrieving custom rules: ${error.message}`);
  }
};

/**
 * Get a custom rule by ID
 * @param {number} ruleId - ID of the rule
 * @returns {Object} - Rule details
 */
const getRuleById = async (ruleId) => {
  try {
    const rule = await prisma.customRule.findUnique({
      where: {
        id: parseInt(ruleId)
      }
    });
    
    if (!rule) {
      throw new Error('Rule not found');
    }
    
    return rule;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new custom rule
 * @param {Object} ruleData - Rule data
 * @returns {Object} - Created rule
 */
const createRule = async (ruleData) => {
  try {
    // Validate rule criteria structure
    validateRuleCriteria(ruleData.criteria);
    
    const rule = await prisma.customRule.create({
      data: {
        userId: ruleData.userId,
        name: ruleData.name,
        description: ruleData.description || null,
        criteria: ruleData.criteria,
        severity: ruleData.severity,
        category: ruleData.category,
        active: ruleData.active !== undefined ? ruleData.active : true
      }
    });
    
    return rule;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing custom rule
 * @param {number} ruleId - ID of the rule to update
 * @param {Object} ruleData - Updated rule data
 * @returns {Object} - Updated rule
 */
const updateRule = async (ruleId, ruleData) => {
  try {
    // Check if rule exists and belongs to the user
    const existingRule = await prisma.customRule.findUnique({
      where: {
        id: parseInt(ruleId)
      }
    });
    
    if (!existingRule) {
      throw new Error('Rule not found');
    }
    
    if (existingRule.userId !== ruleData.userId) {
      throw new Error('Unauthorized: Rule belongs to a different user');
    }
    
    // Validate rule criteria if it's being updated
    if (ruleData.criteria) {
      validateRuleCriteria(ruleData.criteria);
    }
    
    // Update the rule
    const updatedRule = await prisma.customRule.update({
      where: {
        id: parseInt(ruleId)
      },
      data: {
        name: ruleData.name !== undefined ? ruleData.name : existingRule.name,
        description: ruleData.description !== undefined ? ruleData.description : existingRule.description,
        criteria: ruleData.criteria !== undefined ? ruleData.criteria : existingRule.criteria,
        severity: ruleData.severity !== undefined ? ruleData.severity : existingRule.severity,
        category: ruleData.category !== undefined ? ruleData.category : existingRule.category,
        active: ruleData.active !== undefined ? ruleData.active : existingRule.active
      }
    });
    
    return updatedRule;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a custom rule
 * @param {number} ruleId - ID of the rule to delete
 * @param {string} userId - ID of the requesting user
 * @returns {Object} - Deleted rule
 */
const deleteRule = async (ruleId, userId) => {
  try {
    // Check if rule exists and belongs to the user
    const existingRule = await prisma.customRule.findUnique({
      where: {
        id: parseInt(ruleId)
      }
    });
    
    if (!existingRule) {
      throw new Error('Rule not found');
    }
    
    if (existingRule.userId !== userId) {
      throw new Error('Unauthorized: Rule belongs to a different user');
    }
    
    // Delete the rule
    const deletedRule = await prisma.customRule.delete({
      where: {
        id: parseInt(ruleId)
      }
    });
    
    return deletedRule;
  } catch (error) {
    throw error;
  }
};

/**
 * Validate rule criteria structure
 * @param {Object} criteria - Rule criteria to validate
 */
const validateRuleCriteria = (criteria) => {
  // Basic structure validation
  if (!criteria || typeof criteria !== 'object') {
    throw new Error('Rule criteria must be a valid JSON object');
  }
  
  // Ensure the criteria has at least one condition
  if (!criteria.conditions || !Array.isArray(criteria.conditions) || criteria.conditions.length === 0) {
    throw new Error('Rule criteria must contain at least one condition');
  }
  
  // Ensure operator is valid if specified
  if (criteria.operator && !['AND', 'OR'].includes(criteria.operator)) {
    throw new Error('Rule criteria operator must be either AND or OR');
  }

  // Default to AND if not specified
  if (!criteria.operator) {
    criteria.operator = 'AND';
  }
  
  // Validate each condition
  criteria.conditions.forEach((condition, index) => {
    if (!condition.field || typeof condition.field !== 'string') {
      throw new Error(`Condition ${index + 1} must have a valid field name`);
    }
    
    if (!condition.operator || typeof condition.operator !== 'string') {
      throw new Error(`Condition ${index + 1} must have a valid operator`);
    }
    
    // Validate operator
    const validOperators = ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanEqual', 'lessThanEqual', 'contains', 'notContains'];
    if (!validOperators.includes(condition.operator)) {
      throw new Error(`Condition ${index + 1} has an invalid operator: ${condition.operator}`);
    }
    
    // For certain operators, value cannot be null
    if (['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanEqual', 'lessThanEqual', 'contains', 'notContains'].includes(condition.operator)) {
      if (condition.value === undefined || condition.value === null) {
        throw new Error(`Condition ${index + 1} requires a value for operator ${condition.operator}`);
      }
    }
  });
};

/**
 * Evaluate rules for an analysis
 * @param {number} analysisId - ID of the analysis
 * @param {string} userId - ID of the user
 * @returns {Array} - Rule evaluation results
 */
const evaluateRulesForAnalysis = async (analysisId, userId) => {
  try {
    // Get the analysis with all related data
    const analysis = await prisma.analysis.findUnique({
      where: {
        id: parseInt(analysisId)
      },
      include: {
        areaScores: true,
        recommendations: true,
        benchmarkComparisons: true
      }
    });
    
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    
    // Check if the analysis belongs to the user
    if (analysis.userId !== userId) {
      throw new Error('Unauthorized: Analysis belongs to a different user');
    }
    
    // Get all active rules for the user
    const rules = await prisma.customRule.findMany({
      where: {
        userId: userId,
        active: true
      }
    });
    
    // Delete any existing rule results for this analysis
    await prisma.ruleResult.deleteMany({
      where: {
        analysisId: parseInt(analysisId)
      }
    });
    
    // Evaluate each rule
    const results = [];
    for (const rule of rules) {
      const matched = evaluateRule(rule, analysis);
      
      // Create a rule result
      const ruleResult = await prisma.ruleResult.create({
        data: {
          analysisId: analysis.id,
          ruleId: rule.id,
          matched: matched
        }
      });
      
      results.push({
        ...ruleResult,
        ruleName: rule.name,
        ruleCategory: rule.category,
        ruleSeverity: rule.severity
      });
    }
    
    return results;
  } catch (error) {
    throw error;
  }
};

/**
 * Evaluate a single rule against analysis data
 * @param {Object} rule - The rule to evaluate
 * @param {Object} analysis - Analysis data
 * @returns {boolean} - Whether the rule conditions are matched
 */
const evaluateRule = (rule, analysis) => {
  const criteria = rule.criteria;
  const conditions = criteria.conditions || [];
  const operator = criteria.operator || 'AND';
  
  // If no conditions, the rule doesn't match
  if (conditions.length === 0) {
    return false;
  }
  
  // Evaluate each condition
  const results = conditions.map(condition => evaluateCondition(condition, analysis));
  
  // Apply the logical operator to the results
  if (operator === 'AND') {
    return results.every(result => result === true);
  } else if (operator === 'OR') {
    return results.some(result => result === true);
  }
  
  // Default case (shouldn't reach here if validation is working)
  return false;
};

/**
 * Evaluate a single condition against analysis data
 * @param {Object} condition - Condition to evaluate
 * @param {Object} analysis - Analysis data
 * @returns {boolean} - Whether the condition is matched
 */
const evaluateCondition = (condition, analysis) => {
  const { field, operator, value } = condition;
  let actualValue;
  
  // Extract the actual value based on the field path
  const fieldParts = field.split('.');
  const baseField = fieldParts[0];
  
  switch (baseField) {
    case 'riskScore':
      actualValue = analysis.riskScore;
      break;
      
    case 'securityLevel':
      actualValue = analysis.securityLevel;
      break;
      
    case 'areaScores':
      if (fieldParts.length >= 2) {
        const areaName = fieldParts[1];
        const areaScore = analysis.areaScores.find(score => score.area === areaName);
        if (areaScore) {
          actualValue = areaScore.score;
        }
      }
      break;
      
    case 'recommendations':
      if (fieldParts.length >= 2) {
        const category = fieldParts[1];
        const categoryRecommendations = analysis.recommendations.filter(rec => rec.category === category);
        actualValue = categoryRecommendations.length;
      } else {
        actualValue = analysis.recommendations.length;
      }
      break;
      
    case 'benchmarkComparisons':
      if (fieldParts.length >= 2) {
        const areaName = fieldParts[1];
        const comparison = analysis.benchmarkComparisons.find(comp => comp.area === areaName);
        if (comparison && fieldParts.length >= 3) {
          const subField = fieldParts[2];
          if (subField === 'percentile') {
            actualValue = comparison.percentile;
          } else if (subField === 'score') {
            actualValue = comparison.score;
          } else if (subField === 'benchmarkScore') {
            actualValue = comparison.benchmarkScore;
          }
        }
      }
      break;
  }
  
  // If we couldn't find a value, the condition doesn't match
  if (actualValue === undefined) {
    return false;
  }
  
  // Evaluate the condition based on the operator
  switch (operator) {
    case 'equals':
      return actualValue == value; // Using == to allow type coercion for convenience
      
    case 'notEquals':
      return actualValue != value;
      
    case 'greaterThan':
      return actualValue > value;
      
    case 'lessThan':
      return actualValue < value;
      
    case 'greaterThanEqual':
      return actualValue >= value;
      
    case 'lessThanEqual':
      return actualValue <= value;
      
    case 'contains':
      if (typeof actualValue === 'string') {
        return actualValue.includes(value);
      } else if (Array.isArray(actualValue)) {
        return actualValue.includes(value);
      }
      return false;
      
    case 'notContains':
      if (typeof actualValue === 'string') {
        return !actualValue.includes(value);
      } else if (Array.isArray(actualValue)) {
        return !actualValue.includes(value);
      }
      return true;
      
    default:
      return false;
  }
};

/**
 * Get rule evaluation results for an analysis
 * @param {number} analysisId - ID of the analysis
 * @returns {Array} - Rule evaluation results
 */
const getRuleResultsForAnalysis = async (analysisId) => {
  try {
    const results = await prisma.ruleResult.findMany({
      where: {
        analysisId: parseInt(analysisId)
      },
      include: {
        rule: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return results;
  } catch (error) {
    throw new Error(`Error retrieving rule results: ${error.message}`);
  }
};

module.exports = {
  getRulesByUser,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  evaluateRulesForAnalysis,
  getRuleResultsForAnalysis
};
