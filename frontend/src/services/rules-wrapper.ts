import api, { ApiResponse } from './api';
import authTokens from '../utils/auth-tokens';

/**
 * Interface for custom rules
 */
export interface CustomRule {
  id: number;
  name: string;
  description: string;
  category: string;
  severity: number; // 1-5 scale
  condition: string;
  action: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

/**
 * A wrapper around the rules API endpoints that ensures tokens
 * are fresh before making calls
 */
export const rulesWrapper = {
  /**
   * Ensure a fresh token before making API calls
   */
  ensureFreshToken: async (): Promise<boolean> => {
    return authTokens.ensureFreshToken();
  },

  /**
   * Get all custom rules
   */
  fetchCustomRules: async (): Promise<ApiResponse<CustomRule[]>> => {
    await rulesWrapper.ensureFreshToken();
    return api.get<CustomRule[]>('/rules');
  },

  /**
   * Get a specific rule by ID
   */
  fetchRuleById: async (ruleId: number): Promise<ApiResponse<CustomRule>> => {
    await rulesWrapper.ensureFreshToken();
    return api.get<CustomRule>(`/rules/${ruleId}`);
  },

  /**
   * Create a new custom rule
   */
  createRule: async (rule: Omit<CustomRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<CustomRule>> => {
    await rulesWrapper.ensureFreshToken();
    return api.post<CustomRule>('/rules', rule);
  },

  /**
   * Update an existing custom rule
   */
  updateRule: async (ruleId: number, rule: Partial<CustomRule>): Promise<ApiResponse<CustomRule>> => {
    await rulesWrapper.ensureFreshToken();
    return api.put<CustomRule>(`/rules/${ruleId}`, rule);
  },

  /**
   * Delete a custom rule
   */
  deleteRule: async (ruleId: number): Promise<ApiResponse<void>> => {
    await rulesWrapper.ensureFreshToken();
    return api.delete<void>(`/rules/${ruleId}`);
  },

  /**
   * Toggle rule activation status
   */
  toggleRuleStatus: async (ruleId: number, isActive: boolean): Promise<ApiResponse<CustomRule>> => {
    await rulesWrapper.ensureFreshToken();
    return api.patch<CustomRule>(`/rules/${ruleId}/status`, { isActive });
  }
};

export default rulesWrapper;
