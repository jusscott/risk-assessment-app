/**
 * Industry benchmarking service for comparing analysis results against industry standards
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all available industries
 * @returns {Array} - List of industries
 */
const getAllIndustries = async () => {
  try {
    const industries = await prisma.industry.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return industries;
  } catch (error) {
    throw new Error(`Error retrieving industries: ${error.message}`);
  }
};

/**
 * Get benchmarks for a specific industry and framework
 * @param {number} industryId - ID of the industry
 * @param {string} frameworkId - ID of the compliance framework
 * @returns {Array} - List of benchmark data
 */
const getIndustryBenchmarks = async (industryId, frameworkId) => {
  try {
    const benchmarks = await prisma.industryBenchmark.findMany({
      where: {
        industryId: parseInt(industryId),
        frameworkId: frameworkId
      },
      include: {
        industry: true
      },
      orderBy: {
        area: 'asc'
      }
    });
    
    return benchmarks;
  } catch (error) {
    throw new Error(`Error retrieving industry benchmarks: ${error.message}`);
  }
};

/**
 * Generate benchmark comparisons for an analysis
 * @param {number} analysisId - ID of the analysis
 * @param {number} industryId - ID of the industry to compare with
 * @param {string} frameworkId - Framework ID for the comparison
 * @returns {Object} - Analysis with benchmark comparisons
 */
const generateBenchmarkComparisons = async (analysisId, industryId, frameworkId) => {
  try {
    // Get the analysis with area scores
    const analysis = await prisma.analysis.findUnique({
      where: { id: parseInt(analysisId) },
      include: {
        areaScores: true,
        benchmarkComparisons: true
      }
    });
    
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    
    // Get industry benchmarks
    const benchmarks = await prisma.industryBenchmark.findMany({
      where: {
        industryId: parseInt(industryId),
        frameworkId: frameworkId
      }
    });
    
    if (benchmarks.length === 0) {
      throw new Error('No benchmark data available for the specified industry and framework');
    }
    
    // Delete any existing benchmark comparisons for this analysis
    await prisma.benchmarkComparison.deleteMany({
      where: {
        analysisId: analysis.id
      }
    });
    
    // Create comparisons for each area score
    const comparisons = [];
    
    for (const areaScore of analysis.areaScores) {
      // Find matching benchmark for this area
      const benchmark = benchmarks.find(b => b.area === areaScore.area);
      
      if (benchmark) {
        // Calculate percentile (simple estimation based on the average score)
        // This is a simplified calculation and would be more sophisticated in a real system
        let percentile = null;
        
        if (areaScore.score > benchmark.averageScore) {
          // Score is above average
          const aboveAverageRange = 10 - benchmark.averageScore;
          const scoreAboveAverage = areaScore.score - benchmark.averageScore;
          percentile = 50 + ((scoreAboveAverage / aboveAverageRange) * 50);
        } else {
          // Score is below or at average
          const belowAverageRange = benchmark.averageScore;
          const scoreBelowAverage = areaScore.score;
          percentile = (scoreBelowAverage / belowAverageRange) * 50;
        }
        
        // Ensure percentile is between 0-100
        percentile = Math.max(0, Math.min(100, percentile));
        
        // Create comparison record
        const comparison = await prisma.benchmarkComparison.create({
          data: {
            analysisId: analysis.id,
            benchmarkId: benchmark.id,
            area: areaScore.area,
            score: areaScore.score,
            benchmarkScore: benchmark.averageScore,
            percentile: parseFloat(percentile.toFixed(1))
          }
        });
        
        comparisons.push(comparison);
      }
    }
    
    // Update the analysis with industry ID
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        industryId: parseInt(industryId)
      }
    });
    
    // Return the updated analysis with comparisons
    const updatedAnalysis = await prisma.analysis.findUnique({
      where: { id: analysis.id },
      include: {
        benchmarkComparisons: {
          include: {
            benchmark: {
              include: {
                industry: true
              }
            }
          }
        },
        areaScores: true,
        recommendations: true,
        industry: true
      }
    });
    
    return updatedAnalysis;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all frameworks that have benchmark data
 * @returns {Array} - List of unique framework IDs
 */
const getAvailableFrameworks = async () => {
  try {
    const frameworks = await prisma.industryBenchmark.findMany({
      distinct: ['frameworkId'],
      select: {
        frameworkId: true
      }
    });
    
    return frameworks.map(f => f.frameworkId);
  } catch (error) {
    throw new Error(`Error retrieving available frameworks: ${error.message}`);
  }
};

/**
 * Get available benchmark data for all industries
 * @returns {Object} - Summary of benchmark data availability
 */
const getBenchmarkAvailability = async () => {
  try {
    // Get all industries
    const industries = await prisma.industry.findMany();
    
    // Get count of benchmarks per industry and framework
    const availability = await Promise.all(industries.map(async (industry) => {
      const benchmarks = await prisma.industryBenchmark.groupBy({
        by: ['frameworkId'],
        where: {
          industryId: industry.id
        },
        _count: {
          area: true
        }
      });
      
      return {
        industry: industry,
        frameworks: benchmarks.map(b => ({
          frameworkId: b.frameworkId,
          areaCount: b._count.area
        }))
      };
    }));
    
    return availability;
  } catch (error) {
    throw new Error(`Error retrieving benchmark availability: ${error.message}`);
  }
};

module.exports = {
  getAllIndustries,
  getIndustryBenchmarks,
  generateBenchmarkComparisons,
  getAvailableFrameworks,
  getBenchmarkAvailability
};
