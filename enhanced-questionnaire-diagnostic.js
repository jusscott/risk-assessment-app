#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const readline = require('readline');

// Create a Prisma client to connect to the questionnaire database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://questionnaire_user:questionnaire_password@localhost:5433/questionnaire_service_db'
    }
  }
});

class QuestionnaireDebugger {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.baseURL = 'http://localhost:5000'; // API Gateway
    this.previousSubmissionStates = new Map();
  }

  async initialize() {
    console.log('🔧 Enhanced Questionnaire Service Diagnostic Tool');
    console.log('='.repeat(70));
    
    try {
      // Test database connectivity
      console.log('\n📊 Testing database connectivity...');
      await prisma.$connect();
      console.log('✅ Database connection successful');
      
      // Get initial baseline
      await this.getSystemBaseline();
      
      // Start interactive mode
      await this.startInteractiveMode();
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
    }
  }

  async getSystemBaseline() {
    console.log('\n🔍 Getting system baseline...');
    
    // Check all submissions
    const allSubmissions = await prisma.submission.findMany({
      include: {
        Template: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        Answer: {
          select: {
            id: true,
            questionId: true,
            value: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`📈 Total submissions: ${allSubmissions.length}`);
    
    // Check in-progress submissions specifically
    const inProgressSubmissions = allSubmissions.filter(s => s.status === 'draft' && s.Answer.length > 0);
    console.log(`🔄 In-progress submissions with answers: ${inProgressSubmissions.length}`);
    
    // Store baseline states
    for (const submission of inProgressSubmissions) {
      this.previousSubmissionStates.set(submission.id, {
        answerCount: submission.Answer.length,
        lastUpdated: submission.updatedAt,
        status: submission.status
      });
    }
    
    if (inProgressSubmissions.length > 0) {
      console.log('\n📋 In-progress submissions that should restore progress:');
      inProgressSubmissions.forEach((submission, index) => {
        console.log(`   ${index + 1}. ID: ${submission.id}`);
        console.log(`      User: "${submission.userId}"`);
        console.log(`      Template: ${submission.Template?.name || 'Unknown'}`);
        console.log(`      Answers: ${submission.Answer.length}`);
        console.log(`      Last updated: ${submission.updatedAt.toISOString()}`);
        console.log('');
      });
    }
    
    // Test API connectivity
    await this.testAPIConnectivity();
  }

  async testAPIConnectivity() {
    console.log('\n🌐 Testing API connectivity...');
    
    try {
      const healthResponse = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`   API Gateway health: ${healthResponse.status}`);
      
      // Test questionnaire service endpoint
      const questionnaireResponse = await axios.get(`${this.baseURL}/api/questionnaire/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`   Questionnaire service: ${questionnaireResponse.status}`);
      
      // Test auth-protected endpoint (should return 401)
      const protectedResponse = await axios.get(`${this.baseURL}/api/questionnaire/submissions/in-progress`, {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`   Protected endpoint: ${protectedResponse.status} (expected: 401)`);
      
    } catch (error) {
      console.log(`   ⚠️ API connectivity error: ${error.message}`);
    }
  }

  async startRealTimeMonitoring() {
    console.log('\n🔄 Starting real-time monitoring...');
    console.log('   Watching for submission changes every 2 seconds...');
    console.log('   Press "q" + Enter to stop monitoring\n');
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.checkForChanges();
    }, 2000);
  }

  async checkForChanges() {
    try {
      const currentSubmissions = await prisma.submission.findMany({
        where: {
          status: 'draft',
          Answer: {
            some: {}
          }
        },
        include: {
          Template: {
            select: {
              id: true,
              name: true
            }
          },
          Answer: {
            select: {
              id: true,
              questionId: true,
              value: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      for (const submission of currentSubmissions) {
        const previousState = this.previousSubmissionStates.get(submission.id);
        const currentState = {
          answerCount: submission.Answer.length,
          lastUpdated: submission.updatedAt,
          status: submission.status
        };

        if (!previousState) {
          // New submission detected
          console.log(`🆕 NEW SUBMISSION DETECTED:`);
          console.log(`   ID: ${submission.id}`);
          console.log(`   User: "${submission.userId}"`);
          console.log(`   Template: ${submission.Template?.name}`);
          console.log(`   Answers: ${submission.Answer.length}`);
          console.log(`   Time: ${new Date().toISOString()}\n`);
        } else if (currentState.answerCount !== previousState.answerCount ||
                   currentState.lastUpdated.getTime() !== previousState.lastUpdated.getTime()) {
          // Submission updated
          console.log(`🔄 SUBMISSION UPDATED:`);
          console.log(`   ID: ${submission.id}`);
          console.log(`   User: "${submission.userId}"`);
          console.log(`   Answers: ${previousState.answerCount} → ${currentState.answerCount}`);
          console.log(`   Updated: ${currentState.lastUpdated.toISOString()}`);
          
          if (currentState.answerCount > previousState.answerCount) {
            const newAnswers = submission.Answer.slice(previousState.answerCount);
            console.log(`   📝 New answers:`);
            newAnswers.forEach(answer => {
              console.log(`      Q${answer.questionId}: "${answer.value.substring(0, 50)}${answer.value.length > 50 ? '...' : ''}"`);
            });
          }
          console.log('');
        }

        this.previousSubmissionStates.set(submission.id, currentState);
      }
    } catch (error) {
      console.error('❌ Error during monitoring:', error.message);
    }
  }

  async analyzeProgressRestoration() {
    console.log('\n🔍 Analyzing Progress Restoration Issues...');
    console.log('-'.repeat(50));
    
    const inProgressSubmissions = await prisma.submission.findMany({
      where: {
        status: 'draft',
        Answer: {
          some: {}
        }
      },
      include: {
        Template: {
          include: {
            Question: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        Answer: {
          orderBy: {
            questionId: 'asc'
          }
        }
      }
    });

    if (inProgressSubmissions.length === 0) {
      console.log('⚠️  No in-progress submissions found to analyze');
      return;
    }

    console.log(`📊 Analyzing ${inProgressSubmissions.length} in-progress submissions:\n`);

    for (const [index, submission] of inProgressSubmissions.entries()) {
      console.log(`📝 Submission ${index + 1}:`);
      console.log(`   ID: ${submission.id}`);
      console.log(`   User: "${submission.userId}"`);
      console.log(`   Template: ${submission.Template.name}`);
      
      const totalQuestions = submission.Template.Question.length;
      const answeredQuestions = submission.Answer.length;
      const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
      
      console.log(`   Progress: ${progressPercentage}% (${answeredQuestions}/${totalQuestions})`);
      
      // Find the next unanswered question
      const answeredQuestionIds = new Set(submission.Answer.map(a => a.questionId));
      const nextUnansweredQuestion = submission.Template.Question.find(q => !answeredQuestionIds.has(q.id));
      
      if (nextUnansweredQuestion) {
        console.log(`   Next question should be: #${nextUnansweredQuestion.order} (ID: ${nextUnansweredQuestion.id})`);
        console.log(`   Question text: "${nextUnansweredQuestion.text.substring(0, 80)}${nextUnansweredQuestion.text.length > 80 ? '...' : ''}"`);
      } else {
        console.log(`   ✅ All questions answered`);
      }
      
      // Check for gaps in answered questions
      const sortedQuestions = submission.Template.Question.sort((a, b) => a.order - b.order);
      const gaps = [];
      for (let i = 0; i < sortedQuestions.length; i++) {
        const question = sortedQuestions[i];
        if (!answeredQuestionIds.has(question.id)) {
          // Check if there are answered questions after this one
          const hasLaterAnswers = sortedQuestions.slice(i + 1).some(q => answeredQuestionIds.has(q.id));
          if (hasLaterAnswers) {
            gaps.push(question.order);
          }
        }
      }
      
      if (gaps.length > 0) {
        console.log(`   ⚠️  Gaps in answers at questions: ${gaps.join(', ')}`);
      }
      
      console.log(`   Last updated: ${submission.updatedAt.toISOString()}`);
      console.log('');
    }
  }

  async runProgressTestScenario() {
    console.log('\n🧪 Progress Restoration Test Scenario');
    console.log('-'.repeat(40));
    console.log('This will help you test the specific issue you\'re experiencing.\n');
    
    // Get the most recent in-progress submission
    const recentSubmission = await prisma.submission.findFirst({
      where: {
        status: 'draft',
        Answer: {
          some: {}
        }
      },
      include: {
        Template: {
          include: {
            Question: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        Answer: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (!recentSubmission) {
      console.log('⚠️  No in-progress submissions found for testing');
      return;
    }

    const totalQuestions = recentSubmission.Template.Question.length;
    const answeredQuestions = recentSubmission.Answer.length;
    const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
    
    console.log('🎯 Test Target Submission:');
    console.log(`   ID: ${recentSubmission.id}`);
    console.log(`   User: "${recentSubmission.userId}"`);
    console.log(`   Template: ${recentSubmission.Template.name}`);
    console.log(`   Expected Progress: ${progressPercentage}%`);
    console.log(`   Expected Answers: ${answeredQuestions}`);
    console.log('');
    
    console.log('📋 TEST CHECKLIST - Check these in your browser:');
    console.log('   1. Navigate to questionnaires page');
    console.log('   2. Look for this in-progress questionnaire:', recentSubmission.Template.name);
    console.log('   3. Click "Continue" button');
    console.log('   4. Check browser console for:');
    console.log('      - "📊 Restored questionnaire progress" message');
    console.log(`      - Progress should show: ${progressPercentage}%`);
    console.log(`      - Should have ${answeredQuestions} restored answers`);
    console.log('   5. Verify you\'re positioned at the correct question');
    console.log('   6. Navigate back/forward to check previous answers are loaded');
    console.log('');
    
    // Find the next question they should be on
    const answeredQuestionIds = new Set(recentSubmission.Answer.map(a => a.questionId));
    const nextQuestion = recentSubmission.Template.Question.find(q => !answeredQuestionIds.has(q.id));
    
    if (nextQuestion) {
      console.log(`🎯 Expected next question: #${nextQuestion.order}`);
      console.log(`   Text: "${nextQuestion.text.substring(0, 100)}${nextQuestion.text.length > 100 ? '...' : ''}"`);
    }
    
    console.log('\n🔍 If progress restoration fails, check:');
    console.log('   - Are you seeing the correct progress percentage?');
    console.log('   - Are previous answers visible when you navigate back?');
    console.log('   - Does the current question position match expectations?');
    console.log('   - Any errors in browser console?');
  }

  async startInteractiveMode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n🎮 Interactive Diagnostic Mode');
    console.log('Available commands:');
    console.log('  1 - Start real-time monitoring');
    console.log('  2 - Analyze progress restoration');
    console.log('  3 - Run progress test scenario');
    console.log('  4 - Refresh system baseline');
    console.log('  q - Quit');
    console.log('');

    const askCommand = () => {
      rl.question('Enter command (1-4, q): ', async (answer) => {
        const command = answer.trim().toLowerCase();
        
        try {
          switch (command) {
            case '1':
              await this.startRealTimeMonitoring();
              break;
            case '2':
              await this.analyzeProgressRestoration();
              break;
            case '3':
              await this.runProgressTestScenario();
              break;
            case '4':
              await this.getSystemBaseline();
              break;
            case 'q':
              this.stopMonitoring();
              rl.close();
              await prisma.$disconnect();
              console.log('\n👋 Diagnostic session ended');
              return;
            default:
              console.log('❌ Invalid command');
          }
        } catch (error) {
          console.error('❌ Command error:', error.message);
        }
        
        console.log('');
        askCommand();
      });
    };

    askCommand();
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('⏹️  Monitoring stopped');
    }
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down diagnostic tool...');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the enhanced diagnostic tool
const diagnosticTool = new QuestionnaireDebugger();
diagnosticTool.initialize().catch(console.error);
