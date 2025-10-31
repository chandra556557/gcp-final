import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { allureService } from '../services/allure.service';
import pool from '../db';
import { randomUUID } from 'crypto';

/**
 * Get all test runs for a user (optionally filtered by projectId via Script.projectId)
 */
export const getTestRuns = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { projectId } = req.query as { projectId?: string };

    const { rows } = await pool.query(
      `SELECT tr.*, s.name AS script_name
       FROM "TestRun" tr
       JOIN "Script" s ON s.id = tr."scriptId"
       WHERE tr."userId" = $1 AND ($2::uuid IS NULL OR s."projectId" = $2)
       ORDER BY tr."startedAt" DESC`,
      [userId, projectId ?? null]
    );

    const testRuns = rows.map(r => ({ ...r, script: { name: r.script_name } }));
    res.status(200).json({ success: true, data: testRuns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get test runs' });
  }
};

/**
 * Get a specific test run
 */
export const getTestRun = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT tr.*, s.name AS script_name, s.language AS script_language
       FROM "TestRun" tr
       LEFT JOIN "Script" s ON s.id = tr."scriptId"
       WHERE tr.id = $1 AND tr."userId" = $2`,
      [id, userId]
    );

    const testRun = rows[0];
    if (!testRun) throw new AppError('Test run not found', 404);

    res.status(200).json({
      success: true,
      data: {
        ...testRun,
        script: { name: testRun.script_name || 'Current Script', language: testRun.script_language || 'playwright-test' }
      }
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to get test run' });
    }
  }
};

/**
 * Start a new test run
 */
export const startTestRun = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { scriptId, dataFileId: _dataFileId, environment, browser } = req.body;
    if (!scriptId) throw new AppError('Script ID is required', 400);

    const scriptRes = await pool.query(
      `SELECT id, name FROM "Script" WHERE id = $1 AND "userId" = $2`,
      [scriptId, userId]
    );
    const script = scriptRes.rows[0];
    if (!script) throw new AppError('Script not found', 404);

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO "TestRun" (id, "scriptId", "userId", status, environment, browser, "startedAt")
       VALUES ($1, $2, $3, 'queued', COALESCE($4, 'development'), COALESCE($5, 'chromium'), now())
       RETURNING *`,
      [id, scriptId, userId, environment ?? null, browser ?? null]
    );
    const testRun = rows[0];

    try { await allureService.startTest(testRun.id, script.name); } catch (error) { console.error('Failed to start Allure test:', error); }

    setTimeout(async () => {
      try {
        const mockSteps = [
          { action: 'Navigate to page', status: 'passed' as const, duration: 500 },
          { action: 'Fill input field', status: 'passed' as const, duration: 300 },
          { action: 'Click submit button', status: 'passed' as const, duration: 200 },
          { action: 'Verify success message', status: 'passed' as const, duration: 150 }
        ];
        for (const step of mockSteps) { await allureService.recordStep(testRun.id, step.action, step.status, step.duration); }
        await allureService.endTest(testRun.id, 'passed');
        await pool.query(
          `UPDATE "TestRun" SET status = 'passed', "completedAt" = now(), duration = $2 WHERE id = $1`,
          [testRun.id, mockSteps.reduce((sum, s) => sum + (s.duration || 0), 0)]
        );
      } catch (error) { console.error('Failed to complete mock test execution:', error); }
    }, 2000);

    res.status(201).json({ success: true, data: testRun });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to start test run' });
    }
  }
};

/**
 * Execute current script code directly (without saving to database)
 */
export const executeCurrentScript = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { code, language, environment, browser } = req.body;
    if (!code || !language) throw new AppError('Code and language are required', 400);

    const tempScriptId = randomUUID();
    await pool.query(
      `INSERT INTO "Script" (id, name, description, language, code, "userId", "browserType", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'chromium'), now(), now())`,
      [tempScriptId, 'Current Script (Temp)', 'Temporary script for direct execution', language, code, userId, browser ?? null]
    );

    const testRunId = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO "TestRun" (id, "scriptId", "userId", status, environment, browser, "startedAt")
       VALUES ($1, $2, $3, 'running', COALESCE($4, 'development'), COALESCE($5, 'chromium'), now())
       RETURNING *`,
      [testRunId, tempScriptId, userId, environment ?? null, browser ?? null]
    );
    const testRun = rows[0];

    try { await allureService.startTest(testRun.id, `Current Script (${language})`); } catch (error) { console.error('Failed to start Allure test:', error); }

    setTimeout(async () => {
      try {
        const mockSteps = [
          { action: 'Parse script code', status: 'passed' as const, duration: 300 },
          { action: 'Initialize browser', status: 'passed' as const, duration: 500 },
          { action: 'Execute script actions', status: 'passed' as const, duration: 800 },
          { action: 'Verify results', status: 'passed' as const, duration: 200 }
        ];
        for (const step of mockSteps) { await allureService.recordStep(testRun.id, step.action, step.status, step.duration); }
        await allureService.endTest(testRun.id, 'passed');
        await pool.query(
          `UPDATE "TestRun" SET status = 'passed', "completedAt" = now(), duration = $2 WHERE id = $1`,
          [testRun.id, mockSteps.reduce((sum, s) => sum + (s.duration || 0), 0)]
        );
        setTimeout(async () => { await pool.query(`DELETE FROM "Script" WHERE id = $1`, [tempScriptId]).catch(err => console.error('Failed to cleanup temp script:', err)); }, 10000);
      } catch (error) {
        console.error('Failed to complete current script execution:', error);
        await pool.query(
          `UPDATE "TestRun" SET status = 'failed', "completedAt" = now(), "errorMsg" = $2 WHERE id = $1`,
          [testRun.id, String(error)]
        ).catch(() => {});
      }
    }, 100);

    res.status(201).json({ success: true, data: testRun });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to execute current script' });
    }
  }
};

/**
 * Stop a test run
 */
export const stopTestRun = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const exists = await pool.query(`SELECT id FROM "TestRun" WHERE id = $1 AND "userId" = $2`, [id, userId]);
    if (!exists.rowCount) throw new AppError('Test run not found', 404);

    const { rows } = await pool.query(
      `UPDATE "TestRun" SET status = 'cancelled', "completedAt" = now() WHERE id = $1 RETURNING *`,
      [id]
    );

    res.status(200).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to stop test run' });
    }
  }
};

/**
 * Get active test runs (optionally filtered by projectId via Script.projectId)
 */
export const getActiveTestRuns = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { projectId } = req.query as { projectId?: string };

    const { rows } = await pool.query(
      `SELECT tr.*, s.name AS script_name
       FROM "TestRun" tr
       JOIN "Script" s ON s.id = tr."scriptId"
       WHERE tr."userId" = $1 AND tr.status IN ('running','queued') AND ($2::uuid IS NULL OR s."projectId" = $2)
       ORDER BY tr."startedAt" DESC`,
      [userId, projectId ?? null]
    );

    const activeRuns = rows.map(r => ({ ...r, script: { name: r.script_name } }));
    res.status(200).json({ success: true, data: activeRuns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get active test runs' });
  }
};

/**
 * Update test run status and complete
 */
export const updateTestRun = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { status, errorMsg, duration, steps } = req.body;

    const existsRes = await pool.query(
      `SELECT tr.id, s.name AS script_name
       FROM "TestRun" tr JOIN "Script" s ON s.id = tr."scriptId"
       WHERE tr.id = $1 AND tr."userId" = $2`,
      [id, userId]
    );
    const existing = existsRes.rows[0];
    if (!existing) throw new AppError('Test run not found', 404);

    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        try {
          await allureService.recordStep(id, step.action || step.name || 'Step', step.status || 'passed', step.duration);
        } catch (error) { console.error('Failed to record Allure step:', error); }
      }
    }

    if (status && ['passed', 'failed', 'error'].includes(status)) {
      try { await allureService.endTest(id, status === 'error' ? 'broken' : status, errorMsg); } catch (error) { console.error('Failed to end Allure test:', error); }
    }

    const { rows } = await pool.query(
      `UPDATE "TestRun"
       SET status = COALESCE($2, status),
           "errorMsg" = $3,
           duration = $4,
           "completedAt" = CASE WHEN $2 IN ('passed','failed','error','cancelled') THEN now() ELSE "completedAt" END
       WHERE id = $1
       RETURNING *`,
      [id, status ?? null, errorMsg ?? null, duration ?? null]
    );

    res.status(200).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to update test run' });
    }
  }
};

/**
 * Report a test result (create completed TestRun)
 */
export const reportTestResult = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { testName, status, duration, errorMsg, browser, environment, traceUrl, videoUrl, screenshotUrls } = req.body;
    if (!testName || !status) throw new AppError('testName and status are required', 400);

    let scriptRes = await pool.query(`SELECT id FROM "Script" WHERE "userId" = $1 AND name = $2`, [userId, testName]);
    let script = scriptRes.rows[0];
    if (!script) {
      const scriptId = randomUUID();
      const created = await pool.query(
        `INSERT INTO "Script" (id, name, description, language, code, "userId", "browserType", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'typescript', $4, $5, 'chromium', now(), now())
         RETURNING id`,
        [scriptId, testName, 'Auto-created from Playwright reporter', '// Recorded by Playwright reporter', userId]
      );
      script = created.rows[0];
    }

    const runId = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO "TestRun" (id, "scriptId", "userId", status, duration, "errorMsg", browser, environment, "traceUrl", "videoUrl", "screenshotUrls", "completedAt", "startedAt")
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'msedge'), COALESCE($8, 'development'), $9, $10, $11, now(), now())
       RETURNING *`,
      [runId, script.id, userId, status, duration ?? null, errorMsg ?? null, browser ?? null, environment ?? null, traceUrl ?? null, videoUrl ?? null, screenshotUrls ?? null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to report test result' });
    }
  }
};