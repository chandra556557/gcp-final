import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getTemplates, getJobs, generateData, getLatestDataset, createTemplate, updateTemplate, deleteTemplate } from '../controllers/testData.controller';

const router = Router();

// Templates
router.get('/templates', authMiddleware, getTemplates);
router.post('/templates', authMiddleware, createTemplate);
router.put('/templates/:id', authMiddleware, updateTemplate);
router.delete('/templates/:id', authMiddleware, deleteTemplate);

// Generation jobs
router.get('/jobs', authMiddleware, getJobs);
router.post('/generate', authMiddleware, generateData);

// Latest preview
router.get('/datasets/latest', authMiddleware, getLatestDataset);

export default router;