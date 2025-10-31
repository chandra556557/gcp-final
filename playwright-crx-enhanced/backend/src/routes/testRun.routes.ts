import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getTestRuns,
  getTestRun,
  startTestRun,
  executeCurrentScript,
  stopTestRun,
  getActiveTestRuns,
  reportTestResult,
  updateTestRun
} from '../controllers/testRun.controller';

const router = Router();

// Get all test runs for a user
router.get('/', authMiddleware, getTestRuns);

// Get a specific test run
router.get('/:id', authMiddleware, getTestRun);

// Start a new test run
router.post('/start', authMiddleware, startTestRun);

// Execute current script code directly
router.post('/execute-current', authMiddleware, executeCurrentScript);

// Update test run (status, steps, completion)
router.put('/:id', authMiddleware, updateTestRun);

// Report a test result (create completed run)
router.post('/report', authMiddleware, reportTestResult);

// Stop a test run
router.post('/:id/stop', authMiddleware, stopTestRun);

// Get active test runs
router.get('/active', authMiddleware, getActiveTestRuns);

export default router;
