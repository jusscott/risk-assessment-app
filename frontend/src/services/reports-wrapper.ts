import reportService, { 
  Report, 
  ReportIssue, 
  ReportSharingLink,
  BrandingOptions
} from './report.service';
import api from './api';
import authTokens from '../utils/auth-tokens';
import { ApiResponse } from './api';

/**
 * Analysis data and rule result interfaces
 */
export interface AnalysisData {
  id: number;
  name: string;
  score: number;
  riskScore: number;
  riskLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface RuleResult {
  id: number;
  compliant: boolean;
  message: string;
  rule: {
    id: number;
    name: string;
    category: string;
    severity: number;
  };
}

/**
 * A wrapper around the report service that ensures tokens are fresh
 * before making calls to the report APIs
 */
export const reportsWrapper = {
  /**
   * Ensure a fresh token before making a report service API call
   */
  ensureFreshToken: async (): Promise<boolean> => {
    // Use the centralized ensureFreshToken function in auth-tokens module
    return authTokens.ensureFreshToken();
  },
  
  /**
   * Get all reports for the current user with token refresh
   */
  getReports: async (): Promise<Report[]> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.getReports();
  },

  /**
   * Get a specific report by ID with token refresh
   */
  getReportById: async (reportId: number): Promise<Report> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.getReportById(reportId);
  },

  /**
   * Get issues for a specific report with token refresh
   */
  getReportIssues: async (reportId: number): Promise<ReportIssue[]> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.getReportIssues(reportId);
  },

  /**
   * Get URL to download report with token refresh
   */
  getReportDownloadUrl: async (reportId: number): Promise<string> => {
    // Ensure token is fresh even though this function technically just builds a URL
    // The URL will include the token which needs to be valid
    await reportsWrapper.ensureFreshToken();
    return reportService.getReportDownloadUrl(reportId);
  },

  /**
   * Create a sharing link for a report with token refresh
   */
  createSharingLink: async (reportId: number, expiresInDays?: number): Promise<ReportSharingLink> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.createSharingLink(reportId, expiresInDays);
  },

  /**
   * Delete a sharing link with token refresh
   */
  deleteSharingLink: async (linkId: string): Promise<void> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.deleteSharingLink(linkId);
  },

  /**
   * Get all sharing links for a report with token refresh
   */
  getSharingLinks: async (reportId: number): Promise<ReportSharingLink[]> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.getSharingLinks(reportId);
  },

  /**
   * Email a report to specific email addresses with token refresh
   */
  emailReport: async (reportId: number, emails: string[]): Promise<ApiResponse<void>> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.emailReport(reportId, emails);
  },

  /**
   * Fetch analysis data for dashboard
   */
  fetchAnalysisData: async (): Promise<ApiResponse<AnalysisData[]>> => {
    await reportsWrapper.ensureFreshToken();
    return api.get<AnalysisData[]>('/analysis/dashboard');
  },

  /**
   * Fetch rule evaluation results for a specific analysis
   */
  fetchRuleResults: async (analysisId: number): Promise<ApiResponse<RuleResult[]>> => {
    await reportsWrapper.ensureFreshToken();
    return api.get<RuleResult[]>(`/analysis/${analysisId}/rules`);
  },
  
  /**
   * Update branding options for a report
   */
  updateBranding: async (reportId: number, branding: BrandingOptions): Promise<ApiResponse<Report>> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.updateBranding(reportId, branding);
  },

  /**
   * Get branding options for a report
   */
  getBranding: async (reportId: number): Promise<ApiResponse<BrandingOptions>> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.getBranding(reportId);
  },

  /**
   * Generate a comparative report between two reports
   */
  generateComparativeReport: async (reportId1: number, reportId2: number): Promise<ApiResponse<Report>> => {
    await reportsWrapper.ensureFreshToken();
    return reportService.generateComparativeReport(reportId1, reportId2);
  }
};

export default reportsWrapper;
