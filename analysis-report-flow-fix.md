# Analysis and Report Flow Fix

## Current Issues

1. **Missing Webhook/Event Processing**: 
   - The questionnaire service attempts to notify the analysis service when a questionnaire is submitted but has no error handling if the request fails.
   - The analysis service doesn't have a dedicated endpoint to automatically process incoming webhook notifications from the questionnaire service.

2. **Disconnected Service Flow**: 
   - There's no clear automatic flow from questionnaire submission → analysis → report generation.
   - Each step has to be manually triggered by the user.

3. **Missing Report Auto-Generation**:
   - Reports are not automatically generated when analysis is completed.
   - Users have to manually request report generation.

## Files Involved

1. `/backend/questionnaire-service/src/controllers/submission.controller.js`
   - `submitQuestionnaire` function tries to call the analysis service but treats it as optional.

2. `/backend/analysis-service/src/routes/analysis.routes.js`
   - Has routes for manual analysis but no dedicated webhook endpoint.

3. `/backend/analysis-service/src/controllers/analysis.controller.js`
   - Does not trigger report generation after analysis completion.

4. `/backend/analysis-service/src/services/analysis.service.js`
   - Has functionality to analyze submissions but doesn't notify report service.

## Fix Steps

1. Create a webhook endpoint in the Analysis Service to handle incoming questionnaire submissions.
2. Enhance the Questionnaire Service to reliably notify the Analysis Service with retry logic.  
3. Add functionality to automatically generate reports when analyses are completed.
4. Connect services to ensure the full flow is automatic.
