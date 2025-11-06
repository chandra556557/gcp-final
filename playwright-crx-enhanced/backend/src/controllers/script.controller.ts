import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import db from '../db';
import { randomUUID } from 'crypto';


/**
 * Get all scripts for a user
 */
export const getScripts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { projectId } = req.query;

    let query = `SELECT s.id, s.name, s.description, s.language, s."browserType" as "browserType",
              s."createdAt" as "createdAt", s."updatedAt" as "updatedAt", s."projectId" as "projectId",
              p.name AS "projectName", u.name AS "userName", u.email AS "userEmail"
       FROM "Script" s
       LEFT JOIN "Project" p ON p.id = s."projectId"
       LEFT JOIN "User" u ON u.id = s."userId"
       WHERE s."userId" = $1`;
    
    const params = [userId];
    
    if (projectId) {
      query += ` AND s."projectId" = $2`;
      params.push(projectId as string);
    }
    
    query += ` ORDER BY s."createdAt" DESC`;

    const { rows } = await db.query(query, params);

    const scripts = rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      language: r.language,
      browserType: r.browserType,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      projectId: r.projectId,
      project: r.projectName ? { name: r.projectName } : null,
      user: { name: r.userName || 'Unknown User', email: r.userEmail || '' }
    }));

    res.status(200).json({
      success: true,
      data: scripts
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get scripts'
    });
  }
};

/**
 * Get a specific script
 */
export const getScript = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT s.id, s.name, s.description, s.language, s.code, s."browserType" as "browserType",
              s.viewport, s."testIdAttribute" as "testIdAttribute",
              s."createdAt" as "createdAt", s."updatedAt" as "updatedAt", s."projectId" as "projectId",
              p.name AS "projectName"
       FROM "Script" s
       LEFT JOIN "Project" p ON p.id = s."projectId"
       WHERE s.id = $1 AND s."userId" = $2`,
      [id, userId]
    );

    const script = rows[0];
    if (!script) {
      throw new AppError('Script not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        id: script.id,
        name: script.name,
        description: script.description,
        language: script.language,
        code: script.code,
        browserType: script.browserType,
        viewport: script.viewport,
        testIdAttribute: script.testIdAttribute,
        createdAt: script.createdAt,
        updatedAt: script.updatedAt,
        projectId: script.projectId,
        project: script.projectName ? { name: script.projectName } : null
      }
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get script'
      });
    }
  }
};

/**
 * Create a new script
 */
export const createScript = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name, description, language, code, projectId } = req.body;

    // Validate required fields
    if (!name || !code) {
      throw new AppError('Name and code are required', 400);
    }

    const id = randomUUID();
    const { rows } = await db.query(
      `INSERT INTO "Script" (id, name, description, language, code, "userId", "projectId",
                              "browserType", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, COALESCE($4, 'typescript'), $5, $6, $7, 'chromium', now(), now())
       RETURNING id, name, description, language, code, "browserType", viewport, "testIdAttribute",
                 "createdAt", "updatedAt", "projectId"`,
      [id, name, description ?? null, language, code, userId, projectId ?? null]
    );
    const script = rows[0];

    res.status(201).json({
      success: true,
      data: script
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create script'
      });
    }
  }
};

/**
 * Update a script
 */
export const updateScript = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { name, description, language, code, browserType, viewport, testIdAttribute } = req.body;

    // Check if script exists and belongs to user
    const existing = await db.query(
      `SELECT id FROM "Script" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );

    if (!existing.rowCount) {
      throw new AppError('Script not found', 404);
    }

    const { rows } = await db.query(
      `UPDATE "Script"
       SET name = COALESCE($2, name),
           description = $3,
           language = $4,
           code = $5,
           "browserType" = $6,
           viewport = $7,
           "testIdAttribute" = $8,
           "updatedAt" = now()
       WHERE id = $1
       RETURNING id, name, description, language, code, "browserType", viewport, "testIdAttribute",
                 "createdAt", "updatedAt", "projectId"`,
      [id, name ?? null, description ?? null, language ?? null, code ?? null, browserType ?? null, viewport ?? null, testIdAttribute ?? null]
    );
    const script = rows[0];

    res.status(200).json({
      success: true,
      data: script
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update script'
      });
    }
  }
};

/**
 * Delete a script
 */
export const deleteScript = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const existing = await db.query(
      `SELECT id FROM "Script" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );

    if (!existing.rowCount) {
      throw new AppError('Script not found', 404);
    }

    await db.query(
      `DELETE FROM "Script" WHERE id = $1`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Script deleted successfully'
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete script'
      });
    }
  }
};

