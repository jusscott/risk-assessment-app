import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/config';

const prisma = new PrismaClient();

/**
 * @desc Register a new user with organization
 * @route POST /register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, organizationName } = req.body;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
        },
      });
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
      },
    });

    // Create user with organization
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        organizationId: organization.id,
        role: 'ADMIN', // First user in org is admin
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Generate JWT tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + parseTimeToMs(config.jwt.refreshExpiresIn));

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organization: user.organization,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: parseTimeToMs(config.jwt.accessExpiresIn) / 1000, // Convert to seconds
        },
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred during registration',
      },
    });
  }
};

/**
 * @desc Authenticate user & get token
 * @route POST /login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // In both cases (user not found or invalid password), we want to:
    // 1. Return the same generic error message (for security)
    // 2. Add the same 401 status code
    // 3. But use different error codes for internal tracking
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND', // More specific for logging, but not revealed to client
          message: 'Invalid email or password', // Generic message for security
        },
      });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD', // More specific for logging, but not revealed to client
          message: 'Invalid email or password', // Generic message for security
        },
      });
      return;
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + parseTimeToMs(config.jwt.refreshExpiresIn));

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organization: user.organization,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: parseTimeToMs(config.jwt.accessExpiresIn) / 1000, // Convert to seconds
        },
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred during login',
      },
    });
  }
};

/**
 * @desc Refresh access token
 * @route POST /refresh-token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  try {
    // Find the refresh token in the database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    // Check if token exists and is valid
    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role
    );

    // Generate new refresh token (rotate tokens for security)
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + parseTimeToMs(config.jwt.refreshExpiresIn));

    // Update refresh token in database
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        token: newRefreshToken,
        expiresAt: refreshTokenExpiry,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: parseTimeToMs(config.jwt.accessExpiresIn) / 1000, // Convert to seconds
        },
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred during token refresh',
      },
    });
  }
};

/**
 * @desc Logout user / invalidate refresh token
 * @route POST /logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  try {
    // Delete refresh token from database
    await prisma.refreshToken.deleteMany({
      where: {
        userId: req.user?.id,
        ...(refreshToken ? { token: refreshToken } : {}),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred during logout',
      },
    });
  }
};

/**
 * @desc Get current user profile
 * @route GET /me
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is already attached to req by the auth middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            industry: true,
            size: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
      message: 'User profile retrieved successfully',
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving user profile',
      },
    });
  }
};

/**
 * @desc Update user profile
 * @route PUT /me
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, email } = req.body;

  try {
    // User is already attached to req by the auth middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      });
      return;
    }

    // Check if email is being changed and if it already exists
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already in use',
          },
        });
        return;
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: { user: updatedUser },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating profile',
      },
    });
  }
};

/**
 * @desc Request password reset
 * @route POST /forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link',
      });
      return;
    }

    // Generate unique token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + parseTimeToMs(config.passwordReset.expiresIn));

    // Store token in database, replace if one already exists
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: {
        token: resetToken,
        expiresAt: tokenExpiry,
      },
      create: {
        userId: user.id,
        token: resetToken,
        expiresAt: tokenExpiry,
      },
    });

    // TODO: Send email with reset link
    // This would be implemented with an email service
    // For now, just return success

    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link',
      // For development purposes only
      data: {
        resetToken,
      },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while processing your request',
      },
    });
  }
};

/**
 * @desc Reset password with token
 * @route POST /reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  try {
    // Find the token in the database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists and is valid
    if (!resetToken || resetToken.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired password reset token',
        },
      });
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user's password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Delete the used token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    // Invalidate all refresh tokens for this user (force logout from all devices)
    await prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while resetting your password',
      },
    });
  }
};

/**
 * Helper function to generate JWT access token
 */
const generateAccessToken = (id: string, email: string, role: string): string => {
  return jwt.sign(
    { id, email, role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn } as jwt.SignOptions
  );
};

/**
 * @desc Validate JWT token from other services
 * @route POST /validate-token
 */
export const validateToken = async (req: Request, res: Response): Promise<void> => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication required',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string; role: string };
    
    // Get user from database to ensure it exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Return user info
    res.status(200).json({
      success: true,
      data: {
        user
      },
      message: 'Token is valid',
    });
  } catch (error) {
    console.error('Token validation error:', error);
    
    if ((error as Error).name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token expired',
        },
      });
      return;
    }
    
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
  }
};

/**
 * Helper function to parse time strings like "15m", "1h", "7d" to milliseconds
 */
const parseTimeToMs = (timeString: string): number => {
  const unit = timeString.slice(-1);
  const value = parseInt(timeString.slice(0, -1));
  
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};
