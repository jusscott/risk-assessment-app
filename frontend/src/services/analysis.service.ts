import api, { ApiResponse } from './api';

// Types
export interface AnalysisResult {
  id: number;
  submissionId: number;
  score: number;
  status: 'processing' | 'completed' | 'failed';
  summary: string;
  createdAt: string;
  completedAt?: string;
  categories: Array<{
    name: string;
    score: number;
    findings: Array<{
      description: string;
      impact: 'critical' | 'high' | 'medium' | 'low';
      recommendation: string;
    }>;
  }>;
  recommendations: string[];
}

export interface AnalysisRequest {
  submissionId: number;
  framework?: string;
}

// Service methods
export const analysisService = {
  /**
   * Request a new analysis for a questionnaire submission
   */
  requestAnalysis: async (data: AnalysisRequest): Promise<AnalysisResult> => {
    try {
      const response = await api.post<AnalysisResult>('/analysis/process', data);
      return response.data;
    } catch (error) {
      console.error('Error requesting analysis:', error);
      throw error;
    }
  },

  /**
   * Get all analyses for the current user
   */
  getAnalyses: async (): Promise<AnalysisResult[]> => {
    try {
      const response = await api.get<AnalysisResult[]>('/analysis');
      return response.data;
    } catch (error) {
      console.error('Error fetching analyses:', error);
      throw error;
    }
  },

  /**
   * Get a specific analysis by ID
   */
  getAnalysisById: async (analysisId: number): Promise<AnalysisResult> => {
    try {
      const response = await api.get<AnalysisResult>(`/analysis/${analysisId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching analysis ${analysisId}:`, error);
      throw error;
    }
  },

  /**
   * Get analyses for a specific submission
   */
  getAnalysesBySubmission: async (submissionId: number): Promise<AnalysisResult[]> => {
    try {
      const response = await api.get<AnalysisResult[]>(`/analysis/submission/${submissionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching analyses for submission ${submissionId}:`, error);
      throw error;
    }
  },

  /**
   * Generate a report from an analysis
   */
  generateReport: async (analysisId: number): Promise<ApiResponse<{ reportId: number }>> => {
    try {
      const response = await api.post<{ reportId: number }>(`/analysis/${analysisId}/report`);
      return response;
    } catch (error) {
      console.error(`Error generating report for analysis ${analysisId}:`, error);
      throw error;
    }
  }
};

export default analysisService;
