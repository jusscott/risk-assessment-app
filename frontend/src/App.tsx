import React, { useEffect, useCallback, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
// Import debug logger for questionnaire debugging
import './debug-logger.js';
import initResizeObserverFix from './utils/resize-observer-fix';
import { initializeAuth, getCurrentUser, logout } from './store/slices/authSlice';
import { useAppDispatch } from './store';
import { useAuthNavigation } from './hooks/useAuthNavigation';
import { authEvents } from './services/auth-events';
import activityTracker from './services/activity-tracker';

// Layout Components
import MainLayout from './components/layout/MainLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Import pages
import Dashboard from './pages/Dashboard';
import AdvancedDashboard from './pages/AdvancedDashboard';
import Questionnaires from './pages/Questionnaires';
import QuestionnaireDetail from './pages/QuestionnaireDetail';
import Reports from './pages/Reports';
import Analysis from './pages/Analysis';
import Plans from './pages/Plans';
import Subscriptions from './pages/Subscriptions';
import Invoices from './pages/Invoices';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import CustomRules from './pages/CustomRules';

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Use our custom auth navigation hook instead of direct isAuthenticated check
  // This hook will handle redirects when auth state changes
  const { isAuthenticated } = useAuthNavigation();
  
  // Enhanced session monitoring
  const [sessionValid, setSessionValid] = useState(true);

  // Initialize ResizeObserver fix to prevent errors during auth flow
  useEffect(() => {
    initResizeObserverFix();
    console.log('ResizeObserver fix initialized');
  }, []);
  
  // Enhanced session timeout handler
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
  }, [isAuthenticated, handleSessionTimeout]);

  useEffect(() => {
    // Initialize auth state from localStorage
    dispatch(initializeAuth());
    
    // Always check for an existing activity timestamp, even before authentication check
    const storedTimestamp = localStorage.getItem('lastActivityTimestamp');
    const now = Date.now();
    
    if (storedTimestamp) {
      const lastActivity = parseInt(storedTimestamp, 10);
      // Check if the session should be expired due to inactivity (15 minutes)
      if (!isNaN(lastActivity) && (now - lastActivity > 15 * 60 * 1000)) {
        console.log(`Session expired due to inactivity. Last activity was ${Math.round((now - lastActivity) / 1000 / 60)} minutes ago.`);
        dispatch(logout());
        return;
      }
    }
    
    // Validate activity before proceeding
    // If the user has been inactive too long, log them out
    if (isAuthenticated && !activityTracker.validateActivityOnInit()) {
      console.log('Session expired due to inactivity');
      dispatch(logout());
      return;
    }
    
    // If we have a token, fetch the current user
    if (isAuthenticated) {
      dispatch(getCurrentUser());
      
      // Initialize activity tracking
      activityTracker.initialize();
      
      // Register for inactivity events
      activityTracker.addInactivityListener(handleSessionTimeout);
    }
    
    // Subscribe to auth events
    const unsubscribe = authEvents.subscribeToLogout(() => {
      // When logout event is triggered from API service, dispatch logout action
      dispatch(logout());
    });
    
    // Cleanup subscription and activity tracker on component unmount
    return () => {
      unsubscribe();
      if (isAuthenticated) {
        activityTracker.removeInactivityListener(handleSessionTimeout);
        activityTracker.cleanup();
      }
    };
  }, [dispatch, isAuthenticated, handleSessionTimeout]);

  // Create a protected route wrapper component to reduce duplication
  const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
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
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes - using our wrapper component */}
        {/* Dashboard routes */}
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/dashboard/advanced" element={<ProtectedRoute element={<AdvancedDashboard />} />} />
        {/* Questionnaires pages require authentication */}
        <Route path="/questionnaires" element={<ProtectedRoute element={<Questionnaires />} />} />
        <Route path="/questionnaires/new" element={<ProtectedRoute element={<QuestionnaireDetail />} />} />
        <Route path="/questionnaires/frameworks" element={<ProtectedRoute element={<Questionnaires />} />} />
        <Route path="/questionnaires/:id" element={<ProtectedRoute element={<QuestionnaireDetail />} />} />
        <Route path="/reports" element={<ProtectedRoute element={<Reports />} />} />
        <Route path="/reports/issues" element={<ProtectedRoute element={<Reports />} />} />
        <Route path="/reports/:reportId" element={<ProtectedRoute element={<Reports />} />} />
        <Route path="/analysis/:analysisId" element={<ProtectedRoute element={<Analysis />} />} />
        <Route path="/rules" element={<ProtectedRoute element={<CustomRules />} />} />
        
        {/* User routes */}
        <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
        
        {/* Payment routes */}
        <Route path="/subscriptions" element={<ProtectedRoute element={<Subscriptions />} />} />
        <Route path="/plans" element={<ProtectedRoute element={<Plans />} />} />
        <Route path="/invoices" element={<ProtectedRoute element={<Invoices />} />} />
        <Route path="/checkout/:planId" element={<ProtectedRoute element={<Checkout />} />} />
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Box>
  );
};

export default App;
