import { Request, Response } from 'express';
import { allureService } from '../services/allure.service';
import { logger } from '../utils/logger';
import db from '../db';


export const generateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testRunId } = req.params;

    if (!testRunId) {
      res.status(400).json({ success: false, error: 'Test run ID is required' });
      return;
    }

    // Verify test run exists and belongs to user
    const userId = (req as any).user?.userId;
    if (userId) {
      const testRunCheck = await db.query(
        'SELECT id FROM "TestRun" WHERE id = $1 AND "userId" = $2',
        [testRunId, userId]
      );
      if (testRunCheck.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Test run not found' });
        return;
      }
    }

    const reportPath = await allureService.generateReport(testRunId);
    const reportUrl = await allureService.getReportUrl(testRunId);

    if (reportUrl) {
      try {
        await db.query(
          'UPDATE "TestRun" SET "executionReportUrl" = $2 WHERE id = $1',
          [testRunId, reportUrl]
        );
      } catch (dbErr: any) {
        // Gracefully handle missing column without failing the request
        if (dbErr && dbErr.code === '42703') {
          logger.warn('executionReportUrl column missing on TestRun; skipping DB update.');
        } else {
          logger.error('Failed to update executionReportUrl on TestRun:', dbErr);
        }
      }

      // Append to file-backed index with rich metadata
      try {
        const { rows } = await db.query(
          'SELECT tr.id, tr.status, tr."startedAt", tr."completedAt", tr."scriptId", s.name AS script_name, s."projectId" AS project_id FROM "TestRun" tr JOIN "Script" s ON s.id = tr."scriptId" WHERE tr.id = $1',
          [testRunId]
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          allureService.appendProjectIndexEntry(r.project_id, {
            id: r.id,
            projectId: r.project_id,
            scriptId: r.scriptId,
            scriptName: r.script_name,
            status: r.status,
            startedAt: r.startedAt,
            completedAt: r.completedAt,
            reportUrl,
            createdAt: new Date().toISOString(),
          });
        } else {
          // Fallback with minimal info if DB fetch failed: projectId unknown
          logger.warn(`TestRun ${testRunId} not found during index append; skipping project index update.`);
        }
      } catch (indexErr) {
        logger.warn('Failed to append project index entry:', indexErr);
      }
    }

    logger.info(`Execution report generated for test run: ${testRunId}`);

    res.json({
      success: true,
      reportPath,
      reportUrl,
      message: 'Execution report generated successfully',
    });
  } catch (error: any) {
    logger.error('Error generating Execution report:', error);
    const errorMessage = error.message || 'Failed to generate Execution report';
    logger.error('Error details:', { error, testRunId: req.params.testRunId });
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
};

export const getReportUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testRunId } = req.params;

    const reportUrl = await allureService.getReportUrl(testRunId);

    if (!reportUrl) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }

    res.json({ success: true, reportUrl });
  } catch (error: any) {
    logger.error('Error getting Execution report URL:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get report URL' });
  }
};

export const getAllReports = async (_req: Request, res: Response) => {
  try {
    const reports = allureService.getAllReports();
    res.json({ success: true, reports });
  } catch (error: any) {
    logger.error('Error getting all Execution reports:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get reports' });
  }
};

// Get reports filtered by project for the authenticated user
export const getReportsByProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { projectId } = req.query as { projectId?: string };
    // First try file-backed index
    let indexedResults: Array<{ id: string; scriptName?: string; status?: string; startedAt?: string; completedAt?: string; reportUrl: string }> = [];
    try {
      if (projectId) {
        const entries = allureService.readProjectIndex(projectId);
        indexedResults = entries.map(e => ({
          id: e.id,
          scriptName: e.scriptName,
          status: e.status,
          startedAt: e.startedAt,
          completedAt: e.completedAt,
          reportUrl: e.reportUrl,
        }));
      } else {
        const all = allureService.listAllProjectIndexes();
        indexedResults = all.flatMap(p => p.entries.map(e => ({
          id: e.id,
          scriptName: e.scriptName,
          status: e.status,
          startedAt: e.startedAt,
          completedAt: e.completedAt,
          reportUrl: e.reportUrl,
        })));
      }
    } catch (e) {
      logger.warn('Failed to read file-backed index; will fallback to DB query.', e);
    }

    if (indexedResults.length > 0) {
      res.json({ success: true, data: indexedResults });
      return;
    }

    // Fallback: query DB and filter by project/report presence
    let query = `SELECT tr.id, tr.status, tr."startedAt", tr."completedAt", s.name AS script_name, s."projectId" AS project_id
                 FROM "TestRun" tr JOIN "Script" s ON s.id = tr."scriptId"
                 WHERE tr."userId" = $1`;
    const params: any[] = [userId];
    let idx = 2;
    if (projectId) {
      query += ` AND s."projectId" = $${idx}`;
      params.push(projectId);
      idx++;
    }
    query += ` ORDER BY tr."completedAt" DESC NULLS LAST, tr."startedAt" DESC`;

    const { rows } = await db.query(query, params);

    const results: Array<{ id: string; scriptName: string; status: string; startedAt: string; completedAt?: string; reportUrl: string }> = [];
    for (const r of rows) {
      const url = await allureService.getReportUrl(r.id);
      if (url) {
        results.push({
          id: r.id,
          scriptName: r.script_name,
          status: r.status,
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          reportUrl: url,
        });
      }
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error('Error getting project-specific reports:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get project reports' });
  }
};

export const cleanupOldReports = async (req: Request, res: Response) => {
  try {
    const { days } = req.body;
    const daysToKeep = days || 7;

    await allureService.cleanupOldReports(daysToKeep);

    res.json({ success: true, message: `Cleaned up reports older than ${daysToKeep} days` });
  } catch (error: any) {
    logger.error('Error cleaning up Execution reports:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to cleanup reports' });
  }
};

