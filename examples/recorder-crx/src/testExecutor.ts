/**
 * Copyright (c) Rui Figueira.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { apiService } from './apiService';
// Self-healing integration removed

export interface TestRun {
  id: string;
  scriptId: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  startTime: Date;
  endTime?: Date;
  logs: string[];
}

export interface ExecutionProgress {
  status: 'starting' | 'running' | 'completed' | 'failed';
  currentStep?: number;
  totalSteps?: number;
  message?: string;
  error?: string;
}

export class TestExecutor {
  private activeRuns: Map<string, TestRun> = new Map();
  private progressCallbacks: Map<string, (progress: ExecutionProgress) => void> = new Map();
  private logCallbacks: Map<string, (log: string) => void> = new Map();

  constructor() {
    // No WebSocket handlers needed - using REST API polling instead
  }

  /**
   * Execute a test script
   */
  async executeTest(scriptId: string): Promise<TestRun> {
    // Create a new test run
    const testRun: TestRun = {
      id: Math.random().toString(36).substr(2, 9),
      scriptId,
      status: 'pending',
      startTime: new Date(),
      logs: []
    };

    this.activeRuns.set(testRun.id, testRun);

    try {
      // Notify that execution is starting
      this.notifyProgress(testRun.id, {
        status: 'starting',
        message: 'Starting test execution...'
      });

      // Call backend API to start test run
      const backendTestRun = await apiService.startTestRun(scriptId);

      // Update test run with backend ID
      testRun.id = backendTestRun.id;
      testRun.status = 'running';
      this.activeRuns.set(testRun.id, testRun);

      // Dispatch test started event for self-healing
      this.dispatchTestStarted(testRun);

      // Add initial log
      this.addLog(testRun.id, `Test execution started for script: ${scriptId}`);

      // Notify running status
      this.notifyProgress(testRun.id, {
        status: 'running',
        message: 'Test is running...'
      });

      // Poll for test results
      this.pollTestRunStatus(testRun.id);

      return testRun;
    } catch (error: any) {
      console.error('Error executing test:', error);

      // Update status to failed
      testRun.status = 'failed';
      testRun.endTime = new Date();
      this.activeRuns.set(testRun.id, testRun);

      this.notifyProgress(testRun.id, {
        status: 'failed',
        error: error?.message || 'Failed to start test execution'
      });

      throw error;
    }
  }

  /**
   * Execute current script code directly (without saving to database)
   */
  async executeCurrentScript(scriptCode: string, language: string): Promise<TestRun> {
    // Create a new test run
    const testRun: TestRun = {
      id: Math.random().toString(36).substr(2, 9),
      scriptId: 'current-script',
      status: 'pending',
      startTime: new Date(),
      logs: []
    };

    this.activeRuns.set(testRun.id, testRun);

    try {
      // Notify that execution is starting
      this.notifyProgress(testRun.id, {
        status: 'starting',
        message: 'Starting test execution...'
      });

      // Call backend API to execute current script
      const backendTestRun = await apiService.executeCurrentScript(scriptCode, language);

      // Update test run with backend ID
      testRun.id = backendTestRun.id;
      testRun.status = 'running';
      this.activeRuns.set(testRun.id, testRun);

      // Dispatch test started event for self-healing
      this.dispatchTestStarted(testRun);

      // Add initial log
      this.addLog(testRun.id, `Test execution started for current script (${language})`);

      // Notify running status
      this.notifyProgress(testRun.id, {
        status: 'running',
        message: 'Test is running...'
      });

      // Poll for test results
      this.pollTestRunStatus(testRun.id);

      return testRun;
    } catch (error: any) {
      console.error('Error executing current script:', error);

      // Update status to failed
      testRun.status = 'failed';
      testRun.endTime = new Date();
      this.activeRuns.set(testRun.id, testRun);

      this.notifyProgress(testRun.id, {
        status: 'failed',
        error: error?.message || 'Failed to start test execution'
      });

      throw error;
    }
  }


  /**
   * Get test run status
   */
  getTestRun(testRunId: string): TestRun | undefined {
    return this.activeRuns.get(testRunId);
  }

  /**
   * Dispatch test started event
   */
  private dispatchTestStarted(testRun: TestRun): void {
    // no-op: self-healing event dispatch removed
  }

  /**
   * Dispatch test completed event
   */
  private dispatchTestCompleted(testRun: TestRun): void {
    // no-op: self-healing event dispatch removed
  }

  /**
   * Poll test run status from backend
   */
  private async pollTestRunStatus(testRunId: string): Promise<void> {
    const pollInterval = 2000; // Poll every 2 seconds
    const maxPolls = 150; // Max 5 minutes (150 * 2s)
    let pollCount = 0;

    const poll = async () => {
      try {
        const testRun = this.activeRuns.get(testRunId);
        if (!testRun) return;

        // Get test run status from backend
        const backendTestRun = await apiService.getTestRun(testRunId);

        // Update logs
        if (backendTestRun.errorMsg) {
          this.addLog(testRunId, `Error: ${backendTestRun.errorMsg}`);
        }

        // Check if test is complete
        if (backendTestRun.status === 'completed' || backendTestRun.status === 'passed') {
          testRun.status = 'passed';
          testRun.endTime = new Date();
          this.activeRuns.set(testRunId, testRun);

          this.addLog(testRunId, 'Test execution completed successfully');
          this.notifyProgress(testRunId, {
            status: 'completed',
            message: 'Test execution completed successfully'
          });

          // Dispatch test completed event for self-healing
          this.dispatchTestCompleted(testRun);
          return;
        }

        if (backendTestRun.status === 'failed' || backendTestRun.status === 'error') {
          testRun.status = 'failed';
          testRun.endTime = new Date();
          this.activeRuns.set(testRunId, testRun);

          // Capture failure for self-healing
          if (backendTestRun.errorMsg && backendTestRun.errorMsg.includes('locator')) {
            this.dispatchLocatorFailure(testRunId, backendTestRun.errorMsg);
          }

          this.notifyProgress(testRunId, {
            status: 'failed',
            error: backendTestRun.errorMsg || 'Test execution failed'
          });

          // Dispatch test completed event for self-healing
          this.dispatchTestCompleted(testRun);
          return;
        }

        // Continue polling if still running
        if (pollCount < maxPolls && (backendTestRun.status === 'running' || backendTestRun.status === 'queued')) {
          pollCount++;
          setTimeout(poll, pollInterval);
        } else if (pollCount >= maxPolls) {
          // Timeout
          testRun.status = 'failed';
          testRun.endTime = new Date();
          this.activeRuns.set(testRunId, testRun);

          this.notifyProgress(testRunId, {
            status: 'failed',
            error: 'Test execution timeout'
          });
        }
      } catch (error: any) {
        console.error('Error polling test run status:', error);
        const testRun = this.activeRuns.get(testRunId);
        if (testRun) {
          testRun.status = 'failed';
          testRun.endTime = new Date();
          this.activeRuns.set(testRunId, testRun);

          this.notifyProgress(testRunId, {
            status: 'failed',
            error: 'Failed to get test status'
          });
        }
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);
  }

  /**
   * Add log to test run
   */
  private addLog(testRunId: string, log: string): void {
    const testRun = this.activeRuns.get(testRunId);
    if (testRun) {
      testRun.logs.push(log);

      // Notify log callback
      const logCallback = this.logCallbacks.get(testRunId);
      if (logCallback) {
        logCallback(log);
      }
    }
  }

  /**
   * Cancel a test run
   */
  async cancelTestRun(testRunId: string): Promise<void> {
    const testRun = this.activeRuns.get(testRunId);
    if (!testRun) {
      throw new Error('Test run not found');
    }

    try {
      // Call backend API to stop test run
      await apiService.stopTestRun(testRunId);

      // Update status to failed (cancelled)
      testRun.status = 'failed';
      testRun.endTime = new Date();
      this.activeRuns.set(testRunId, testRun);

      this.addLog(testRunId, 'Test execution cancelled by user');
      this.notifyProgress(testRunId, {
        status: 'failed',
        message: 'Test execution cancelled'
      });
    } catch (error) {
      console.error('Error cancelling test run:', error);
      throw error;
    }
  }

  /**
   * Add progress callback
   */
  addProgressCallback(testRunId: string, callback: (progress: ExecutionProgress) => void): void {
    this.progressCallbacks.set(testRunId, callback);
  }

  /**
   * Remove progress callback
   */
  removeProgressCallback(testRunId: string): void {
    this.progressCallbacks.delete(testRunId);
  }

  /**
   * Add log callback
   */
  addLogCallback(testRunId: string, callback: (log: string) => void): void {
    this.logCallbacks.set(testRunId, callback);
  }

  /**
   * Remove log callback
   */
  removeLogCallback(testRunId: string): void {
    this.logCallbacks.delete(testRunId);
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(testRunId: string, progress: ExecutionProgress): void {
    const callback = this.progressCallbacks.get(testRunId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Dispatch locator failure event for self-healing
   */
  private dispatchLocatorFailure(testRunId: string, errorMsg: string): void {
    // no-op: self-healing locator failure dispatch removed
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): TestRun[] {
    return Array.from(this.activeRuns.values());
  }
}

// Export singleton instance
export const testExecutor = new TestExecutor();
