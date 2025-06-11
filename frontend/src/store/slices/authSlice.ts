import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService, { LoginCredentials, RegistrationData, AuthResponse } from '../../services/auth.service';
import activityTracker from '../../services/activity-tracker';

// Types
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  company?: string;
  createdAt?: string;
  organization?: {
    id: string;
    name: string;
    industry?: string;
    size?: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      console.log('🔐 Auth slice login thunk started');
      const response = await authService.login(credentials);
      
      // Type assertion to handle the double-wrapped response
      const responseData = response.data as any;
      
      console.log('✅ Login service response received:', {
        responseStructure: Object.keys(responseData || {}),
        hasDirectTokens: !!responseData.tokens,
        hasNestedData: !!responseData.data,
        nestedDataKeys: responseData.data ? Object.keys(responseData.data) : [],
        hasNestedTokens: !!responseData.data?.tokens,
        hasNestedUser: !!responseData.data?.user
      });
      
      // Handle double-wrapped response structure:
      // API Gateway wraps: { success: true, data: AuthResponse }
      // But AuthResponse is also wrapped: { success: true, data: { user, tokens } }
      // So we get: { success: true, data: { success: true, data: { user, tokens } } }
      
      let tokens: { accessToken: string; refreshToken: string; expiresIn: number };
      let user: AuthResponse['user'];
      
      if (responseData.data?.tokens && responseData.data?.user) {
        // Double-wrapped case (current backend behavior)
        tokens = responseData.data.tokens;
        user = responseData.data.user;
        console.log('🔍 Using double-wrapped response structure');
      } else if (responseData.tokens && responseData.user) {
        // Direct case (expected behavior)
        tokens = responseData.tokens;
        user = responseData.user;
        console.log('🔍 Using direct response structure');
      } else {
        console.error('❌ Unexpected response structure:', responseData);
        throw new Error('Invalid login response structure');
      }
      
      if (!tokens || !tokens.accessToken) {
        throw new Error('No tokens received from login response');
      }
      
      console.log('✅ Tokens found at:', {
        location: response.data.tokens ? 'response.data.tokens' : 'response.data.data.tokens',
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        accessTokenLength: tokens.accessToken?.length || 0
      });
      
      // Store the tokens in localStorage
      console.log('📝 Calling authService.setToken from auth slice...');
      authService.setToken(
        tokens.accessToken, 
        tokens.refreshToken
      );
      
      // Verify tokens were stored
      setTimeout(() => {
        const verifyToken = authService.getToken();
        console.log('🔍 Token verification from auth slice:', {
          tokenStoredSuccessfully: !!verifyToken,
          tokenLength: verifyToken?.length || 0,
          tokensMatch: verifyToken === tokens.accessToken
        });
      }, 50); // Allow time for storage to complete
      
      // Initialize user activity tracking
      activityTracker.updateLastActivity();
      
      // Format the response to match our state structure
      return {
        user: user,
        token: tokens.accessToken
      };
    } catch (error: any) {
      console.error('Login error in Redux slice:', error);
      
      // Handle different error formats that might come from the API layer
      let errorMessage = 'An unexpected error occurred during login';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.data?.error?.message) {
        errorMessage = error.data.error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error?.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (error?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegistrationData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      
      // Store the tokens in localStorage
      authService.setToken(
        response.data.tokens.accessToken, 
        response.data.tokens.refreshToken
      );
      
      // Format the response to match our state structure
      return {
        user: response.data.user,
        token: response.data.tokens.accessToken
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      
      // Remove the token from localStorage
      authService.removeToken();
      
      // Clean up activity tracking
      activityTracker.cleanup();
      
      // Clear activity timestamp
      localStorage.removeItem('lastActivityTimestamp');
      
      return;
    } catch (error: any) {
      // Even if the API call fails, we should still remove the token
      authService.removeToken();
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      // Only try to get user if we have a token
      if (!authService.isAuthenticated()) {
        return rejectWithValue('No token found');
      }
      
      const response = await authService.getCurrentUser();
      return response.data;
    } catch (error: any) {
      // If getting the current user fails, it likely means the token is invalid
      authService.removeToken();
      return rejectWithValue(error.message || 'Failed to get current user');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Initialize auth state from localStorage on app load
    initializeAuth: (state) => {
      const token = authService.getToken();
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string || 'Login failed';
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string || 'Registration failed';
      })
      
      // Logout
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Logout failed';
      })
      
      // getCurrentUser
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload as string || 'Failed to get current user';
      });
  },
});

export const { clearError, initializeAuth } = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
