import profileService, { 
  ProfileUpdateData,
  PasswordChangeData
} from './profile.service';
import authTokens from '../utils/auth-tokens';
import { ApiResponse } from './api';

/**
 * A wrapper around the profile service that ensures tokens are fresh
 * before making calls to the profile APIs
 */
export const profileWrapper = {
  /**
   * Ensure a fresh token before making a profile service API call
   */
  ensureFreshToken: async (): Promise<boolean> => {
    // Use the centralized ensureFreshToken function in auth-tokens module
    return authTokens.ensureFreshToken();
  },
  
  /**
   * Update user profile information with token refresh
   */
  updateProfile: async (profileData: ProfileUpdateData): Promise<ApiResponse<any>> => {
    await profileWrapper.ensureFreshToken();
    return profileService.updateProfile(profileData);
  },

  /**
   * Change user password with token refresh
   */
  changePassword: async (passwordData: PasswordChangeData): Promise<ApiResponse<{ message: string }>> => {
    await profileWrapper.ensureFreshToken();
    return profileService.changePassword(passwordData);
  }
};

export default profileWrapper;
