import React, { useEffect, useState } from 'react';
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

export default SessionTimeoutGuard;