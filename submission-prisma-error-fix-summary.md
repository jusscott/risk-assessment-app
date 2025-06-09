# Submission Prisma Error Fix Summary

## Problem
Users were experiencing errors when accessing questionnaires with the following error:

```
Invalid `prisma.submission.findUnique()` invocation in
/app/src/controllers/submission.controller.js:336:48

Unknown field `questions` for include statement on model Template. Available options are listed in green. Did you mean `Question`?
```

The error was occurring in the `getSubmissionById` function in the submission controller. The issue was that the Prisma query was attempting to include a field called `questions` on the Submission model, but that field doesn't exist.

## Fix

We modified the `getSubmissionById` function in `submission.controller.js` to use the proper model relationship structure:

1. Removed the invalid `questions` include statement (lowercase)
2. Used the proper capitalized `Question` model name in the include statement
3. Fixed the nested include structure to properly follow the relationship paths

### Before:
```javascript
const submission = await prisma.submission.findUnique({
  where: {
    id: 8
  },
  include: {
    Template: {
      include: {
        questions: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    },
    Answer: true,
    questions: { // This was the problematic part
      include: {
        Question?: true,
        Submission?: true,
        _count?: true
      }
    }
  }
})
```

### After:
```javascript
const submission = await prisma.submission.findUnique({
  where: { id: parseInt(id) },
  include: {
    Template: {
      include: {
        Question: {  // Using proper capitalized model name
          orderBy: {
            order: 'asc'
          }
        }
      }
    },
    Answer: true
  }
});
```

## Implementation

1. Created a fix script (`fix-submission-prisma-error.js`) that identifies and replaces the problematic function
2. Created a restart script (`restart-after-submission-fix.sh`) that applies the fix and restarts the questionnaire service
3. Applied the fix successfully
4. Verified the fix by checking the updated controller code

## Result

The fix resolves the Prisma validation error by:
- Using the correct model name (`Question` instead of `questions`)
- Removing the invalid direct include of `questions` on the Submission model
- Properly structuring the nested include statements to follow valid relationship paths

Users should now be able to access questionnaires without encountering the Prisma error.
