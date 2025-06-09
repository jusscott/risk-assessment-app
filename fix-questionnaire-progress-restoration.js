const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing questionnaire progress restoration...');

// Fix the QuestionnaireDetail.tsx component
const questionnaireDetailPath = path.join(__dirname, 'frontend/src/pages/QuestionnaireDetail.tsx');

console.log('📝 Reading QuestionnaireDetail.tsx...');
let questionnaireDetailContent = fs.readFileSync(questionnaireDetailPath, 'utf8');

// Find and replace the progress restoration logic
const oldLogic = `            // Initialize answers from existing submission data
            if (response.data.answers && response.data.answers.length > 0) {
              const answerMap: { [key: number]: string } = {};
              response.data.answers.forEach((answer: Answer) => {
                answerMap[answer.questionId] = answer.value;
              });
              setAnswers(answerMap);
              
              // Calculate the starting step based on answered questions
              if (response.data.template && response.data.template.questions) {
                const sortedQuestions = [...response.data.template.questions].sort((a, b) => a.order - b.order);
                let lastAnsweredIndex = 0;
                
                for (let i = 0; i < sortedQuestions.length; i++) {
                  if (answerMap[sortedQuestions[i].id]) {
                    lastAnsweredIndex = i;
                  } else {
                    break;
                  }
                }
                
                // Set active step to the next unanswered question
                setActiveStep(lastAnsweredIndex);
                
                // Calculate progress
                const answeredCount = Object.keys(answerMap).length;
                const totalCount = sortedQuestions.length;
                setProgress(Math.min(100, Math.round((answeredCount / totalCount) * 100)));
              }
            }`;

const newLogic = `            // Initialize answers from existing submission data
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
                
                // Set active step to the next unanswered question (or last question if all answered)
                setActiveStep(nextUnansweredIndex);
                
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
            }`;

if (questionnaireDetailContent.includes(oldLogic)) {
  questionnaireDetailContent = questionnaireDetailContent.replace(oldLogic, newLogic);
  console.log('✅ Updated progress restoration logic');
} else {
  console.log('⚠️  Could not find exact match for progress restoration logic, looking for alternative pattern...');
  
  // Look for a more flexible pattern match
  const alternativePattern = /\/\/ Initialize answers from existing submission data[\s\S]*?setProgress\(Math\.min\(100, Math\.round\(\(answeredCount \/ totalCount\) \* 100\)\)\);[\s\S]*?}/;
  
  if (alternativePattern.test(questionnaireDetailContent)) {
    console.log('✅ Found alternative pattern, applying fix...');
    questionnaireDetailContent = questionnaireDetailContent.replace(alternativePattern, newLogic + '\n            }');
  } else {
    console.log('❌ Could not find progress restoration logic to fix');
    process.exit(1);
  }
}

// Also ensure the updateProgress function correctly updates progress during navigation  
const oldUpdateProgress = `  // Update progress based on answered questions
  const updateProgress = () => {
    if (template) {
      const answeredCount = Object.keys(answers).length;
      const totalCount = template.questions.length;
      setProgress(Math.min(100, Math.round((answeredCount / totalCount) * 100)));
    }
  };`;

const newUpdateProgress = `  // Update progress based on answered questions
  const updateProgress = () => {
    if (template) {
      const answeredCount = Object.keys(answers).length;
      const totalCount = template.questions.length;
      const progressPercentage = Math.min(100, Math.round((answeredCount / totalCount) * 100));
      setProgress(progressPercentage);
      console.log(\`📊 Updated progress: \${answeredCount}/\${totalCount} questions answered (\${progressPercentage}%)\`);
    }
  };`;

if (questionnaireDetailContent.includes(oldUpdateProgress)) {
  questionnaireDetailContent = questionnaireDetailContent.replace(oldUpdateProgress, newUpdateProgress);
  console.log('✅ Enhanced updateProgress function with logging');
}

// Write the updated file
fs.writeFileSync(questionnaireDetailPath, questionnaireDetailContent);
console.log('✅ Updated QuestionnaireDetail.tsx with improved progress restoration logic');

console.log(`
🎯 Fix Summary:
=============

**Issue Fixed:**
- In-progress questionnaires were loading but starting at 0% completion instead of honoring existing progress

**Root Cause:**
- The frontend logic for determining the starting question had a flaw where it would set the activeStep to the last answered question instead of the next unanswered question
- The logic assumed questions were answered consecutively, which may not always be the case

**Solution Implemented:**
- Fixed the progress restoration logic to correctly find the first unanswered question
- Improved the calculation to handle both consecutive and non-consecutive answer patterns
- Added comprehensive logging to track progress restoration
- Enhanced the updateProgress function with better logging
- Added fallback handling for questionnaires with no existing answers

**Expected Behavior:**
- When a user clicks "Continue" on an in-progress questionnaire:
  1. The questionnaire will load with all previously answered questions restored
  2. The progress bar will show the correct completion percentage
  3. The user will be positioned at the first unanswered question (or the last question if all are answered)
  4. All existing answers will be preserved and visible when navigating

**Files Modified:**
- frontend/src/pages/QuestionnaireDetail.tsx

The fix should take effect immediately after the frontend is refreshed.
`);

console.log('🔄 Fix completed! The frontend will need to be refreshed for changes to take effect.');
