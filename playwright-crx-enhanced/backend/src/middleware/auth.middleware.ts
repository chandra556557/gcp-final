import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/auth.service';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyAccessToken(token);

    req.user = { userId: String(decoded.userId), email: String(decoded.email) };
    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized', message: error.message || 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = authService.verifyAccessToken(token);
      req.user = { userId: String(decoded.userId), email: String(decoded.email) };
    }
    next();
  } catch (_error) {
    next();
  }
};
