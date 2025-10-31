import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';
import { randomUUID } from 'crypto';
import pool from '../../db';


interface TokenPayload {
  userId: string | number;
  email: string;
  type: 'access' | 'refresh';
}

export class AuthService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
    this.accessTokenExpiry = '10h';
    this.refreshTokenExpiry = '15h';
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string) {
    let existing;
    try {
      existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    } catch (_err) {
      existing = await pool.query('SELECT id FROM "User" WHERE email = $1', [email]);
    }
    if (existing.rowCount && existing.rows[0]) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user;
    try {
      const insertUser = await pool.query(
        'INSERT INTO users(email, password, name) VALUES ($1,$2,$3) RETURNING id,email,name',
        [email, hashedPassword, name]
      );
      user = insertUser.rows[0];
    } catch (_err) {
      const userId = randomUUID();
      const insertUser = await pool.query(
        'INSERT INTO "User"(id,email,password,name,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,now(),now()) RETURNING id,email,name',
        [userId, email, hashedPassword, name]
      );
      user = insertUser.rows[0];
    }

    logger.info(`New user registered: ${email}`);

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken,
      expiresIn: 36000
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string) {
    let userRes;
    try {
      userRes = await pool.query(
        'SELECT id,email,password,name FROM users WHERE email = $1',
        [email]
      );
    } catch (_err) {
      userRes = await pool.query(
        'SELECT id,email,password,name FROM "User" WHERE email = $1',
        [email]
      );
    }
    const user = userRes.rows[0];
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    logger.info(`User logged in: ${email}`);

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken,
      expiresIn: 36000
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as TokenPayload;
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      let tokenRes;
      try {
        tokenRes = await pool.query(
          `SELECT id FROM "RefreshToken"
           WHERE token = $1 AND "userId" = $2 AND "expiresAt" > now() AND revokedAt IS NULL`,
          [refreshToken, decoded.userId]
        );
      } catch (err) {
        logger.warn('RefreshToken table missing or inaccessible; treating token as invalid');
        throw new Error('Invalid or expired refresh token');
      }
      if (!tokenRes.rowCount) {
        throw new Error('Invalid or expired refresh token');
      }

      let userRes;
      try {
        userRes = await pool.query(
          'SELECT id,email FROM users WHERE id = $1',
          [decoded.userId]
        );
      } catch (_err) {
        userRes = await pool.query(
          'SELECT id,email FROM "User" WHERE id = $1',
          [decoded.userId]
        );
      }
      const user = userRes.rows[0];
      if (!user) {
        throw new Error('User not found');
      }

      const accessToken = this.generateAccessToken(user.id, user.email);
      return {
        accessToken,
        expiresIn: 36000
      };
    } catch (error) {
      logger.error('Refresh token error:', error as any);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string) {
    try {
      try {
        await pool.query(
          'UPDATE "RefreshToken" SET revokedAt = now() WHERE token = $1',
          [refreshToken]
        );
      } catch (err) {
        logger.warn('RefreshToken table missing; skip revoke');
      }
      logger.info('User logged out');
      return true;
    } catch (error) {
      logger.error('Logout error:', error as any);
      return false;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string | number, email: string) {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.generateRefreshToken(userId);

    try {
      await pool.query(
        'INSERT INTO "RefreshToken"(id,token,"userId","expiresAt","createdAt") VALUES ($1,$2,$3,$4,now())',
        [randomUUID(), refreshToken, userId, new Date(Date.now() + 15 * 60 * 60 * 1000)]
      );
    } catch (err) {
      logger.warn('RefreshToken table missing; proceeding without storing refresh token');
    }

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token
   */
  private generateAccessToken(userId: string | number, email: string): string {
    return jwt.sign(
      { userId, email, type: 'access' },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry } as jwt.SignOptions
    );
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(userId: string | number): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry, jwtid: randomUUID() } as jwt.SignOptions
    );
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as TokenPayload;
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (_error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens() {
    try {
      const result = await pool.query(
        'DELETE FROM "RefreshToken" WHERE "expiresAt" < now()'
      );
      logger.info(`Cleaned up ${result.rowCount} expired tokens`);
      return result.rowCount;
    } catch (err) {
      logger.warn('RefreshToken table missing; skipping cleanup');
      return 0;
    }
  }
}

export const authService = new AuthService();
