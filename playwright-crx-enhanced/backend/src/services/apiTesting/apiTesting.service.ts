import pool from '../../db';

export interface ApiTestSuite {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  base_url?: string;
  headers?: Record<string, string>;
  auth_config?: any;
  created_at: Date;
  updated_at: Date;
}

export interface ApiTestCase {
  id: number;
  suite_id: number;
  name: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: string;
  expected_status?: number;
  expected_response?: any;
  assertions?: any[];
  timeout: number;
  retry_count: number;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ApiContract {
  id: number;
  suite_id: number;
  name: string;
  version: string;
  contract_type: 'openapi' | 'swagger' | 'graphql' | 'custom';
  contract_data: any;
  validation_rules?: any;
  created_at: Date;
  updated_at: Date;
}

export interface ApiMock {
  id: number;
  suite_id: number;
  name: string;
  endpoint: string;
  method: string;
  response_status: number;
  response_headers?: Record<string, string>;
  response_body?: string;
  response_delay: number;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ApiPerformanceBenchmark {
  id: number;
  test_case_id: number;
  run_id: string;
  response_time: number;
  status_code: number;
  success: boolean;
  error_msg?: string;
  timestamp: Date;
}

export class ApiTestingService {
  // ========== Test Suites ==========

  async createSuite(data: {
    name: string;
    description?: string;
    userId: number;
    baseUrl?: string;
    headers?: Record<string, string>;
    authConfig?: any;
  }): Promise<ApiTestSuite> {
    const { rows } = await pool.query(
      `INSERT INTO api_test_suites 
       (name, description, user_id, base_url, headers, auth_config)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.name,
        data.description || null,
        data.userId,
        data.baseUrl || null,
        data.headers ? JSON.stringify(data.headers) : null,
        data.authConfig ? JSON.stringify(data.authConfig) : null,
      ]
    );
    return rows[0];
  }

  async getSuites(userId: number): Promise<ApiTestSuite[]> {
    const { rows } = await pool.query(
      `SELECT * FROM api_test_suites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  async getSuite(id: number, userId: number): Promise<ApiTestSuite | null> {
    const { rows } = await pool.query(
      `SELECT * FROM api_test_suites WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async updateSuite(id: number, userId: number, data: Partial<ApiTestSuite>): Promise<ApiTestSuite | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.base_url !== undefined) {
      updates.push(`base_url = $${paramIndex++}`);
      values.push(data.base_url);
    }
    if (data.headers !== undefined) {
      updates.push(`headers = $${paramIndex++}`);
      values.push(JSON.stringify(data.headers));
    }

    if (updates.length === 0) return null;

    values.push(id, userId);
    const { rows } = await pool.query(
      `UPDATE api_test_suites SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async deleteSuite(id: number, userId: number): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM api_test_suites WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ========== Test Cases ==========

  async createTestCase(data: {
    suiteId: number;
    name: string;
    method: ApiTestCase['method'];
    endpoint: string;
    description?: string;
    headers?: Record<string, string>;
    body?: string;
    expectedStatus?: number;
    assertions?: any[];
  }): Promise<ApiTestCase> {
    const { rows } = await pool.query(
      `INSERT INTO api_test_cases 
       (suite_id, name, description, method, endpoint, headers, body, expected_status, assertions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.suiteId,
        data.name,
        data.description || null,
        data.method,
        data.endpoint,
        data.headers ? JSON.stringify(data.headers) : null,
        data.body || null,
        data.expectedStatus || null,
        data.assertions ? JSON.stringify(data.assertions) : null,
      ]
    );
    return rows[0];
  }

  async getTestCases(suiteId: number): Promise<ApiTestCase[]> {
    const { rows } = await pool.query(
      `SELECT * FROM api_test_cases WHERE suite_id = $1 ORDER BY created_at DESC`,
      [suiteId]
    );
    return rows;
  }

  async executeTestCase(testCaseId: number, userId: number): Promise<{
    success: boolean;
    responseTime: number;
    statusCode: number;
    response: any;
    assertionResults: any[];
  }> {
    // Get test case with suite info
    const { rows } = await pool.query(
      `SELECT tc.*, ts.base_url, ts.headers as suite_headers, ts.auth_config
       FROM api_test_cases tc
       JOIN api_test_suites ts ON ts.id = tc.suite_id
       WHERE tc.id = $1 AND ts.user_id = $2`,
      [testCaseId, userId]
    );

    if (rows.length === 0) throw new Error('Test case not found');

    const testCase = rows[0];
    const url = (testCase.base_url || '') + testCase.endpoint;
    const headers = { ...testCase.suite_headers, ...testCase.headers };

    const startTime = Date.now();
    let responseTime = 0;
    let statusCode = 0;
    let responseBody: any = null;
    let success = false;
    let assertionResults: any[] = [];

    try {
      const response = await fetch(url, {
        method: testCase.method,
        headers,
        body: testCase.body || undefined,
        signal: AbortSignal.timeout(testCase.timeout || 5000),
      });

      responseTime = Date.now() - startTime;
      statusCode = response.status;
      responseBody = await response.json().catch(() => response.text());

      // Execute assertions
      if (testCase.assertions) {
        const assertions = JSON.parse(testCase.assertions);
        assertionResults = assertions.map((assertion: any) => {
          return this.executeAssertion(assertion, response, responseBody);
        });
      }

      success = assertionResults.every(r => r.passed);

      // Record benchmark
      await this.recordBenchmark({
        testCaseId,
        runId: `run_${Date.now()}`,
        responseTime,
        statusCode,
        success,
      });

      return { success, responseTime, statusCode, response: responseBody, assertionResults };
    } catch (error: any) {
      responseTime = Date.now() - startTime;
      
      await this.recordBenchmark({
        testCaseId,
        runId: `run_${Date.now()}`,
        responseTime,
        statusCode: 0,
        success: false,
        errorMsg: error.message,
      });

      throw error;
    }
  }

  private executeAssertion(assertion: any, response: Response, body: any): any {
    const result = { ...assertion, passed: false, actual: null };

    switch (assertion.type) {
      case 'status':
        result.actual = response.status;
        result.passed = response.status === assertion.expected;
        break;
      case 'header':
        result.actual = response.headers.get(assertion.header);
        result.passed = result.actual === assertion.expected;
        break;
      case 'body_contains':
        result.actual = JSON.stringify(body);
        result.passed = result.actual.includes(assertion.expected);
        break;
      case 'json_path':
        result.actual = this.getJsonPath(body, assertion.path);
        result.passed = result.actual === assertion.expected;
        break;
    }

    return result;
  }

  private getJsonPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  }

  // ========== Contracts ==========

  async createContract(data: {
    suiteId: number;
    name: string;
    version: string;
    contractType: ApiContract['contract_type'];
    contractData: any;
  }): Promise<ApiContract> {
    const { rows } = await pool.query(
      `INSERT INTO api_contracts 
       (suite_id, name, version, contract_type, contract_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.suiteId, data.name, data.version, data.contractType, JSON.stringify(data.contractData)]
    );
    return rows[0];
  }

  async getContracts(suiteId: number): Promise<ApiContract[]> {
    const { rows } = await pool.query(
      `SELECT * FROM api_contracts WHERE suite_id = $1 ORDER BY created_at DESC`,
      [suiteId]
    );
    return rows;
  }

  // ========== Mocks ==========

  async createMock(data: {
    suiteId: number;
    name: string;
    endpoint: string;
    method: string;
    responseStatus?: number;
    responseBody?: string;
  }): Promise<ApiMock> {
    const { rows } = await pool.query(
      `INSERT INTO api_mocks 
       (suite_id, name, endpoint, method, response_status, response_body)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.suiteId, data.name, data.endpoint, data.method, data.responseStatus || 200, data.responseBody || null]
    );
    return rows[0];
  }

  async getMocks(suiteId: number): Promise<ApiMock[]> {
    const { rows } = await pool.query(
      `SELECT * FROM api_mocks WHERE suite_id = $1 ORDER BY created_at DESC`,
      [suiteId]
    );
    return rows;
  }

  // ========== Performance Benchmarks ==========

  async recordBenchmark(data: {
    testCaseId: number;
    runId: string;
    responseTime: number;
    statusCode: number;
    success: boolean;
    errorMsg?: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO api_performance_benchmarks 
       (test_case_id, run_id, response_time, status_code, success, error_msg)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.testCaseId, data.runId, data.responseTime, data.statusCode, data.success, data.errorMsg || null]
    );
  }

  async getBenchmarks(testCaseId: number, limit: number = 100): Promise<ApiPerformanceBenchmark[]> {
    const { rows } = await pool.query(
      `SELECT * FROM api_performance_benchmarks 
       WHERE test_case_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [testCaseId, limit]
    );
    return rows;
  }

  async getBenchmarkStats(testCaseId: number): Promise<{
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    successRate: number;
    totalRuns: number;
  }> {
    const { rows } = await pool.query(
      `SELECT 
         AVG(response_time) as avg_response_time,
         MIN(response_time) as min_response_time,
         MAX(response_time) as max_response_time,
         COUNT(CASE WHEN success THEN 1 END)::float / COUNT(*)::float * 100 as success_rate,
         COUNT(*) as total_runs
       FROM api_performance_benchmarks
       WHERE test_case_id = $1`,
      [testCaseId]
    );

    const stats = rows[0];
    return {
      avgResponseTime: parseFloat(stats.avg_response_time) || 0,
      minResponseTime: parseInt(stats.min_response_time) || 0,
      maxResponseTime: parseInt(stats.max_response_time) || 0,
      successRate: parseFloat(stats.success_rate) || 0,
      totalRuns: parseInt(stats.total_runs) || 0,
    };
  }

  // ========== AI-Assisted Assertion Suggestions ==========

  async generateAssertionSuggestions(input: {
    userId?: number;
    responseBody: any;
    status?: number;
    headers?: Record<string, string>;
    method?: string;
    endpoint?: string;
    maxSuggestions?: number;
  }): Promise<Array<{ id: string; path: string; op: 'equals' | 'contains' | 'exists' | 'status'; expected?: string; reason: string }>> {
    const out: Array<{ id: string; path: string; op: 'equals' | 'contains' | 'exists' | 'status'; expected?: string; reason: string }> = [];
    const max = Math.min(Math.max(input.maxSuggestions ?? 20, 1), 50);

    const enqueue = (s: { id: string; path: string; op: 'equals' | 'contains' | 'exists' | 'status'; expected?: string; reason: string }) => {
      if (out.length < max) out.push(s);
    };

    const walk = (node: any, basePath: string, depth: number) => {
      if (depth > 4) return;
      if (node === null || node === undefined) return;
      const t = typeof node;
      if (Array.isArray(node)) {
        enqueue({ id: this.randId(), path: basePath, op: 'exists', reason: 'Array exists' });
        if (node.length > 0) walk(node[0], basePath + '[0]', depth + 1);
        return;
      }
      if (t === 'object') {
        enqueue({ id: this.randId(), path: basePath || '', op: 'exists', reason: 'Object exists' });
        for (const k of Object.keys(node)) {
          const child = node[k];
          const childPath = basePath ? `${basePath}.${k}` : k;
          const ct = typeof child;
          if (child === null || child === undefined) {
            enqueue({ id: this.randId(), path: childPath, op: 'exists', reason: 'Field may be optional' });
            continue;
          }
          if (ct === 'string') {
            const sample = String(child);
            const snippet = sample.length > 24 ? sample.slice(0, 24) : sample;
            enqueue({ id: this.randId(), path: childPath, op: 'contains', expected: snippet, reason: 'String field contains sample' });
          } else if (ct === 'number' || ct === 'boolean') {
            enqueue({ id: this.randId(), path: childPath, op: 'equals', expected: String(child), reason: 'Primitive equals observed value' });
          } else if (Array.isArray(child)) {
            enqueue({ id: this.randId(), path: childPath, op: 'exists', reason: 'Array exists' });
            if (child.length > 0) walk(child[0], childPath + '[0]', depth + 1);
          } else if (ct === 'object') {
            walk(child, childPath, depth + 1);
          }
        }
        return;
      }
      if (t === 'string') {
        const sample = String(node);
        const snippet = sample.length > 24 ? sample.slice(0, 24) : sample;
        enqueue({ id: this.randId(), path: basePath, op: 'contains', expected: snippet, reason: 'String value contains sample' });
      } else {
        enqueue({ id: this.randId(), path: basePath, op: 'equals', expected: String(node), reason: 'Primitive equals observed value' });
      }
    };

    try {
      // Include status assertion if provided
      if (typeof input.status === 'number') {
        enqueue({ id: this.randId(), path: '', op: 'status', expected: String(input.status), reason: 'Match observed HTTP status' });
      }

      walk(input.responseBody, '', 0);

      // If headers present, propose existence checks for key headers
      const headers = input.headers || {};
      const headerKeys = Object.keys(headers);
      for (const hk of headerKeys.slice(0, 5)) {
        enqueue({ id: this.randId(), path: `headers.${hk}`, op: 'exists', reason: `Header '${hk}' is present` });
      }

      return out.slice(0, max);
    } catch (e: any) {
      // On error, return empty list rather than failing
      return [];
    }
  }

  private randId(): string { return Math.random().toString(36).slice(2); }
}

export const apiTestingService = new ApiTestingService();
