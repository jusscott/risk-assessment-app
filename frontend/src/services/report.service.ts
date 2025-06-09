import api, { ApiResponse } from './api';

// Types
export interface BrandingOptions {
  companyName?: string;
  companyLogo?: string;  // Base64 encoded or URL
  primaryColor?: string; // Hex code (e.g., "#336699")
  secondaryColor?: string;
  headerText?: string;
  footerText?: string;
  contactInfo?: string;
  includeLegalDisclaimer?: boolean;
}

export interface Report {
  id: number;
  title: string;
  createdAt: string;
  completedAt: string;
  status: string;
  score: number;
  summary: string;
  recommendations: string[];
  categories: { 
    name: string; 
    score: number;
  }[];
  framework?: string;
  criticalIssues?: number;
  highIssues?: number;
  mediumIssues?: number;
  branding?: BrandingOptions;
}

export interface ReportIssue {
  id: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  framework: string;
  control: string;
  reportId: number;
}

export interface ReportSharingLink {
  id: string;
  reportId: number;
  accessCode: string;
  expiresAt: string;
  isActive: boolean;
}

// Service methods
export const reportService = {
  /**
   * Get a list of all reports for the current user
   */
  getReports: async (): Promise<Report[]> => {
    try {
      const response = await api.get<Report[]>('/reports');
      return response.data;
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  /**
   * Get a specific report by ID
   */
  getReportById: async (reportId: number): Promise<Report> => {
    try {
      const response = await api.get<Report>(`/reports/detail/${reportId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Get issues for a specific report
   */
  getReportIssues: async (reportId: number): Promise<ReportIssue[]> => {
    try {
      const response = await api.get<ReportIssue[]>(`/reports/${reportId}/issues`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching issues for report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Download a report PDF
   * Returns a URL to download the report
   */
  getReportDownloadUrl: (reportId: number): string => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    return `${API_URL}/api/reports/${reportId}/download`;
  },

  /**
   * Create a sharing link for a report
   */
  createSharingLink: async (reportId: number, expiresInDays?: number): Promise<ReportSharingLink> => {
    try {
      const response = await api.post<ReportSharingLink>(`/reports/${reportId}/share`, {
        expiresInDays: expiresInDays || 7 // Default expiry of 7 days
      });
      return response.data;
    } catch (error) {
      console.error(`Error creating sharing link for report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a sharing link
   */
  deleteSharingLink: async (linkId: string): Promise<void> => {
    try {
      await api.delete(`/reports/share/${linkId}`);
    } catch (error) {
      console.error(`Error deleting sharing link ${linkId}:`, error);
      throw error;
    }
  },

  /**
   * Get all sharing links for a report
   */
  getSharingLinks: async (reportId: number): Promise<ReportSharingLink[]> => {
    try {
      const response = await api.get<ReportSharingLink[]>(`/reports/${reportId}/share`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching sharing links for report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Email a report to specific email addresses
   */
  emailReport: async (reportId: number, emails: string[]): Promise<ApiResponse<void>> => {
    try {
      const response = await api.post<void>(`/reports/${reportId}/email`, { emails });
      return response;
    } catch (error) {
      console.error(`Error emailing report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Update report branding options
   */
  updateBranding: async (reportId: number, branding: BrandingOptions): Promise<ApiResponse<Report>> => {
    try {
      const response = await api.put<Report>(`/reports/${reportId}/branding`, { branding });
      return response;
    } catch (error) {
      console.error(`Error updating branding for report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Get report branding options
   */
  getBranding: async (reportId: number): Promise<ApiResponse<BrandingOptions>> => {
    try {
      const response = await api.get<BrandingOptions>(`/reports/${reportId}/branding`);
      return response;
    } catch (error) {
      console.error(`Error fetching branding for report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * Generate a comparative report between two reports
   */
  generateComparativeReport: async (reportId1: number, reportId2: number): Promise<ApiResponse<Report>> => {
    try {
      const response = await api.post<Report>(`/reports/compare`, { 
        sourceReportId: reportId1, 
        targetReportId: reportId2 
      });
      return response;
    } catch (error) {
      console.error(`Error generating comparative report between ${reportId1} and ${reportId2}:`, error);
      throw error;
    }
  }
};

export default reportService;
