import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/project.controller';

const router = Router();

// Get all projects for the authenticated user
router.get('/', authMiddleware, getProjects);

// Get a specific project
router.get('/:id', authMiddleware, getProject);

// Create a new project
router.post('/', authMiddleware, createProject);

// Update a project
router.put('/:id', authMiddleware, updateProject);

// Delete a project
router.delete('/:id', authMiddleware, deleteProject);

export default router;