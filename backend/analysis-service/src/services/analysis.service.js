/**
 * Analysis service for processing questionnaire submissions and generating risk assessments
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const config = require('../config/config');
const axios = require('axios');

/**
 * Process a questionnaire submission to generate risk analysis
 * @param {number} submissionId - ID of the questionnaire submission
 * @param {string} userId - ID of the user who submitted the questionnaire
 * @returns {Object} - Analysis results
 */
const analyzeSubmission = async (submissionId, userId) => {
  try {
    // Fetch the submission data from the questionnaire service
    const submissionData = await fetchSubmissionData(submissionId);

    // Check if submission exists
    if (!submissionData) {
      throw new Error('Submission not found');
    }

    // Analyze submission data and calculate risk scores
    const analysisResults = calculateRiskScores(submissionData);
    
    // Generate recommendations based on analysis
    const recommendations = generateRecommendations(analysisResults);

    // Store analysis results in the database
    const analysis = await createAnalysisRecord(
      userId, 
      submissionId, 
      analysisResults, 
      recommendations
    );

    return analysis;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch submission data from the questionnaire service
 * @param {number} submissionId - ID of the submission to fetch
 * @returns {Object} - Submission data including answers and template info
 */
const fetchSubmissionData = async (submissionId) => {
  try {
    const response = await axios.get(
      `${config.services.questionnaire}/api/submissions/${submissionId}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.success) {
      throw new Error('Failed to fetch submission data');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(`Error fetching submission data: ${error.message}`);
  }
};

/**
 * Calculate risk scores based on questionnaire answers
 * @param {Object} submissionData - Data from the questionnaire submission
 * @returns {Object} - Analysis results with overall score and area scores
 */
const calculateRiskScores = (submissionData) => {
  const { answers, template } = submissionData;
  
  // Initialize scores for each security area
  const areaScores = {};
  
  // Initialize count of questions per area
  const areaCounts = {};
  
  // Process each answer to calculate area scores
  answers.forEach(answer => {
    const question = template.questions.find(q => q.id === answer.questionId);
    
    if (!question) return;
    
    // Get the area/category this question belongs to
    const area = question.category || 'General';
    
    // Initialize area if not exists
    if (!areaScores[area]) {
      areaScores[area] = 0;
      areaCounts[area] = 0;
    }
    
    // Add to score based on answer value and question weight
    // Assuming answers are numeric values from 1-5 where higher is better
    const weight = question.weight || 1;
    const value = answer.value || 1;
    
    areaScores[area] += value * weight;
    areaCounts[area] += weight;
  });
  
  // Calculate average score for each area (normalize to 0-10 scale)
  const normalizedAreaScores = Object.keys(areaScores).map(area => {
    const rawScore = areaScores[area] / areaCounts[area];
    // Convert to 0-10 scale
    const normalizedScore = (rawScore / 5) * 10;
    return {
      area,
      score: parseFloat(normalizedScore.toFixed(1))
    };
  });
  
  // Calculate overall risk score (weighted average of area scores)
  let overallScore = 0;
  let totalWeight = 0;
  
  normalizedAreaScores.forEach(areaScore => {
    const weight = config.analysis.categoryWeights[areaScore.area] || 1;
    overallScore += areaScore.score * weight;
    totalWeight += weight;
  });
  
  const finalOverallScore = parseFloat((overallScore / totalWeight).toFixed(1));
  
  // Determine security level based on overall score
  let securityLevel;
  if (finalOverallScore <= config.analysis.riskThresholds.low) {
    securityLevel = 'High Risk';
  } else if (finalOverallScore <= config.analysis.riskThresholds.medium) {
    securityLevel = 'Medium Risk';
  } else if (finalOverallScore <= config.analysis.riskThresholds.high) {
    securityLevel = 'Low Risk';
  } else {
    securityLevel = 'Minimal Risk';
  }
  
  return {
    riskScore: finalOverallScore,
    securityLevel,
    areaScores: normalizedAreaScores
  };
};

/**
 * Generate recommendations based on analysis results
 * @param {Object} analysisResults - Results from risk score calculation
 * @returns {Array} - List of recommendation objects
 */
const generateRecommendations = (analysisResults) => {
  const { areaScores } = analysisResults;
  const recommendations = [];
  
  // Find areas with the lowest scores
  const sortedAreas = [...areaScores].sort((a, b) => a.score - b.score);
  
  // Generate recommendations based on the lowest scoring areas
  sortedAreas.forEach((area, index) => {
    // Generate more recommendations for lower scoring areas
    if (area.score < 7 || index < 3) {
      const areaRecommendations = getRecommendationsForArea(area.area, area.score);
      recommendations.push(...areaRecommendations);
    }
  });
  
  // Sort recommendations by priority
  return recommendations.sort((a, b) => a.priority - b.priority);
};

/**
 * Get specific recommendations for a security area based on its score
 * @param {string} area - Security area name
 * @param {number} score - Area score (0-10)
 * @returns {Array} - List of recommendation objects for the area
 */
const getRecommendationsForArea = (area, score) => {
  // These would ideally come from a database, but for now hardcoded by area
  const recommendationsByArea = {
    'Access Control': [
      {
        description: 'Implement multi-factor authentication for all user accounts',
        priority: score < 4 ? 1 : 2,
        category: 'Access Control'
      },
      {
        description: 'Review and update access control policies every quarter',
        priority: 3,
        category: 'Access Control'
      },
      {
        description: 'Implement the principle of least privilege for all system access',
        priority: score < 6 ? 2 : 3,
        category: 'Access Control'
      }
    ],
    'Data Protection': [
      {
        description: 'Encrypt all sensitive data at rest and in transit',
        priority: score < 5 ? 1 : 2,
        category: 'Data Protection'
      },
      {
        description: 'Develop and implement a comprehensive data classification policy',
        priority: 2,
        category: 'Data Protection'
      },
      {
        description: 'Implement regular data backup and recovery testing',
        priority: score < 4 ? 1 : 3,
        category: 'Data Protection'
      }
    ],
    'Network Security': [
      {
        description: 'Deploy network segmentation to isolate sensitive systems',
        priority: score < 5 ? 1 : 2,
        category: 'Network Security'
      },
      {
        description: 'Implement intrusion detection and prevention systems',
        priority: score < 4 ? 1 : 3,
        category: 'Network Security'
      },
      {
        description: 'Conduct regular vulnerability scanning and penetration testing',
        priority: 2,
        category: 'Network Security'
      }
    ],
    'Application Security': [
      {
        description: 'Implement secure coding practices and training',
        priority: score < 5 ? 1 : 2,
        category: 'Application Security'
      },
      {
        description: 'Conduct regular security code reviews',
        priority: 2,
        category: 'Application Security'
      },
      {
        description: 'Implement web application firewall',
        priority: score < 4 ? 1 : 3,
        category: 'Application Security'
      }
    ],
    'Security Awareness': [
      {
        description: 'Conduct regular security awareness training for all employees',
        priority: score < 5 ? 1 : 2,
        category: 'Security Awareness'
      },
      {
        description: 'Implement phishing simulation exercises',
        priority: 2,
        category: 'Security Awareness'
      },
      {
        description: 'Develop security guidelines for remote workers',
        priority: 3,
        category: 'Security Awareness'
      }
    ],
    'General': [
      {
        description: 'Develop and implement a comprehensive security policy',
        priority: score < 4 ? 1 : 3,
        category: 'Governance'
      },
      {
        description: 'Conduct a full security risk assessment annually',
        priority: 2,
        category: 'Governance'
      },
      {
        description: 'Establish a security incident response team',
        priority: score < 5 ? 2 : 3,
        category: 'Incident Response'
      }
    ]
  };
  
  // Get recommendations for the specified area, or use general recommendations
  return (recommendationsByArea[area] || recommendationsByArea['General'])
    // Adjust priority based on score (lower scores get higher priority)
    .map(rec => ({
      ...rec,
      // Ensure priority is between 1-5
      priority: Math.max(1, Math.min(5, rec.priority))
    }));
};

/**
 * Create an analysis record in the database
 * @param {string} userId - ID of the user who submitted the questionnaire
 * @param {number} submissionId - ID of the questionnaire submission
 * @param {Object} analysisResults - Results from risk score calculation
 * @param {Array} recommendations - Generated recommendations
 * @returns {Object} - Created analysis record
 */
const createAnalysisRecord = async (userId, submissionId, analysisResults, recommendations) => {
  try {
    const { riskScore, securityLevel, areaScores } = analysisResults;
    
    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        userId,
        submissionId,
        riskScore,
        securityLevel,
        recommendations: {
          create: recommendations.map(rec => ({
            description: rec.description,
            priority: rec.priority,
            category: rec.category
          }))
        },
        areaScores: {
          create: areaScores.map(as => ({
            area: as.area,
            score: as.score
          }))
        }
      },
      include: {
        recommendations: true,
        areaScores: true
      }
    });
    
    return analysis;
  } catch (error) {
    throw new Error(`Error creating analysis record: ${error.message}`);
  }
};

/**
 * Get analysis by ID
 * @param {number} analysisId - ID of the analysis to fetch
 * @returns {Object} - Analysis record with recommendations and area scores
 */
const getAnalysisById = async (analysisId) => {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: { id: parseInt(analysisId) },
      include: {
        recommendations: true,
        areaScores: true
      }
    });
    
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    
    return analysis;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all analyses for a user
 * @param {string} userId - ID of the user
 * @returns {Array} - List of analysis records
 */
const getUserAnalyses = async (userId) => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { userId },
      include: {
        areaScores: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return analyses;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  analyzeSubmission,
  getAnalysisById,
  getUserAnalyses
};
