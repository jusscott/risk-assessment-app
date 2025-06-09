/**
 * WebSocket Timeout Fix Integration Test
 * 
 * This test verifies that the WebSocket timeout fix correctly handles
 * timeouts during heavy processing in the Analysis Service.
 */

const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const winston = require('winston');
const { 
  queueAnalysisTask, 
  notifyReportServiceWithTimeout, 
  getQueueStatus,
  initReportServiceConnection
} = require('../src/utils/webhook-socket-integration');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Mock WebSocket Server (simulates Report Service)
class MockReportServiceWS {
  constructor(port = 5050) {
    this.port = port;
    this.server = null;
    this.clients = new Set();
    this.messages = [];
    this.connectionCount = 0;
    this.isRunning = false;
  }

  start() {
    return new Promise((resolve) => {
      this.server = new WebSocket.Server({ port: this.port });
      
      this.server.on('connection', (ws) => {
        logger.info('Mock Report Service: New client connected');
        this.connectionCount++;
        this.clients.add(ws);
        
        ws.on('message', (message) => {
          const parsedMessage = JSON.parse(message.toString());
          logger.info(`Mock Report Service: Received message: ${JSON.stringify(parsedMessage)}`);
          this.messages.push(parsedMessage);
          
          // Simulate processing delay
          setTimeout(() => {
            ws.send(JSON.stringify({ 
              type: 'acknowledgment', 
              messageId: parsedMessage.id || 'unknown',
              timestamp: Date.now() 
            }));
          }, 100);
        });
        
        ws.on('close', () => {
          logger.info('Mock Report Service: Client disconnected');
          this.clients.delete(ws);
        });
      });
      
      this.server.on('listening', () => {
        this.isRunning = true;
        logger.info(`Mock Report Service listening on port ${this.port}`);
        resolve();
      });
    });
  }
  
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.clients.forEach(client => {
          client.terminate();
        });
        
        this.server.close(() => {
          logger.info('Mock Report Service stopped');
          this.isRunning = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  getMessages() {
    return this.messages;
  }
  
  getConnectionCount() {
    return this.connectionCount;
  }
  
  clearMessages() {
    this.messages = [];
  }
}

// Simulates a heavy analysis task
function simulateHeavyAnalysis(duration = 5000) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    logger.info(`Starting heavy analysis simulation (${duration}ms)`);
    
    // Simulate CPU-intensive work
    setTimeout(() => {
      const endTime = performance.now();
      logger.info(`Heavy analysis completed in ${Math.round(endTime - startTime)}ms`);
      resolve({
        id: `analysis-${Date.now()}`,
        duration: Math.round(endTime - startTime),
        result: 'Analysis completed successfully'
      });
    }, duration);
  });
}

// Mock Analysis Service
const mockAnalysisService = {
  analyzeQuestionnaire: async (submissionId, userId) => {
    logger.info(`Mock analyzeQuestionnaire called with submissionId=${submissionId}, userId=${userId}`);
    
    // Simulate heavy processing
    const result = await simulateHeavyAnalysis(8000);
    
    return {
      id: result.id,
      submissionId,
      userId,
      score: Math.random() * 10,
      findings: [
        { id: 'finding-1', severity: 'high', description: 'Critical vulnerability found' },
        { id: 'finding-2', severity: 'medium', description: 'Potential security issue' }
      ],
      createdAt: new Date(),
      processingTime: result.duration
    };
  },
  
  getAnalysisById: async (analysisId) => {
    logger.info(`Mock getAnalysisById called with analysisId=${analysisId}`);
    
    return {
      id: analysisId,
      submissionId: 'submission-123',
      userId: 'user-456',
      score: Math.random() * 10,
      findings: [
        { id: 'finding-1', severity: 'high', description: 'Critical vulnerability found' },
        { id: 'finding-2', severity: 'medium', description: 'Potential security issue' }
      ],
      createdAt: new Date()
    };
  }
};

// Mock environment setup
const originalAnalysisService = require('../src/services/analysis.service');
jest.mock('../src/services/analysis.service', () => mockAnalysisService);

// Config mock
jest.mock('../src/config/config', () => ({
  services: {
    reportService: {
      host: 'localhost',
      port: '5050',
      wsUrl: 'ws://localhost:5050'
    }
  },
  logging: {
    level: 'info'
  },
  sockets: {
    keepAliveInterval: 5000,
    reconnectInterval: 1000,
    pingTimeout: 2000,
    maxReconnectDelay: 10000,
    bufferThreshold: 100,
    highPriorityBufferSize: 50
  }
}));

// Tests
describe('WebSocket Timeout Fix - Integration Test', () => {
  let mockReportService;
  
  beforeAll(async () => {
    // Start mock report service
    mockReportService = new MockReportServiceWS(5050);
    await mockReportService.start();
    
    // Initialize connection to mock report service
    initReportServiceConnection();
    
    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  afterAll(async () => {
    // Stop mock report service
    await mockReportService.stop();
  });
  
  beforeEach(() => {
    mockReportService.clearMessages();
  });
  
  test('Should queue and process analysis tasks without WebSocket timeouts', async () => {
    // Create multiple analysis tasks
    const tasks = [
      queueAnalysisTask('submission-1', 'user-1'),
      queueAnalysisTask('submission-2', 'user-1'),
      queueAnalysisTask('submission-3', 'user-2')
    ];
    
    // Wait for all tasks to complete
    const results = await Promise.all(tasks);
    
    // Verify results
    expect(results.length).toBe(3);
    results.forEach(result => {
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('findings');
    });
    
    // Check queue status
    const queueStatus = getQueueStatus();
    expect(queueStatus.queueSize).toBe(0);
    expect(queueStatus.isProcessing).toBe(false);
    
    // Verify that we didn't lose the WebSocket connection during heavy processing
    expect(queueStatus.reportServiceConnected).toBe(true);
  }, 30000); // Increased timeout for this test
  
  test('Should notify report service with timeout protection', async () => {
    // Test notification with timeout protection
    const analysisId = 'analysis-12345';
    const userId = 'user-789';
    
    const result = await notifyReportServiceWithTimeout(analysisId, userId);
    expect(result).toHaveProperty('success', true);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify that the message was sent to the mock report service
    const messages = mockReportService.getMessages();
    const analysisCompleteMessages = messages.filter(m => m.type === 'analysis_complete');
    
    expect(analysisCompleteMessages.length).toBeGreaterThan(0);
    
    const message = analysisCompleteMessages[analysisCompleteMessages.length - 1];
    expect(message).toHaveProperty('analysisId', analysisId);
    expect(message).toHaveProperty('userId', userId);
  });
  
  test('Should handle concurrent heavy processing without blocking WebSocket', async () => {
    // Start a timer to measure the test
    const startTime = performance.now();
    
    // Create tasks with promises to track when notifyReportService is called
    const notificationPromises = [];
    const notificationResults = [];
    
    // Queue multiple analysis tasks
    const tasks = [];
    for (let i = 0; i < 5; i++) {
      const taskPromise = queueAnalysisTask(`submission-concurrent-${i}`, `user-concurrent`);
      
      // After each analysis, notify the report service
      const promise = taskPromise.then(analysis => {
        return notifyReportServiceWithTimeout(analysis.id, analysis.userId)
          .then(result => {
            notificationResults.push(result);
            return analysis;
          });
      });
      
      notificationPromises.push(promise);
      tasks.push(taskPromise);
    }
    
    // Wait for all analysis tasks to complete
    const analysisResults = await Promise.all(tasks);
    expect(analysisResults.length).toBe(5);
    
    // Wait for all notifications to complete
    await Promise.all(notificationPromises);
    expect(notificationResults.length).toBe(5);
    
    // All notifications should have succeeded
    notificationResults.forEach(result => {
      expect(result).toHaveProperty('success', true);
    });
    
    // Wait for messages to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check that all messages were received by the mock report service
    const messages = mockReportService.getMessages();
    const analysisCompleteMessages = messages.filter(m => m.type === 'analysis_complete');
    
    // We should have at least 5 analysis_complete messages
    expect(analysisCompleteMessages.length).toBeGreaterThanOrEqual(5);
    
    // Check connection stats
    const queueStatus = getQueueStatus();
    expect(queueStatus.reportServiceConnected).toBe(true);
    
    // Log the total time
    const endTime = performance.now();
    logger.info(`Concurrent test completed in ${Math.round(endTime - startTime)}ms`);
  }, 60000); // Increased timeout for this test
});
