/**
 * Mock Data for Testing
 */

module.exports = {
  templates: [
    {
      id: 'template-001',
      name: 'ISO 27001',
      description: 'Information Security Management System',
      version: '1.0',
      sections: [
        {
          id: 'section-001',
          title: 'Risk Assessment',
          questions: [
            {
              id: 'question-001',
              text: 'Have you performed a risk assessment?',
              type: 'BOOLEAN',
              required: true
            }
          ]
        }
      ]
    }
  ],
  
  submissions: [
    {
      id: 'submission-001',
      templateId: 'template-001',
      userId: 'user-001',
      name: 'Test Submission',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      answers: [
        {
          questionId: 'question-001',
          value: 'true'
        }
      ]
    }
  ],
  
  users: [
    {
      id: 'user-001',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN'
    }
  ]
};