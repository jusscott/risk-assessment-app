/**
 * Integration tests for industry benchmarking functionality
 */

const axios = require('axios');
const { expect } = require('chai');
const config = require('../config/test-config');
const { 
  userFactory, 
  analysisFactory, 
  reportFactory 
} = require('../factories');

describe('Industry Benchmarking Integration', function() {
  this.timeout(10000); // Longer timeout for integration tests
  
  let authToken;
  let userId;
  let analysisId;
  let industryId;
  let frameworkId = 'iso27001';

  before(async function() {
    // Create test user and get auth token
    const userResult = await userFactory.createWithToken();
    authToken = userResult.token;
    userId = userResult.user.id;

    // Create test analysis
    const analysisResult = await analysisFactory.create({ userId });
    analysisId = analysisResult.id;
  });

  describe('Benchmark API endpoints', function() {
    it('should retrieve all available industries', async function() {
      const response = await axios.get(
        `${config.services.analysis}/api/benchmarks/industries`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
      expect(response.data.data.length).to.be.greaterThan(0);
      
      // Store industry ID for later tests
      industryId = response.data.data[0].id;
    });

    it('should retrieve available frameworks for benchmarking', async function() {
      const response = await axios.get(
        `${config.services.analysis}/api/benchmarks/frameworks`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
      expect(response.data.data).to.include(frameworkId);
    });

    it('should retrieve benchmark data for a specific industry and framework', async function() {
      const response = await axios.get(
        `${config.services.analysis}/api/benchmarks/industries/${industryId}/frameworks/${frameworkId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
      
      const benchmarks = response.data.data;
      expect(benchmarks.length).to.be.greaterThan(0);
      expect(benchmarks[0]).to.have.property('area');
      expect(benchmarks[0]).to.have.property('averageScore');
      expect(benchmarks[0]).to.have.property('industry');
    });
  });

  describe('Benchmark comparison generation', function() {
    it('should generate benchmark comparisons for an analysis', async function() {
      const response = await axios.post(
        `${config.services.analysis}/api/benchmarks/analyses/${analysisId}/compare`,
        {
          industryId: industryId,
          frameworkId: frameworkId
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('benchmarkComparisons');
      expect(response.data.data.benchmarkComparisons).to.be.an('array');
      expect(response.data.data.benchmarkComparisons.length).to.be.greaterThan(0);
    });
  });

  describe('Report generation with benchmarks', function() {
    it('should include benchmark data in generated reports', async function() {
      // First, ensure analysis has benchmark comparisons
      await axios.post(
        `${config.services.analysis}/api/benchmarks/analyses/${analysisId}/compare`,
        {
          industryId: industryId,
          frameworkId: frameworkId
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Then generate a report
      const reportResponse = await axios.post(
        `${config.services.report}/api/reports`,
        {
          analysisId: analysisId,
          title: 'Test Report with Benchmarking'
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(reportResponse.status).to.equal(201);
      expect(reportResponse.data.success).to.be.true;
      expect(reportResponse.data.data).to.have.property('id');
      
      // Get the report details
      const reportId = reportResponse.data.data.id;
      const reportDetailsResponse = await axios.get(
        `${config.services.report}/api/reports/${reportId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      expect(reportDetailsResponse.status).to.equal(200);
      expect(reportDetailsResponse.data.success).to.be.true;
    });
  });
});
