import { Router } from 'express';
import { login, register, logout, refreshToken } from '../controllers/auth.controller';
import { validateToken, getProfile } from '../controllers/validate-token.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Authentication routes
router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);

// Token refresh endpoint
router.post('/refresh-token', refreshToken);

// Token validation endpoint
router.post('/validate-token', validateToken);

// User profile endpoint (requires authentication)
router.get('/profile', authenticateJWT, getProfile);

// Current user endpoint - same as profile but matches frontend expectation
router.get('/me', authenticateJWT, getProfile);

export default router;
