// Temporary debugging script to log errors to console
(function() {
  // Store original console.error method
  const originalError = console.error;
  
  // Override console.error to provide more detailed debugging
  console.error = function(...args) {
    // Call original method
    originalError.apply(console, args);
    
    // Add enhanced error logging
    if (args[0] === 'API Error Response:') {
      console.log('%c⚡ DETAILED API ERROR INFO ⚡', 'background: #ffcc00; color: #333; font-weight: bold; padding: 4px;');
      console.log('Status:', args[1]?.status);
      console.log('URL:', args[1]?.url);
      console.log('Headers:', args[1]?.headers);
      console.log('Full Error Object:', args[1]);
    }
  };
  
  // Monitor questionnaire service calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    if (args[0].includes('/questionnaires/')) {
      console.log('%c🔍 QUESTIONNAIRE API REQUEST 🔍', 'background: #4285f4; color: white; font-weight: bold; padding: 4px;');
      console.log('URL:', args[0]);
      console.log('Method:', args[1]?.method);
      console.log('Headers:', args[1]?.headers);
      console.log('Body:', args[1]?.body ? JSON.parse(args[1].body) : null);
    }
    return originalFetch.apply(this, args);
  };
  
  // Modify the Questionnaires component's handleStartQuestionnaire function
  window.addEventListener('load', function() {
    setTimeout(() => {
      // Find all buttons on the questionnaire page and filter for the ones with "Start" text
      const allButtons = document.querySelectorAll('button');
      const startButtons = Array.from(allButtons).filter(button => 
        button.textContent.trim() === 'Start'
      );
      
      if (startButtons.length > 0) {
        console.log('%c📝 FOUND START BUTTONS 📝', 'background: #0f9d58; color: white; font-weight: bold; padding: 4px;');
        console.log('Button count:', startButtons.length);
        
        // Monitor clicks on these buttons
        startButtons.forEach(button => {
          button.addEventListener('click', function(e) {
            console.log('%c👆 START BUTTON CLICKED 👆', 'background: #db4437; color: white; font-weight: bold; padding: 4px;');
            console.log('Button text:', button.innerText);
            console.log('Auth status:', localStorage.getItem('token') ? 'Authenticated' : 'Not authenticated');
          });
        });
      }
    }, 2000); // Give the app time to render
  });
  
  console.log('%c🔧 Debug Logger Enabled 🔧', 'background: #673ab7; color: white; font-weight: bold; padding: 4px;');
})();
