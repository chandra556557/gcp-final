import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  generateReport,
  getReportUrl,
  getAllReports,
  getReportsByProject,
  cleanupOldReports,
} from '../controllers/allure.controller';

const router = Router();

router.post('/generate/:testRunId', authMiddleware, generateReport);

router.get('/report/:testRunId', authMiddleware, getReportUrl);

router.get('/reports', authMiddleware, getAllReports);

router.get('/reports/by-project', authMiddleware, getReportsByProject);

router.post('/cleanup', authMiddleware, cleanupOldReports);

export default router;
