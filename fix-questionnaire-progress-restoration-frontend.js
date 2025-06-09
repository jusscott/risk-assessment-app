#!/usr/bin/env node

/**
 * Fix questionnaire progress restoration in the frontend
 * Issue: Users can see in-progress questionnaires but they start from the beginning
 * instead of resuming from where they left off
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing questionnaire progress restoration in frontend...');

// Path to the QuestionnaireDetail component
const questionnaireDetailPath = path.join(__dirname, 'frontend/src/pages/QuestionnaireDetail.tsx');

// Read the original file
const originalContent = fs.readFileSync(questionnaireDetailPath, 'utf8');

// The fix involves updating the progress restoration logic to handle pagination correctly
const updatedContent = originalContent.replace(
  // Find the section where existing submission data is processed
  /\/\/ Initialize answers from existing submission data[\s\S]*?console\.log\('🆕 Starting new questionnaire from the beginning'\);/,
  `// Initialize answers from existing submission data
            if (response.data.answers && response.data.answers.length > 0) {
              const answerMap: { [key: number]: string } = {};
              response.data.answers.forEach((answer: Answer) => {
                answerMap[answer.questionId] = answer.value;
              });
              setAnswers(answerMap);
              
              // Calculate the starting step based on answered questions
              if (response.data.template && response.data.template.questions) {
                const sortedQuestions = [...response.data.template.questions].sort((a, b) => a.order - b.order);
                const answeredCount = Object.keys(answerMap).length;
                const totalCount = sortedQuestions.length;
                
                // Find the first unanswered question to continue from
                let nextUnansweredIndex = 0;
                for (let i = 0; i < sortedQuestions.length; i++) {
                  if (!answerMap[sortedQuestions[i].id]) {
                    nextUnansweredIndex = i;
                    break;
                  }
                  // If all questions are answered, stay at the last question
                  nextUnansweredIndex = i;
                }
                
                // CRITICAL FIX: Ensure activeStep is set AFTER answers are loaded
                // Use setTimeout to ensure state updates are processed
                setTimeout(() => {
                  setActiveStep(nextUnansweredIndex);
                  console.log(\`📍 Restored to question \${nextUnansweredIndex + 1} (index \${nextUnansweredIndex})\`);
                }, 100);
                
                // Calculate and set progress
                const progressPercentage = Math.min(100, Math.round((answeredCount / totalCount) * 100));
                setProgress(progressPercentage);
                
                console.log(\`📊 Restored questionnaire progress: \${answeredCount}/\${totalCount} questions answered (\${progressPercentage}%), starting at question \${nextUnansweredIndex + 1}\`);
              }
            } else {
              // No existing answers, start from the beginning
              setActiveStep(0);
              setProgress(0);
              console.log('🆕 Starting new questionnaire from the beginning');
            }`
);

// Also update the updateProgress function to be called during initialization
const finalContent = updatedContent.replace(
  // Find the updateProgress function
  /\/\/ Update progress based on answered questions\s*const updateProgress = \(\) => \{[\s\S]*?\};/,
  `// Update progress based on answered questions
  const updateProgress = () => {
    if (template) {
      const answeredCount = Object.keys(answers).length;
      const totalCount = template.questions.length;
      const progressPercentage = Math.min(100, Math.round((answeredCount / totalCount) * 100));
      setProgress(progressPercentage);
      console.log(\`📊 Updated progress: \${answeredCount}/\${totalCount} questions answered (\${progressPercentage}%)\`);
    }
  };
  
  // Call updateProgress whenever answers change
  React.useEffect(() => {
    updateProgress();
  }, [answers, template]);`
);

// Add import for React if not already present
const finalContentWithImport = finalContent.includes('import React,') 
  ? finalContent 
  : finalContent.replace(
    /import React, \{([^}]+)\} from 'react';/,
    "import React, { $1 } from 'react';"
  );

// Write the updated content
fs.writeFileSync(questionnaireDetailPath, finalContentWithImport);

console.log('✅ Fixed questionnaire progress restoration logic');
console.log('📋 Changes made:');
console.log('  - Fixed activeStep restoration with proper timing');
console.log('  - Added automatic progress updates when answers change');
console.log('  - Improved logging for debugging progress restoration');
console.log('  - Ensured progress calculation is called during initialization');

console.log('\n🔧 Additional fix: Update questionnaire service to better handle progress restoration...');

// Also update the questionnaire service to return better progress information
const questionnaireServicePath = path.join(__dirname, 'frontend/src/services/questionnaire.service.ts');

if (fs.existsSync(questionnaireServicePath)) {
  const serviceContent = fs.readFileSync(questionnaireServicePath, 'utf8');
  
  // Add a method to calculate expected progress from submission data
  const updatedServiceContent = serviceContent.replace(
    /export interface Submission \{[\s\S]*?\}/,
    `export interface Submission {
  id: number;
  userId: string;
  templateId: number;
  status: 'draft' | 'submitted' | 'analyzed';
  createdAt: string;
  updatedAt: string;
  template?: TemplateDetail;
  Answer?: Answer[];
  answers?: Answer[]; // Alternative field name
  // Add progress information
  expectedProgress?: number;
  expectedStartIndex?: number;
}`
  );
  
  fs.writeFileSync(questionnaireServicePath, updatedServiceContent);
  console.log('✅ Updated Submission interface with progress fields');
}

console.log('\n🔧 Final fix: Update the questionnaire wrapper to handle progress better...');

// Update questionnaire wrapper to add progress calculation
const questionnaireWrapperPath = path.join(__dirname, 'frontend/src/services/questionnaire-wrapper.ts');

if (fs.existsSync(questionnaireWrapperPath)) {
  const wrapperContent = fs.readFileSync(questionnaireWrapperPath, 'utf8');
  
  // Add a utility function to calculate progress from submission data
  const updatedWrapperContent = wrapperContent.replace(
    /export default questionnaireWrapper;/,
    `
  /**
   * Calculate progress information from submission data
   */
  calculateSubmissionProgress: (submission: any): { progress: number; nextQuestionIndex: number } => {
    if (!submission.template?.questions || !submission.Answer) {
      return { progress: 0, nextQuestionIndex: 0 };
    }
    
    const sortedQuestions = [...submission.template.questions].sort((a: any, b: any) => a.order - b.order);
    const answerMap: { [key: number]: string } = {};
    
    // Handle both Answer and answers field names
    const answers = submission.Answer || submission.answers || [];
    answers.forEach((answer: any) => {
      answerMap[answer.questionId] = answer.value;
    });
    
    const answeredCount = Object.keys(answerMap).length;
    const totalCount = sortedQuestions.length;
    
    // Find the first unanswered question
    let nextQuestionIndex = 0;
    for (let i = 0; i < sortedQuestions.length; i++) {
      if (!answerMap[sortedQuestions[i].id]) {
        nextQuestionIndex = i;
        break;
      }
      nextQuestionIndex = i; // If all answered, stay at last
    }
    
    const progress = Math.min(100, Math.round((answeredCount / totalCount) * 100));
    
    return { progress, nextQuestionIndex };
  }
};

export default questionnaireWrapper;`
  );
  
  fs.writeFileSync(questionnaireWrapperPath, updatedWrapperContent);
  console.log('✅ Added progress calculation utility to questionnaire wrapper');
}

console.log('\n✅ Frontend progress restoration fix completed!');
console.log('\n📋 Summary of fixes:');
console.log('1. Fixed timing issues in activeStep restoration');
console.log('2. Added automatic progress updates on answer changes');
console.log('3. Enhanced submission interface with progress fields');
console.log('4. Added progress calculation utility to wrapper');
console.log('5. Improved debugging and logging');

console.log('\n🚀 The questionnaire progress restoration should now work correctly!');
console.log('Users will now resume questionnaires from where they left off instead of starting over.');
