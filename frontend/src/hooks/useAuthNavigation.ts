import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { selectIsAuthenticated } from '../store/slices/authSlice';

/**
 * Custom hook to handle authentication-based navigation
 * 
 * Used to automatically navigate users to the appropriate routes
 * based on their authentication status
 */
export const useAuthNavigation = (redirectAuthenticatedTo: string = '/dashboard', redirectUnauthenticatedTo: string = '/login') => {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  useEffect(() => {
    console.log('--- useAuthNavigation running ---');
    console.log('Current path:', window.location.pathname);
    console.log('isAuthenticated:', isAuthenticated);
    
    // Check for questionnaire transition flag in sessionStorage
    const isTransitioningToQuestionnaire = sessionStorage.getItem('startingQuestionnaire');
    console.log('isTransitioningToQuestionnaire flag:', isTransitioningToQuestionnaire);
    
    // Log if we're in a questionnaire route
    const isQuestionnaireRoute = window.location.pathname.includes('/questionnaires');
    console.log('isQuestionnaireRoute:', isQuestionnaireRoute);
    
    // NEW: Check if we're currently in the process of navigating to or from a questionnaire
    if (isTransitioningToQuestionnaire) {
      console.log('PREVENTING NAVIGATION: Questionnaire transition in progress');
      return; // Exit early, don't do any redirects
    }
    
    // If already on a questionnaire route, don't redirect
    if (isQuestionnaireRoute) {
      console.log('PREVENTING NAVIGATION: Already on a questionnaire route');
      return; // Exit early, don't do any redirects
    }
    
    // Detect if we're in the middle of a navigation transition via URL params
    const searchParams = new URLSearchParams(window.location.search);
    const hasPendingAction = searchParams.has('pendingQuestionnaireId');
    console.log('hasPendingAction from URL:', hasPendingAction);
    
    // Skip navigation if we're in the middle of a questionnaire navigation flow via URL
    if (hasPendingAction) {
      console.log('PREVENTING NAVIGATION: Pending questionnaire action in URL');
      return;
    }
    
    // If not authenticated, redirect to login EXCEPT for specific public routes
    const publicRoutes = [
      '/register',
      '/login',
      '/'
    ];
    
    // Check if the current path is a public route or starts with a public path
    const isPublicRoute = publicRoutes.some(route => 
      window.location.pathname === route || 
      (route !== '/' && window.location.pathname.startsWith(route + '/'))
    );
    console.log('isPublicRoute:', isPublicRoute);
    
    // Password reset routes are also public
    const isPasswordResetRoute = window.location.pathname.includes('/password-reset');
    console.log('isPasswordResetRoute:', isPasswordResetRoute);
    
    if (!isAuthenticated && !isPublicRoute && !isPasswordResetRoute) {
      console.log('REDIRECTING: Not authenticated on protected route, redirecting to login');
      navigate(redirectUnauthenticatedTo);
      return; // Exit after navigation
    }
    
    // If authenticated and on auth-only pages, redirect to dashboard
    // But ONLY if not in the middle of a questionnaire flow
    const isAuthOnlyRoute = (
      window.location.pathname === '/login' || 
      window.location.pathname === '/register' || 
      window.location.pathname === '/'
    );
    console.log('isAuthOnlyRoute:', isAuthOnlyRoute);
    
    if (isAuthenticated && isAuthOnlyRoute) {
      console.log('REDIRECTING: Authenticated on auth-only route, redirecting to dashboard');
      navigate(redirectAuthenticatedTo);
      return; // Exit after navigation
    }
    
    console.log('--- useAuthNavigation completed without redirects ---');
  }, [isAuthenticated, navigate, redirectAuthenticatedTo, redirectUnauthenticatedTo]);
  
  return { isAuthenticated };
};

// Add empty export to make this file a module
export default useAuthNavigation;
