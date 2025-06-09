/**
 * Activity Tracker
 * 
 * This service tracks user activity to support session timeout functionality.
 * It monitors user interactions and stores the timestamp of the last activity.
 * The timestamps are sent with API requests to allow the backend to enforce
 * session timeouts after periods of inactivity.
 */

// Events to track for user activity
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'input',
  'change'
];

// Session timeout duration in milliseconds (15 minutes)
export const SESSION_TIMEOUT = 15 * 60 * 1000;

class ActivityTracker {
  private lastActivity: number = Date.now();
  private activityListeners: Array<() => void> = [];
  private isInitialized: boolean = false;

  /**
   * Initialize the activity tracker
   * Sets up event listeners for user activity
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Set initial timestamp
    this.updateLastActivity();

    // Add event listeners to track user activity
    ACTIVITY_EVENTS.forEach(eventType => {
      window.addEventListener(eventType, this.handleUserActivity, { passive: true });
    });

    // Set up periodic check for inactivity
    setInterval(this.checkInactivity, 60000); // Check every minute

    this.isInitialized = true;
    console.log('Activity tracker initialized');
  }

  /**
   * Initialize the activity tracker (alias for initialize)
   * @deprecated Use initialize() instead
   */
  public init(): void {
    this.initialize();
  }
  
  /**
   * Clean up event listeners
   */
  public cleanup(): void {
    if (!this.isInitialized) {
      return;
    }

    ACTIVITY_EVENTS.forEach(eventType => {
      window.removeEventListener(eventType, this.handleUserActivity);
    });

    this.isInitialized = false;
    this.activityListeners = [];
  }
  
  /**
   * Clean up event listeners (alias for cleanup)
   * @deprecated Use cleanup() instead
   */
  public destroy(): void {
    this.cleanup();
  }

  /**
   * Handle user activity events
   */
  private handleUserActivity = (): void => {
    this.updateLastActivity();
  };

  /**
   * Update the last activity timestamp
   */
  public updateLastActivity(): void {
    this.lastActivity = Date.now();
    // Store timestamp in localStorage for persistence across page loads
    localStorage.setItem('lastActivityTimestamp', this.lastActivity.toString());
  }
  
  /**
   * Update the last activity timestamp (alias for updateLastActivity)
   * @deprecated Use updateLastActivity() instead
   */
  public updateActivity(): void {
    this.updateLastActivity();
  }

  /**
   * Get the last activity timestamp
   */
  public getLastActivity(): number {
    return this.lastActivity;
  }

  /**
   * Add a listener for inactivity events
   */
  public addInactivityListener(callback: () => void): void {
    this.activityListeners.push(callback);
  }

  /**
   * Remove a listener for inactivity events
   */
  public removeInactivityListener(callback: () => void): void {
    this.activityListeners = this.activityListeners.filter(
      listener => listener !== callback
    );
  }

  /**
   * Check for inactivity and notify listeners if needed
   */
  private checkInactivity = (): void => {
    const now = Date.now();
    const inactiveTime = now - this.lastActivity;

    if (inactiveTime >= SESSION_TIMEOUT) {
      console.log(`User inactive for ${Math.round(inactiveTime / 1000 / 60)} minutes - triggering forced logout`);
      
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
  };

  /**
   * Check if the user is currently inactive
   */
  public isInactive(): boolean {
    return (Date.now() - this.lastActivity) >= SESSION_TIMEOUT;
  }

  /**
   * Get the remaining active time in milliseconds
   */
  public getRemainingActiveTime(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, SESSION_TIMEOUT - elapsed);
  }
  
  /**
   * Validate activity status on application initialization
   * Checks if there was any stored activity timestamp and validates it
   * @returns true if a valid activity timestamp was found, false otherwise
   */
  public validateActivityOnInit(): boolean {
    // Check for any stored timestamp in localStorage
    const storedTimestamp = localStorage.getItem('lastActivityTimestamp');
    
    if (storedTimestamp) {
      try {
        const timestamp = parseInt(storedTimestamp, 10);
        // Only use stored timestamp if it's valid and not expired
        if (!isNaN(timestamp) && (Date.now() - timestamp) < SESSION_TIMEOUT) {
          this.lastActivity = timestamp;
          console.log('Restored activity timestamp from storage');
          return true;
        } else {
          // If expired, update to current time
          this.updateLastActivity();
          console.log('Stored activity timestamp was expired, using current time');
          return false;
        }
      } catch (e) {
        console.error('Error parsing stored activity timestamp:', e);
        this.updateLastActivity();
        return false;
      }
    } else {
      this.updateLastActivity();
      return false;
    }
  }

  /**
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

export default activityTracker;
