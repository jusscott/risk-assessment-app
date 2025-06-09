import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to extract user data from API Gateway headers
 * This allows the Auth service to receive user context set by the API Gateway's validation
 */
export const extractUserFromApiGateway = (req: Request, res: Response, next: NextFunction): void => {
  // If we already have a user object (set by our own auth middleware), use that
  if (req.user) {
    return next();
  }

  // Check for the special header from API Gateway
  const userDataHeader = req.headers['x-auth-user-data'];
  
  if (userDataHeader) {
    try {
      // Parse the user data from the header
      const userData = JSON.parse(userDataHeader as string);
      
      // Set the user object on the request
      req.user = userData;
      
      // Log that we received user data from API Gateway
      console.debug('User data received from API Gateway:', { userId: userData.id });
    } catch (error) {
      // If there's an error parsing the user data, log it but don't fail the request
      console.error('Error parsing user data from API Gateway header:', error);
    }
  }
  
  next();
};
