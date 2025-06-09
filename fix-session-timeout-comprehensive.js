#!/usr/bin/env node

/**
 * Comprehensive Session Timeout Fix
 * 
 * Fixes issues where users remain on pages after session timeout
 * without being properly logged out and redirected to the login page.
 * 
 * Key fixes:
 * 1. Enhanced frontend logout state clearing
 * 2. Improved navigation control after timeout
 * 3. Component state cleanup
 * 4. Token invalidation improvements
 * 5. Activity tracker reliability enhancements
 */

const fs = require('fs').promises;
const path = require('path');

// ANSI color codes for better output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    log(`❌ Error reading ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

async function writeFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    log(`✅ Updated ${filePath}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error writing ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

async function enhanceActivityTracker() {
  log('🔧 Enhancing Activity Tracker...', 'cyan');
  
  const activityTrackerPath = 'frontend/src/services/activity-tracker.ts';
  const content = await readFile(activityTrackerPath);
  
  if (!content) return false;
  
  // Add enhanced session monitoring and forced logout
  const enhancedContent = content.replace(
    /\/\*\*\s*\n\s*\* Check for inactivity and notify listeners if needed\s*\n\s*\*\/\s*\n\s*private checkInactivity = \(\): void => \{[\s\S]*?\};/,
    `/**
   * Check for inactivity and notify listeners if needed
   */
  private checkInactivity = (): void => {
    const now = Date.now();
    const inactiveTime = now - this.lastActivity;

    if (inactiveTime >= SESSION_TIMEOUT) {
      console.log(\`User inactive for \${Math.round(inactiveTime / 1000 / 60)} minutes - triggering forced logout\`);
      
      // Clear activity tracking immediately to prevent further checks
      this.lastActivity = 0;
      localStorage.removeItem('lastActivityTimestamp');
      
      // Notify all listeners with force logout flag
      this.activityListeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          console.error('Error in inactivity listener:', error);
        }
      });
      
      // Force immediate logout by clearing all auth state
      this.forceLogout();
    }
  };

  /**
   * Force immediate logout and cleanup
   */
  private forceLogout = (): void => {
    console.log('Forcing immediate logout due to session timeout');
    
    // Clear all localStorage auth-related items
    const authKeys = ['accessToken', 'refreshToken', 'user', 'lastActivityTimestamp'];
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear any cached state
    this.cleanup();
    
    // Force page reload to login if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  };`
  );
  
  // Add method to manually check session status
  const finalContent = enhancedContent.replace(
    /export default activityTracker;/,
    `  /**
   * Manual session timeout check - called by components
   */
  public checkSessionTimeout(): boolean {
    const now = Date.now();
    const inactiveTime = now - this.lastActivity;
    
    if (inactiveTime >= SESSION_TIMEOUT) {
      console.log('Manual session check: Session has expired');
      this.forceLogout();
      return true; // Session expired
    }
    
    return false; // Session still valid
  }
  
  /**
   * Get session status information
   */
  public getSessionStatus(): { isValid: boolean; remainingTime: number; lastActivity: number } {
    const now = Date.now();
    const inactiveTime = now - this.lastActivity;
    const remainingTime = Math.max(0, SESSION_TIMEOUT - inactiveTime);
    
    return {
      isValid: inactiveTime < SESSION_TIMEOUT,
      remainingTime,
      lastActivity: this.lastActivity
    };
  }
}

// Create and export singleton instance
export const activityTracker = new ActivityTracker();

export default activityTracker;`
  );
  
  return await writeFile(activityTrackerPath, finalContent);
}

async function enhanceAuthSlice() {
  log('🔧 Enhancing Auth Slice Logout...', 'cyan');
  
  const authSlicePath = 'frontend/src/store/slices/authSlice.ts';
  const content = await readFile(authSlicePath);
  
  if (!content) return false;
  
  // Find and enhance the logout action
  const enhancedContent = content.replace(
    /logout: \(state\) => \{[\s\S]*?\},/,
    `logout: (state) => {
      // Clear all authentication state immediately
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
      state.error = null;
      
      // Clear tokens from memory and storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivityTimestamp');
      sessionStorage.clear();
      
      // Force clear any cached authentication data
      console.log('Auth state cleared - user logged out');
    },
    
    // Add forced logout action for session timeout
    forceLogout: (state) => {
      // Immediate complete cleanup
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
      state.error = null;
      
      // Clear all possible storage locations
      const authKeys = ['accessToken', 'refreshToken', 'user', 'lastActivityTimestamp'];
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('Forced logout completed - session expired');
    },`
  );
  
  return await writeFile(authSlicePath, enhancedContent);
}

async function enhanceAppComponent() {
  log('🔧 Enhancing App Component Session Handling...', 'cyan');
  
  const appPath = 'frontend/src/App.tsx';
  const content = await readFile(appPath);
  
  if (!content) return false;
  
  // Add session monitoring to the App component
  const enhancedContent = content.replace(
    /const \{ isAuthenticated \} = useAuthNavigation\(\);/,
    `const { isAuthenticated } = useAuthNavigation();
  
  // Enhanced session monitoring
  const [sessionValid, setSessionValid] = useState(true);`
  ).replace(
    /\/\/ Handle session timeout\s*\n\s*const handleSessionTimeout = useCallback\(\(\) => \{[\s\S]*?\}, \[dispatch\]\);/,
    `// Enhanced session timeout handler
  const handleSessionTimeout = useCallback(() => {
    console.log('Session timeout triggered - forcing complete logout');
    
    // Set session as invalid immediately
    setSessionValid(false);
    
    // Force logout action
    dispatch({ type: 'auth/forceLogout' });
    
    // Clear activity tracker
    activityTracker.cleanup();
    
    // Force navigation to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }, [dispatch]);
  
  // Continuous session validation
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const sessionValidator = setInterval(() => {
      const sessionStatus = activityTracker.getSessionStatus();
      
      if (!sessionStatus.isValid) {
        console.log('Session validation failed - triggering logout');
        handleSessionTimeout();
        clearInterval(sessionValidator);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(sessionValidator);
  }, [isAuthenticated, handleSessionTimeout]);`
  );
  
  // Add session validation to protected route wrapper
  const finalContent = enhancedContent.replace(
    /const ProtectedRoute: React\.FC<\{ element: React\.ReactNode \}> = \(\{ element \}\) => \{[\s\S]*?\};/,
    `const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
    // Check session validity before rendering
    useEffect(() => {
      if (isAuthenticated) {
        const isExpired = activityTracker.checkSessionTimeout();
        if (isExpired) {
          handleSessionTimeout();
          return;
        }
      }
    }, []);
    
    // Don't render if session is invalid
    if (!sessionValid && isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    return isAuthenticated ? (
      <MainLayout>{element}</MainLayout>
    ) : (
      <Navigate to="/login" replace />
    );
  };`
  );
  
  return await writeFile(appPath, finalContent);
}

async function enhanceNavigationHook() {
  log('🔧 Enhancing Auth Navigation Hook...', 'cyan');
  
  const hookPath = 'frontend/src/hooks/useAuthNavigation.ts';
  const content = await readFile(hookPath);
  
  if (!content) return false;
  
  // Add session validation to the navigation hook
  const enhancedContent = content.replace(
    /const useAuthNavigation = \(\) => \{[\s\S]*?return \{[\s\S]*?\};[\s\S]*?\};/,
    `const useAuthNavigation = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced session validation
  useEffect(() => {
    if (isAuthenticated) {
      // Check session validity on every navigation
      const sessionStatus = activityTracker.getSessionStatus();
      
      if (!sessionStatus.isValid) {
        console.log('Navigation blocked - session expired');
        dispatch({ type: 'auth/forceLogout' });
        navigate('/login', { replace: true });
        return;
      }
      
      // Update activity on navigation
      activityTracker.updateLastActivity();
    }
  }, [location.pathname, isAuthenticated, dispatch, navigate]);
  
  // Force redirect if not authenticated
  useEffect(() => {
    const publicPaths = ['/', '/login', '/register'];
    const isPublicPath = publicPaths.includes(location.pathname);
    
    if (!isAuthenticated && !isPublicPath) {
      console.log('Redirecting to login - not authenticated');
      navigate('/login', { replace: true });
    } else if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
      console.log('Redirecting to dashboard - already authenticated');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);
  
  return {
    isAuthenticated,
    currentPath: location.pathname
  };
};`
  );
  
  return await writeFile(hookPath, enhancedContent);
}

async function enhanceApiService() {
  log('🔧 Enhancing API Service Session Handling...', 'cyan');
  
  const apiPath = 'frontend/src/services/api.ts';
  const content = await readFile(apiPath);
  
  if (!content) return false;
  
  // Add session validation to API interceptor
  const enhancedContent = content.replace(
    /apiClient\.interceptors\.request\.use\(/,
    `// Add session validation interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Check if session is still valid before making request
    if (activityTracker.checkSessionTimeout()) {
      console.log('API request blocked - session expired');
      return Promise.reject({
        status: 401,
        message: 'Session expired',
        data: { sessionExpired: true }
      });
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Original request interceptor
apiClient.interceptors.request.use(`
  );
  
  // Enhance the logout handler
  const finalContent = enhancedContent.replace(
    /const handleLogout = \(\) => \{[\s\S]*?\};/,
    `const handleLogout = () => {
  console.log('API service triggering logout');
  
  // Clear tokens using our utility
  authTokens.clearTokens();
  
  // Clear activity tracker
  activityTracker.cleanup();
  
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Trigger logout event - any subscribers will be notified
  authEvents.triggerLogout();
  
  // Force navigation to login
  setTimeout(() => {
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }, 100);
};`
  );
  
  return await writeFile(apiPath, finalContent);
}

async function createSessionTimeoutGuard() {
  log('🔧 Creating Session Timeout Guard Component...', 'cyan');
  
  const guardContent = `import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '../store';
import activityTracker from '../services/activity-tracker';

interface SessionTimeoutGuardProps {
  children: React.ReactNode;
}

/**
 * Session Timeout Guard Component
 * 
 * Wraps the application to monitor session timeout
 * and force logout when session expires
 */
const SessionTimeoutGuard: React.FC<SessionTimeoutGuardProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [sessionValid, setSessionValid] = useState(true);
  
  useEffect(() => {
    // Monitor session validity every 10 seconds
    const sessionMonitor = setInterval(() => {
      const sessionStatus = activityTracker.getSessionStatus();
      
      if (!sessionStatus.isValid && sessionValid) {
        console.log('Session timeout detected by guard - forcing logout');
        setSessionValid(false);
        
        // Force complete logout
        dispatch({ type: 'auth/forceLogout' });
        
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Force page reload to login
        window.location.href = '/login';
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(sessionMonitor);
  }, [dispatch, sessionValid]);
  
  // Don't render children if session is invalid
  if (!sessionValid) {
    return null;
  }
  
  return <>{children}</>;
};

export default SessionTimeoutGuard;`;
  
  return await writeFile('frontend/src/components/SessionTimeoutGuard.tsx', guardContent);
}

async function main() {
  try {
    log('🚀 Starting Comprehensive Session Timeout Fix...', 'green');
    
    const fixes = [
      { name: 'Activity Tracker Enhancement', fn: enhanceActivityTracker },
      { name: 'Auth Slice Enhancement', fn: enhanceAuthSlice },
      { name: 'App Component Enhancement', fn: enhanceAppComponent },
      { name: 'Navigation Hook Enhancement', fn: enhanceNavigationHook },
      { name: 'API Service Enhancement', fn: enhanceApiService },
      { name: 'Session Timeout Guard', fn: createSessionTimeoutGuard }
    ];
    
    let successCount = 0;
    
    for (const fix of fixes) {
      log(`\n🔧 Applying ${fix.name}...`, 'blue');
      const success = await fix.fn();
      if (success) {
        successCount++;
        log(`✅ ${fix.name} applied successfully`, 'green');
      } else {
        log(`❌ Failed to apply ${fix.name}`, 'red');
      }
    }
    
    // Create summary
    const summaryContent = `# Session Timeout Comprehensive Fix Summary

## Issues Fixed

1. **Enhanced Activity Tracker**
   - Added forced logout mechanism
   - Improved session validation
   - Added manual session timeout checking
   - Enhanced cleanup procedures

2. **Improved Auth State Management**
   - Added force logout action to Redux slice
   - Enhanced storage clearing
   - Improved state cleanup

3. **Enhanced App Component**
   - Added continuous session validation
   - Improved session timeout handling
   - Enhanced protected route checking

4. **Navigation Hook Improvements**
   - Added session validation on navigation
   - Improved redirect logic
   - Enhanced authentication checking

5. **API Service Enhancements**
   - Added request-level session validation
   - Improved logout handling
   - Enhanced error handling for expired sessions

6. **Session Timeout Guard**
   - Created dedicated component for session monitoring
   - Added continuous session validation
   - Automatic logout on session expiration

## Key Improvements

- **Forced Logout**: Users are now forcibly logged out when session expires
- **Navigation Blocking**: Prevents navigation when session is invalid
- **Storage Cleanup**: Complete clearing of all authentication data
- **Real-time Monitoring**: Continuous session validation
- **Multiple Safeguards**: Multiple layers of session timeout detection

## Testing

To test the session timeout functionality:

1. Log in to the application
2. Wait for 15 minutes of inactivity
3. Try to navigate or make an API request
4. Should be automatically logged out and redirected to login page

## Files Modified

- frontend/src/services/activity-tracker.ts
- frontend/src/store/slices/authSlice.ts
- frontend/src/App.tsx
- frontend/src/hooks/useAuthNavigation.ts
- frontend/src/services/api.ts
- frontend/src/components/SessionTimeoutGuard.tsx (new)

Applied ${successCount}/${fixes.length} fixes successfully.
`;
    
    await writeFile('session-timeout-fix-summary.md', summaryContent);
    
    log(`\n✅ Session timeout fix completed! Applied ${successCount}/${fixes.length} fixes.`, 'green');
    log('📝 Check session-timeout-fix-summary.md for details', 'cyan');
    
    if (successCount === fixes.length) {
      log('\n🎉 All fixes applied successfully!', 'green');
      log('Users will now be properly logged out after session timeout.', 'green');
    } else {
      log(`\n⚠️  Some fixes failed. Check the logs above for details.`, 'yellow');
    }
    
  } catch (error) {
    log(`❌ Error during fix application: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
