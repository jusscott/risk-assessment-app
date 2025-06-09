/**
 * Controller for industry benchmarking functionality
 */

const benchmarkService = require('../services/benchmark.service');

/**
 * Get all available industries
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getIndustries = async (req, res) => {
  try {
    const industries = await benchmarkService.getAllIndustries();
    
    return res.status(200).json({
      success: true,
      data: industries
    });
  } catch (error) {
    console.error(`Error retrieving industries: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving industries'
      }
    });
  }
};

/**
 * Get industry benchmarks for a specific industry and framework
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getIndustryBenchmarks = async (req, res) => {
  try {
    const { industryId, frameworkId } = req.params;
    
    const benchmarks = await benchmarkService.getIndustryBenchmarks(industryId, frameworkId);
    
    return res.status(200).json({
      success: true,
      data: benchmarks
    });
  } catch (error) {
    console.error(`Error retrieving industry benchmarks: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving industry benchmarks'
      }
    });
  }
};

/**
 * Generate benchmark comparisons for an analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateBenchmarkComparisons = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { industryId, frameworkId } = req.body;
    
    // Validate required parameters
    if (!industryId || !frameworkId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Industry ID and framework ID are required'
        }
      });
    }
    
    const analysis = await benchmarkService.generateBenchmarkComparisons(
      analysisId,
      industryId,
      frameworkId
    );
    
    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error(`Error generating benchmark comparisons: ${error.message}`);
    
    // Handle specific errors
    if (error.message.includes('Analysis not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: 'The specified analysis was not found'
        }
      });
    }
    
    if (error.message.includes('No benchmark data available')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_BENCHMARK_DATA',
          message: 'No benchmark data is available for the specified industry and framework'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while generating benchmark comparisons'
      }
    });
  }
};

/**
 * Get available frameworks for benchmarking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAvailableFrameworks = async (req, res) => {
  try {
    const frameworks = await benchmarkService.getAvailableFrameworks();
    
    return res.status(200).json({
      success: true,
      data: frameworks
    });
  } catch (error) {
    console.error(`Error retrieving available frameworks: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving available frameworks'
      }
    });
  }
};

/**
 * Get benchmark data availability across industries and frameworks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getBenchmarkAvailability = async (req, res) => {
  try {
    const availability = await benchmarkService.getBenchmarkAvailability();
    
    return res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error(`Error retrieving benchmark availability: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving benchmark availability'
      }
    });
  }
};

module.exports = {
  getIndustries,
  getIndustryBenchmarks,
  generateBenchmarkComparisons,
  getAvailableFrameworks,
  getBenchmarkAvailability
};
