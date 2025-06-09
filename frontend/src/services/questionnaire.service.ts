import api, { ApiResponse } from './api';

// Types
export interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  questions: number;
  estimatedTime: string;
}

export interface Question {
  id: number;
  text: string;
  type: string;
  options: string[];
  required: boolean;
  order: number;
  templateId: number;
}

export interface TemplateDetail {
  id: number;
  name: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  totalQuestions?: number;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface Answer {
  id?: number;
  questionId: number;
  submissionId: number;
  value: string;
}

export interface Submission {
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
}

export interface InProgressSubmission {
  id: number;
  name: string;
  framework: string;
  progress: number;
  startDate: string;
  lastUpdated: string;
}

export interface CompletedSubmission {
  id: number;
  name: string;
  framework: string;
  completionDate: string;
  score: number;
}

// Questionnaire service functions
const questionnaireService = {
  /**
   * Get all available questionnaire templates
   */
  getTemplates: (): Promise<ApiResponse<Template[]>> => {
    return api.get<Template[]>('/questionnaires/templates');
  },

  /**
   * Get a specific template by ID with all questions
   */
  getTemplateById: (id: number, page: number = 1, pageSize: number = 50): Promise<ApiResponse<TemplateDetail>> => {
    return api.get<TemplateDetail>(`/questionnaires/templates/${id}?page=${page}&pageSize=${pageSize}&loadQuestions=true`);
  },
  
  /**
   * Get a specific template by ID without loading questions (metadata only)
   */
  getTemplateMetadata: (id: number): Promise<ApiResponse<TemplateDetail>> => {
    return api.get<TemplateDetail>(`/questionnaires/templates/${id}?loadQuestions=false`);
  },

  /**
   * Get user's in-progress submissions
   */
  /**
   * Get user's in-progress submissions
   * Requires authentication - returns 401 if not logged in
   */
  getInProgressSubmissions: (): Promise<ApiResponse<InProgressSubmission[]>> => {
    return api.get<InProgressSubmission[]>('/questionnaires/submissions/in-progress');
  },

  /**
   * Get user's completed submissions
   */
  /**
   * Get user's completed submissions  
   * Requires authentication - returns 401 if not logged in
   */
  getCompletedSubmissions: (): Promise<ApiResponse<CompletedSubmission[]>> => {
    return api.get<CompletedSubmission[]>('/questionnaires/submissions/completed');
  },

  /**
   * Get a specific submission by ID with template and answers
   */
  getSubmissionById: (id: number): Promise<ApiResponse<Submission>> => {
    return api.get<Submission>(`/questionnaires/submissions/${id}`);
  },

  /**
   * Start a new questionnaire submission
   */
  startSubmission: (templateId: number): Promise<ApiResponse<Submission>> => {
    return api.post<Submission>('/questionnaires/submissions', { templateId });
  },

  /**
   * Update a submission with answers
   */
  updateSubmission: (id: number, answers: Answer[]): Promise<ApiResponse<void>> => {
    return api.put<void>(`/questionnaires/submissions/${id}`, { answers });
  },

  /**
   * Submit a completed questionnaire for analysis
   */
  submitQuestionnaire: (id: number): Promise<ApiResponse<Submission>> => {
    return api.post<Submission>(`/questionnaires/submissions/${id}/submit`);
  }
};

export default questionnaireService;
