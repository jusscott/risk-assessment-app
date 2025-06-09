/**
 * Auth Events Service
 * 
 * This service creates a simple event system to handle authentication events
 * without creating circular dependencies between the store and API service.
 */

type AuthEventListener = () => void;

interface AuthEvents {
  onLogout: AuthEventListener[];
}

// Initialize events object
const events: AuthEvents = {
  onLogout: [],
};

// Export methods to subscribe to and trigger events
export const authEvents = {
  /**
   * Subscribe to authentication logout event
   * @param listener Callback function to execute when logout occurs
   * @returns Unsubscribe function
   */
  subscribeToLogout: (listener: AuthEventListener): (() => void) => {
    events.onLogout.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = events.onLogout.indexOf(listener);
      if (index > -1) {
        events.onLogout.splice(index, 1);
      }
    };
  },
  
  /**
   * Trigger logout event - called when user should be logged out
   * All subscribers will be notified
   */
  triggerLogout: (): void => {
    events.onLogout.forEach(listener => listener());
  },
};
