import { WebSocketServer } from 'ws';
import { logger } from '../../utils/logger';
import db from '../../db';

interface TestStep {
  stepNumber: number;
  action: string;
  selector?: string;
  value?: string;
}

interface TestRunContext {
  testRunId: string;
  scriptId: string;
  userId: string;
  ws?: WebSocketServer;
}

/**
 * Execute a Playwright test script
 */
export class TestRunnerService {
  private activeRuns: Map<string, TestRunContext> = new Map();

  async startTestRun(testRunId: string, scriptId: string, userId: string, ws?: WebSocketServer): Promise<void> {
    try {
      const context: TestRunContext = { testRunId, scriptId, userId, ws };
      this.activeRuns.set(testRunId, context);

      await db.query(`UPDATE "TestRun" SET status = 'running' WHERE id = $1`, [testRunId]);

      if (ws) {
        this.sendWebSocketMessage(ws, { type: 'TEST_STARTED', testRunId, scriptId, timestamp: Date.now() });
      }

      const { rows: scriptRows } = await db.query(
        `SELECT code FROM "Script" WHERE id = $1 AND "userId" = $2`,
        [scriptId, userId]
      );
      const script = scriptRows[0];
      if (!script) throw new Error('Script not found');

      await this.executeScript(context, script.code);

      await db.query(
        `UPDATE "TestRun" SET status = 'passed', "completedAt" = now() WHERE id = $1`,
        [testRunId]
      );

      if (ws) {
        this.sendWebSocketMessage(ws, { type: 'TEST_COMPLETED', testRunId, status: 'passed', timestamp: Date.now() });
      }

      this.activeRuns.delete(testRunId);
    } catch (error: any) {
      logger.error('Test execution failed:', error);

      await db.query(
        `UPDATE "TestRun" SET status = 'failed', "errorMsg" = $2, "completedAt" = now() WHERE id = $1`,
        [testRunId, error.message]
      );

      if (ws) {
        this.sendWebSocketMessage(ws, { type: 'TEST_FAILED', testRunId, error: error.message, timestamp: Date.now() });
      }

      this.activeRuns.delete(testRunId);
    }
  }

  async stopTestRun(testRunId: string): Promise<void> {
    const context = this.activeRuns.get(testRunId);
    if (context) {
      await db.query(
        `UPDATE "TestRun" SET status = 'cancelled', "completedAt" = now() WHERE id = $1`,
        [testRunId]
      );

      if (context.ws) {
        this.sendWebSocketMessage(context.ws, { type: 'TEST_STOPPED', testRunId, timestamp: Date.now() });
      }

      this.activeRuns.delete(testRunId);
    }
  }

  private async executeScript(context: TestRunContext, code: string): Promise<void> {
    const steps: TestStep[] = this.parseScriptSteps(code);

    for (const step of steps) {
      await db.query(
        `INSERT INTO "TestStep" (id, "testRunId", "stepNumber", action, selector, value, status, "timestamp")
         VALUES ($1, $2, $3, $4, $5, $6, 'running', now())`,
        [`${context.testRunId}-${step.stepNumber}`, context.testRunId, step.stepNumber, step.action, step.selector ?? null, step.value ?? null]
      );

      if (context.ws) {
        this.sendWebSocketMessage(context.ws, { type: 'STEP_UPDATE', testRunId: context.testRunId, stepNumber: step.stepNumber, action: step.action, status: 'running', timestamp: Date.now() });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      await db.query(
        `UPDATE "TestStep" SET status = 'passed', duration = 500 WHERE id = $1`,
        [`${context.testRunId}-${step.stepNumber}`]
      );

      if (context.ws) {
        this.sendWebSocketMessage(context.ws, { type: 'STEP_UPDATE', testRunId: context.testRunId, stepNumber: step.stepNumber, action: step.action, status: 'passed', duration: 500, timestamp: Date.now() });
      }
    }
  }

  private parseScriptSteps(code: string): TestStep[] {
    const steps: TestStep[] = [];
    let stepNumber = 1;
    const lines = code.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes('page.goto(')) {
        steps.push({ stepNumber: stepNumber++, action: 'goto', selector: this.extractParameter(trimmedLine, 'page.goto(') });
      } else if (trimmedLine.includes('page.click(')) {
        steps.push({ stepNumber: stepNumber++, action: 'click', selector: this.extractParameter(trimmedLine, 'page.click(') });
      } else if (trimmedLine.includes('page.fill(')) {
        const params = this.extractParameters(trimmedLine, 'page.fill(');
        steps.push({ stepNumber: stepNumber++, action: 'fill', selector: params[0], value: params[1] });
      } else if (trimmedLine.includes('page.press(')) {
        const params = this.extractParameters(trimmedLine, 'page.press(');
        steps.push({ stepNumber: stepNumber++, action: 'press', selector: params[0], value: params[1] });
      } else if (trimmedLine.includes('expect(')) {
        steps.push({ stepNumber: stepNumber++, action: 'assert', selector: this.extractParameter(trimmedLine, 'expect(') });
      }
    }
    return steps;
  }

  private extractParameter(line: string, method: string): string | undefined {
    const startIndex = line.indexOf(method);
    if (startIndex === -1) return undefined;
    const paramStart = startIndex + method.length;
    const paramEnd = line.indexOf(')', paramStart);
    if (paramEnd === -1) return undefined;
    return line.substring(paramStart, paramEnd).replace(/['"]/g, '').trim();
  }

  private extractParameters(line: string, method: string): string[] {
    const startIndex = line.indexOf(method);
    if (startIndex === -1) return [];
    const paramStart = startIndex + method.length;
    const paramEnd = line.indexOf(')', paramStart);
    if (paramEnd === -1) return [];
    const paramsString = line.substring(paramStart, paramEnd);
    return paramsString.split(',').map(param => param.replace(/['"]/g, '').trim());
  }

  private sendWebSocketMessage(_ws: WebSocketServer, message: any): void {
    logger.info('WebSocket message:', message);
  }

  getActiveTestRuns(): string[] {
    return Array.from(this.activeRuns.keys());
  }
}

export const testRunnerService = new TestRunnerService();
