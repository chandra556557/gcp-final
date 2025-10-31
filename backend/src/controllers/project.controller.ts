import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import pool from '../db';
import { randomUUID } from 'crypto';

/**
 * Get all projects for the authenticated user
 */
export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const { rows } = await pool.query(
      `SELECT id, name, "createdAt", "updatedAt"
       FROM "Project"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      [userId]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get projects' });
  }
};

/**
 * Get a single project by id
 */
export const getProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT id, name, "createdAt", "updatedAt"
       FROM "Project"
       WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );
    const project = rows[0];
    if (!project) throw new AppError('Project not found', 404);

    res.status(200).json({ success: true, data: project });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to get project' });
    }
  }
};

/**
 * Create a new project
 */
export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name } = req.body;

    if (!name || String(name).trim().length === 0) {
      throw new AppError('Project name is required', 400);
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO "Project" (id, name, "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, now(), now())
       RETURNING id, name, "createdAt", "updatedAt"`,
      [id, String(name).trim(), userId]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to create project' });
    }
  }
};

/**
 * Update an existing project
 */
export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { name } = req.body;

    const existing = await pool.query(
      `SELECT id FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );
    if (!existing.rowCount) throw new AppError('Project not found', 404);

    const { rows } = await pool.query(
      `UPDATE "Project"
       SET name = COALESCE($2, name), "updatedAt" = now()
       WHERE id = $1
       RETURNING id, name, "createdAt", "updatedAt"`,
      [id, name ?? null]
    );

    res.status(200).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to update project' });
    }
  }
};

/**
 * Delete a project
 */
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const existing = await pool.query(
      `SELECT id FROM "Project" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );
    if (!existing.rowCount) throw new AppError('Project not found', 404);

    await pool.query(`DELETE FROM "Project" WHERE id = $1`, [id]);

    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to delete project' });
    }
  }
};