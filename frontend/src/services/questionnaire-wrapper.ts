import questionnaireService, { 
  Template,
  InProgressSubmission,
  CompletedSubmission,
  Submission,
  Answer,
  Question
} from './questionnaire.service';
import authTokens from '../utils/auth-tokens';
import tokenDebug from '../utils/token-debug';
import { ApiResponse } from './api';
// Removed unused imports

/**
 * A wrapper around the questionnaire service that ensures tokens are fresh
 * before making calls to the questionnaire APIs
 */
export const questionnaireWrapper = {
  /**
   * Ensure a fresh token before making a questionnaire service API call
   * This function will check if a token refresh is needed and perform it if necessary
   */
  ensureFreshToken: async (): Promise<boolean> => {
    console.log('🔄 QuestionnaireWrapper: ensureFreshToken called');
    
    // Log current token status
    tokenDebug.logTokenStatus('questionnaire-wrapper-ensureFreshToken');
    
    // First, try to validate and recover token
    const recovered = await tokenDebug.validateAndRecoverToken();
    
    if (recovered) {
      console.log('✅ Token validation/recovery successful');
      return true;
    }
    
    // Fall back to the standard ensureFreshToken
    console.log('🔄 Falling back to standard ensureFreshToken');
    return authTokens.ensureFreshToken();
  },
  
  /**
   * Get all available questionnaire templates with token refresh
   */
  getTemplates: async (): Promise<ApiResponse<Template[]>> => {
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.getTemplates();
  },

  /**
   * Get user's in-progress submissions with token refresh
   */
  getInProgressSubmissions: async (): Promise<ApiResponse<InProgressSubmission[]>> => {
    // Use auth tokens utility for consistent token checking
    const hasToken = !!authTokens.getAccessToken();
    
    if (!hasToken) {
      console.log('No authentication token found for in-progress submissions');
      // Check fallback token
      const fallbackToken = localStorage.getItem('token');
      if (!fallbackToken) {
        const error = new Error('No authentication token found. Please log in.');
        (error as any).status = 401;
        throw error;
      }
    }
    
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.getInProgressSubmissions();
  },

  /**
   * Get user's completed submissions with token refresh
   */
  /**
   * Get user's completed submissions with token refresh and debugging
   */
  getCompletedSubmissions: async (): Promise<ApiResponse<CompletedSubmission[]>> => {
    console.log('🔍 QuestionnaireWrapper: getCompletedSubmissions called');
    
    // Enhanced token validation
    tokenDebug.logTokenStatus('questionnaire-wrapper-getCompletedSubmissions');
    
    // Use auth tokens utility instead of direct localStorage check
    const hasToken = !!authTokens.getAccessToken();
    
    if (!hasToken) {
      console.log('No authentication token found in auth utility, attempting recovery...');
      
      // Try to recover token
      const recovered = await tokenDebug.validateAndRecoverToken();
      
      if (!recovered) {
        // Check if we have a token in localStorage as fallback
        const fallbackToken = localStorage.getItem('token');
        if (!fallbackToken) {
          const error = new Error('No authentication token found. Please log in.');
          (error as any).status = 401;
          throw error;
        } else {
          console.log('Found fallback token in localStorage, forcing sync');
          await tokenDebug.forceTokenSync();
        }
      }
    }
    
    // Always try to ensure fresh token before making request
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.getCompletedSubmissions();
  },

  /**
   * Get a specific submission by ID with template and answers
   */
  getSubmissionById: async (id: number): Promise<ApiResponse<Submission>> => {
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.getSubmissionById(id);
  },

  /**
   * Start a new questionnaire submission
   */
  startSubmission: async (templateId: number): Promise<ApiResponse<Submission>> => {
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.startSubmission(templateId);
  },

  /**
   * Update a submission with answers
   */
  updateSubmission: async (id: number, answers: Answer[]): Promise<ApiResponse<void>> => {
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.updateSubmission(id, answers);
  },

  /**
   * Submit a completed questionnaire for analysis
   */
  submitQuestionnaire: async (id: number): Promise<ApiResponse<Submission>> => {
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.submitQuestionnaire(id);
  },
  
  /**
   * Get a specific template by ID with all questions using pagination
   */
  getTemplateById: async (id: number, page: number = 1, pageSize: number = 50): Promise<ApiResponse<any>> => {
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.getTemplateById(id, page, pageSize);
  },
  
  /**
   * Get a specific template by ID without loading questions (metadata only)
   */
  getTemplateMetadata: async (id: number): Promise<ApiResponse<any>> => {
    await questionnaireWrapper.ensureFreshToken();
    return questionnaireService.getTemplateMetadata(id);
  },
  
  /**
   * Load all questions for a template by loading each page sequentially
   * and combining the results. Use this carefully as it may cause performance
   * issues with very large templates.
   */
  getAllTemplateQuestions: async (id: number, pageSize: number = 100): Promise<Question[]> => {
    await questionnaireWrapper.ensureFreshToken();
    
    // First get template metadata to know total questions
    const metadataResponse = await questionnaireService.getTemplateMetadata(id);
    if (!metadataResponse.success) {
      throw new Error('Failed to load template metadata');
    }
    
    // The updated API now returns totalQuestions as part of the extended TemplateDetail interface
    // Fallback to counting questions array length if totalQuestions is not available
    const totalQuestions = metadataResponse.data.totalQuestions || 
                          (metadataResponse.data.questions ? metadataResponse.data.questions.length : 0);
    
    const totalPages = Math.ceil(totalQuestions / pageSize);
    let allQuestions: Question[] = [];
    
    // Load each page sequentially
    for (let page = 1; page <= totalPages; page++) {
      await questionnaireWrapper.ensureFreshToken(); // Ensure token is fresh for each request
      const response = await questionnaireService.getTemplateById(id, page, pageSize);
      
      if (response.success && response.data.questions) {
        allQuestions = [...allQuestions, ...response.data.questions];
      } else {
        console.error(`Failed to load page ${page} of template questions`);
      }
    }
    
    return allQuestions;
  },

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

export default questionnaireWrapper;
