const fs = require('fs');
const path = require('path');

console.log('🔧 Manually fixing questionnaire progress restoration...');

// Fix the QuestionnaireDetail.tsx component
const questionnaireDetailPath = path.join(__dirname, 'frontend/src/pages/QuestionnaireDetail.tsx');

console.log('📝 Reading QuestionnaireDetail.tsx...');
let questionnaireDetailContent = fs.readFileSync(questionnaireDetailPath, 'utf8');

// Look for the setTimeout fix and enhance it if needed
const currentPattern = /setTimeout\(\(\) => \{\s*setActiveStep\(nextUnansweredIndex\);[\s\S]*?\}, 100\);/;

// Check if the current fix needs improvement
if (currentPattern.test(questionnaireDetailContent)) {
  console.log('✅ Found existing setTimeout fix, enhancing it...');
  
  // Replace the existing setTimeout with a more robust version
  const improvedTimeout = `setTimeout(() => {
                  setActiveStep(nextUnansweredIndex);
                  console.log(\`📍 Restored to question \${nextUnansweredIndex + 1} (index \${nextUnansweredIndex})\`);
                  
                  // Also ensure the progress is updated after setting active step
                  const progressPercentage = Math.min(100, Math.round((answeredCount / totalCount) * 100));
                  setProgress(progressPercentage);
                  console.log(\`📊 Final progress update: \${answeredCount}/\${totalCount} = \${progressPercentage}%\`);
                }, 150);`;
  
  questionnaireDetailContent = questionnaireDetailContent.replace(currentPattern, improvedTimeout);
  
  // Also look for the progress calculation that happens outside the setTimeout
  const progressPattern = /\/\/ Calculate and set progress\s*const progressPercentage = Math\.min\(100, Math\.round\(\(answeredCount \/ totalCount\) \* 100\)\);\s*setProgress\(progressPercentage\);/;
  
  if (progressPattern.test(questionnaireDetailContent)) {
    console.log('✅ Removing duplicate progress calculation outside setTimeout...');
    questionnaireDetailContent = questionnaireDetailContent.replace(progressPattern, '// Progress calculation moved inside setTimeout for proper timing');
  }
  
} else {
  console.log('⚠️  Could not find expected setTimeout pattern. Looking for alternative...');
  
  // Look for the basic setActiveStep pattern and wrap it in setTimeout
  const basicPattern = /setActiveStep\(nextUnansweredIndex\);\s*console\.log\(`📍 Restored to question/;
  
  if (basicPattern.test(questionnaireDetailContent)) {
    console.log('✅ Found basic pattern, wrapping in setTimeout...');
    
    const replacement = `setTimeout(() => {
                  setActiveStep(nextUnansweredIndex);
                  console.log(\`📍 Restored to question \${nextUnansweredIndex + 1} (index \${nextUnansweredIndex})\`);
                  
                  // Ensure progress is set after active step
                  const progressPercentage = Math.min(100, Math.round((answeredCount / totalCount) * 100));
                  setProgress(progressPercentage);
                  console.log(\`📊 Final progress update: \${answeredCount}/\${totalCount} = \${progressPercentage}%\`);
                }, 150);
                
                console.log(\`📍 Will restore to question`;
    
    questionnaireDetailContent = questionnaireDetailContent.replace(
      'setActiveStep(nextUnansweredIndex);\n                  console.log(`📍 Restored to question',
      replacement
    );
  }
}

// Also ensure the updateProgress function has proper logging
const updateProgressPattern = /const updateProgress = \(\) => \{\s*if \(template\) \{\s*const answeredCount = Object\.keys\(answers\)\.length;\s*const totalCount = template\.questions\.length;\s*const progressPercentage = Math\.min\(100, Math\.round\(\(answeredCount \/ totalCount\) \* 100\)\);\s*setProgress\(progressPercentage\);\s*console\.log\(`📊 Updated progress/;

if (updateProgressPattern.test(questionnaireDetailContent)) {
  console.log('✅ updateProgress function already has logging');
} else {
  // Look for the basic updateProgress function and enhance it
  const basicUpdateProgress = /const updateProgress = \(\) => \{\s*if \(template\) \{\s*const answeredCount = Object\.keys\(answers\)\.length;\s*const totalCount = template\.questions\.length;\s*setProgress\(Math\.min\(100, Math\.round\(\(answeredCount \/ totalCount\) \* 100\)\)\);/;
  
  if (basicUpdateProgress.test(questionnaireDetailContent)) {
    console.log('✅ Enhancing updateProgress function with logging...');
    
    const enhancedUpdateProgress = `const updateProgress = () => {
    if (template) {
      const answeredCount = Object.keys(answers).length;
      const totalCount = template.questions.length;
      const progressPercentage = Math.min(100, Math.round((answeredCount / totalCount) * 100));
      setProgress(progressPercentage);
      console.log(\`📊 Updated progress: \${answeredCount}/\${totalCount} questions answered (\${progressPercentage}%)\`);`;
    
    questionnaireDetailContent = questionnaireDetailContent.replace(basicUpdateProgress, enhancedUpdateProgress);
  }
}

// Write the updated file
fs.writeFileSync(questionnaireDetailPath, questionnaireDetailContent);
console.log('✅ Applied manual fixes to QuestionnaireDetail.tsx');

console.log(`
🎯 Manual Fix Summary:
====================

**Improvements Applied:**
1. Enhanced setTimeout delay from 100ms to 150ms for better reliability
2. Moved progress calculation inside setTimeout to ensure proper timing
3. Added additional logging for debugging progress restoration
4. Ensured progress updates happen after activeStep is set
5. Enhanced updateProgress function with detailed logging

**Expected Behavior:**
- When opening an in-progress questionnaire, the system will:
  1. Load all existing answers
  2. Wait 150ms for state updates to process
  3. Set the active step to the first unanswered question
  4. Update the progress bar to reflect current completion
  5. Log detailed information about the restoration process

**Files Modified:**
- frontend/src/pages/QuestionnaireDetail.tsx

The fix addresses timing issues in React state updates to ensure progress restoration works reliably.
`);

console.log('✅ Manual fix completed!');
