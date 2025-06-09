/**
 * ResizeObserver Fix
 * 
 * This utility provides a fix for the common ResizeObserver error:
 * "ResizeObserver loop completed with undelivered notifications."
 * 
 * This error often occurs during rapid component unmounting/remounting,
 * particularly during auth flows like logout/login sequences.
 */

// Prevents ResizeObserver errors during rapid component changes
export const fixResizeObserverErrors = (): void => {
  // Store the original error function
  const originalError = window.console.error;
  
  // Override console.error to ignore specific ResizeObserver errors
  window.console.error = (...args: any[]): void => {
    // Check if the error is the ResizeObserver loop error
    if (args.length > 0 && 
        typeof args[0] === 'string' && 
        args[0].includes('ResizeObserver loop')) {
      // Ignore this specific error
      return;
    }
    
    // For all other errors, use the original error function
    originalError.apply(window.console, args);
  };
};

// Function to be called when app initializes
export const initResizeObserverFix = (): void => {
  // Apply the fix
  fixResizeObserverErrors();
  
  // Add a global error handler for ResizeObserver errors
  window.addEventListener('error', (event) => {
    // Check if the error is related to ResizeObserver
    if (event && event.message && event.message.includes('ResizeObserver loop')) {
      // Prevent the error from bubbling up
      event.stopImmediatePropagation();
    }
  }, true);
};

export default initResizeObserverFix;
