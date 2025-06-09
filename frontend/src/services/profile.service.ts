import api, { ApiResponse } from './api';

// Types
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  company?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

// Profile service functions
const profileService = {
  /**
   * Update user profile information
   */
  updateProfile: (profileData: ProfileUpdateData): Promise<ApiResponse<any>> => {
    return api.put<any>('/auth/me', profileData);
  },

  /**
   * Change user password
   */
  changePassword: (passwordData: PasswordChangeData): Promise<ApiResponse<{ message: string }>> => {
    return api.post<{ message: string }>('/auth/change-password', passwordData);
  },
};

export default profileService;
