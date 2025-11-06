import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

const ALLURE_RESULTS_DIR = path.join(process.cwd(), 'allure-results');
const ALLURE_REPORTS_DIR = path.join(process.cwd(), 'allure-reports');
// File-backed index directory (per project JSON index)
const ALLURE_INDEX_DIR = path.join(ALLURE_REPORTS_DIR, 'by-project');

export interface ReportIndexEntry {
  id: string; // testRunId
  projectId: string;
  scriptId?: string;
  scriptName?: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
  reportUrl: string;
  createdAt: string; // ISO timestamp
}

export class AllureService {
  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!fs.existsSync(ALLURE_RESULTS_DIR)) {
      fs.mkdirSync(ALLURE_RESULTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(ALLURE_REPORTS_DIR)) {
      fs.mkdirSync(ALLURE_REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(ALLURE_INDEX_DIR)) {
      fs.mkdirSync(ALLURE_INDEX_DIR, { recursive: true });
    }
  }

  // ===== File-backed index helpers =====
  private getProjectIndexPath(projectId: string) {
    return path.join(ALLURE_INDEX_DIR, `${projectId}.json`);
  }

  readProjectIndex(projectId: string): ReportIndexEntry[] {
    try {
      const filePath = this.getProjectIndexPath(projectId);
      if (!fs.existsSync(filePath)) return [];
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data as ReportIndexEntry[];
      return [];
    } catch (err) {
      logger.warn(`Failed to read index for project ${projectId}:`, err);
      return [];
    }
  }

  appendProjectIndexEntry(projectId: string, entry: ReportIndexEntry) {
    try {
      const filePath = this.getProjectIndexPath(projectId);
      let current: ReportIndexEntry[] = [];
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) current = parsed as ReportIndexEntry[];
        } catch (e) {
          logger.warn(`Index parse error for project ${projectId}, resetting:`, e);
          current = [];
        }
      }
      // De-duplicate by testRun id
      current = current.filter(r => r.id !== entry.id);
      current.unshift(entry);
      const tmpPath = `${filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(current, null, 2));
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      logger.error(`Failed to append index for project ${projectId}:`, err);
    }
  }

  listAllProjectIndexes(): { projectId: string; entries: ReportIndexEntry[] }[] {
    try {
      if (!fs.existsSync(ALLURE_INDEX_DIR)) return [];
      const files = fs.readdirSync(ALLURE_INDEX_DIR).filter(f => f.endsWith('.json'));
      return files.map(f => {
        const projectId = path.basename(f, '.json');
        const entries = this.readProjectIndex(projectId);
        return { projectId, entries };
      });
    } catch (err) {
      logger.warn('Failed to list project indexes:', err);
      return [];
    }
  }

  async startTest(testRunId: string, scriptName: string) {
    try {
      const testData = {
        uuid: testRunId,
        testCaseId: testRunId,
        fullName: scriptName,
        name: scriptName,
        historyId: testRunId,
        start: Date.now(),
        steps: [],
      };

      const resultsPath = path.join(ALLURE_RESULTS_DIR, `${testRunId}-result.json`);
      fs.writeFileSync(resultsPath, JSON.stringify(testData, null, 2));

      return testData;
    } catch (error) {
      logger.error('Error starting Allure test:', error);
      throw error;
    }
  }

  async recordStep(testId: string, stepName: string, status: 'passed' | 'failed' | 'broken', duration?: number) {
    try {
      const resultsPath = path.join(ALLURE_RESULTS_DIR, `${testId}-result.json`);

      const stepData = {
        name: stepName,
        status,
        statusDetails: {},
        stage: 'finished',
        start: Date.now() - (duration || 0),
        stop: Date.now(),
      };

      let results: any = { steps: [] };
      if (fs.existsSync(resultsPath)) {
        results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      }

      results.steps = results.steps || [];
      results.steps.push(stepData);

      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    } catch (error) {
      logger.error('Error recording Allure step:', error);
    }
  }

  async endTest(testId: string, status: 'passed' | 'failed' | 'broken', errorMessage?: string) {
    try {
      const resultsPath = path.join(ALLURE_RESULTS_DIR, `${testId}-result.json`);

      const result = {
        uuid: testId,
        historyId: testId,
        testCaseId: testId,
        fullName: testId,
        name: testId,
        status,
        statusDetails: errorMessage ? { message: errorMessage } : {},
        stage: 'finished',
        start: Date.now(),
        stop: Date.now(),
        steps: [],
      };

      if (fs.existsSync(resultsPath)) {
        const existing = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
        result.steps = existing.steps || [];
      }

      fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2));

      logger.info(`Allure test ended: ${testId} with status: ${status}`);
    } catch (error) {
      logger.error('Error ending Allure test:', error);
    }
  }

  async generateReport(testRunId: string): Promise<string> {
    try {
      // Check if allure results exist for this test run
      const resultFile = path.join(ALLURE_RESULTS_DIR, `${testRunId}-result.json`);
      if (!fs.existsSync(resultFile)) {
        logger.warn(`No Allure results found for test run: ${testRunId}`);
        // Create a minimal result file if it doesn't exist
        const minimalResult = {
          uuid: testRunId,
          testCaseId: testRunId,
          fullName: `Test Run ${testRunId}`,
          name: `Test Run ${testRunId}`,
          historyId: testRunId,
          status: 'passed',
          stage: 'finished',
          start: Date.now(),
          stop: Date.now(),
          steps: [],
        };
        fs.writeFileSync(resultFile, JSON.stringify(minimalResult, null, 2));
      }

      const reportPath = path.join(ALLURE_REPORTS_DIR, testRunId);

      if (!fs.existsSync(reportPath)) {
        fs.mkdirSync(reportPath, { recursive: true });
      }

      // Try to generate report using Allure CLI, fallback to basic HTML if it fails
      let useBasicReport = false;
      
      try {
        // Try using npx allure (works if allure-commandline is installed)
        const command = `npx allure generate "${ALLURE_RESULTS_DIR}" -o "${reportPath}" --clean`;
        execSync(command, {
          cwd: process.cwd(),
          stdio: 'pipe',
          shell: true,
        });
        logger.info(`Allure report generated successfully at: ${reportPath}`);
      } catch (execError: any) {
        logger.warn('Allure CLI generate failed, using basic HTML report:', execError.message || execError);
        useBasicReport = true;
      }

      // If Allure CLI failed or for basic reports, create a simple HTML report
      if (useBasicReport || !fs.existsSync(path.join(reportPath, 'index.html'))) {
        const indexHtml = path.join(reportPath, 'index.html');
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${testRunId}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .header h1 { margin: 0; }
    .info { margin: 20px 0; }
    .info p { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #667eea; }
    .status { display: inline-block; padding: 5px 15px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Test Execution Report</h1>
    </div>
    <div class="info">
      <p><span class="status">✓ Generated</span></p>
      <p><strong>Test Run ID:</strong> ${testRunId}</p>
      <p><strong>Report Type:</strong> Basic HTML Report</p>
      <p><em>Note: Allure CLI is not available. Install allure-commandline for full Allure reports.</em></p>
    </div>
  </div>
</body>
</html>`;
        fs.writeFileSync(indexHtml, htmlContent);
        logger.info(`Basic HTML report generated at: ${reportPath}`);
      }

      logger.info(`Report generated at: ${reportPath}`);
      return reportPath;
    } catch (error: any) {
      logger.error('Error generating Allure report:', error);
      // Even on error, try to create a basic report
      try {
        const reportPath = path.join(ALLURE_REPORTS_DIR, testRunId);
        if (!fs.existsSync(reportPath)) {
          fs.mkdirSync(reportPath, { recursive: true });
        }
        const indexHtml = path.join(reportPath, 'index.html');
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${testRunId}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    .header { background: #667eea; color: white; padding: 20px; border-radius: 5px; }
    .error { color: #ef4444; padding: 10px; background: #fee2e2; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Test Execution Report</h1>
    </div>
    <div class="error">
      <p><strong>Error:</strong> ${error.message || 'Failed to generate report'}</p>
      <p><strong>Test Run ID:</strong> ${testRunId}</p>
    </div>
  </div>
</body>
</html>`;
        fs.writeFileSync(indexHtml, htmlContent);
        return reportPath;
      } catch (fallbackError) {
        logger.error('Even fallback report creation failed:', fallbackError);
        throw new Error(error.message || 'Failed to generate Allure report');
      }
    }
  }

  async getReportUrl(testRunId: string): Promise<string> {
    const reportPath = path.join(ALLURE_REPORTS_DIR, testRunId);
    if (fs.existsSync(reportPath)) {
      return `/allure-reports/${testRunId}/index.html`;
    }
    return '';
  }

  async cleanupOldReports(daysToKeep = 7) {
    try {
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      const reports = fs.readdirSync(ALLURE_REPORTS_DIR);
      for (const report of reports) {
        const reportPath = path.join(ALLURE_REPORTS_DIR, report);
        const stats = fs.statSync(reportPath);

        if (now - stats.mtimeMs > maxAge) {
          fs.rmSync(reportPath, { recursive: true, force: true });
          logger.info(`Cleaned up old Allure report: ${report}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up Allure reports:', error);
    }
  }

  getAllReports(): Array<{ id: string; path: string; createdAt: Date }> {
    try {
      const reports = fs.readdirSync(ALLURE_REPORTS_DIR);
      return reports.map(report => {
        const reportPath = path.join(ALLURE_REPORTS_DIR, report);
        const stats = fs.statSync(reportPath);
        return {
          id: report,
          path: `/allure-reports/${report}/index.html`,
          createdAt: stats.birthtime,
        };
      });
    } catch (error) {
      logger.error('Error getting Allure reports:', error);
      return [];
    }
  }
}

export const allureService = new AllureService();
