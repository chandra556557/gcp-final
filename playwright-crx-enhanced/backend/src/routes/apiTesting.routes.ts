import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createSuite,
  getSuites,
  getSuite,
  updateSuite,
  deleteSuite,
  createTestCase,
  getTestCases,
  executeTestCase,
  createContract,
  getContracts,
  createMock,
  getMocks,
  getBenchmarks,
  getBenchmarkStats,
  suggestAssertions,
} from '../controllers/apiTesting.controller';

const router = Router();

// ========== Test Suite Routes ==========
router.post('/suites', authMiddleware, createSuite);
router.get('/suites', authMiddleware, getSuites);
router.get('/suites/:id', authMiddleware, getSuite);
router.put('/suites/:id', authMiddleware, updateSuite);
router.delete('/suites/:id', authMiddleware, deleteSuite);

// ========== Test Case Routes ==========
router.post('/test-cases', authMiddleware, createTestCase);
router.get('/suites/:suiteId/test-cases', authMiddleware, getTestCases);
router.post('/test-cases/:id/execute', authMiddleware, executeTestCase);

// ========== Contract Routes ==========
router.post('/contracts', authMiddleware, createContract);
router.get('/suites/:suiteId/contracts', authMiddleware, getContracts);

// ========== Mock Routes ==========
router.post('/mocks', authMiddleware, createMock);
router.get('/suites/:suiteId/mocks', authMiddleware, getMocks);

// ========== Performance Benchmark Routes ==========
router.get('/test-cases/:testCaseId/benchmarks', authMiddleware, getBenchmarks);
router.get('/test-cases/:testCaseId/benchmarks/stats', authMiddleware, getBenchmarkStats);

// ========== AI-Assisted Assertion Suggestions ==========
router.post('/ai/assertions/suggest', authMiddleware, suggestAssertions);

export default router;
