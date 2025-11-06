import axios from 'axios';
import * as dotenv from 'dotenv';
import * as http from 'http';

dotenv.config();

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
  data?: any;
}

const results: TestResult[] = [];
let authToken: string | null = null;
let testUserId: string | null = null;
let testProjectId: string | null = null;
let testScriptId: string | null = null;
let testRunId: string | null = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message: string) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${message}`, colors.bold + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logInfo(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

async function testEndpoint(name: string, testFn: () => Promise<any>): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    logInfo(`${name} - PASSED (${duration}ms)`);
    return { name, passed: true, message: 'OK', duration, data: result };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const message = error.response?.data?.error || error.message || 'Unknown error';
    logError(`${name} - FAILED (${duration}ms): ${message}`);
    if (error.response?.data) {
      logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { name, passed: false, message, duration };
  }
}

// Check if server is running
async function checkServer(): Promise<boolean> {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.data.status === 'ok') {
      logInfo(`Server is running on port ${PORT}`);
      return true;
    }
    return false;
  } catch (error) {
    logError(`Server is not running on port ${PORT}`);
    logError(`Please start the server with: npm run dev`);
    return false;
  }
}

// Test Authentication
async function testAuthentication() {
  logHeader('AUTHENTICATION TESTS');

  // Test 1: Login or Register
  await testEndpoint('Login/Register', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Try to register first
    try {
      const registerRes = await axios.post(`${API_URL}/auth/register`, {
        email: testEmail,
        password: testPassword,
        name: 'Test User',
      });
      testUserId = registerRes.data.data?.id || registerRes.data.id;
      authToken = registerRes.data.data?.accessToken || registerRes.data.accessToken;
      logInfo(`Registered new user: ${testEmail}`);
    } catch (error: any) {
      // If user exists, try to login
      if (error.response?.status === 409 || error.response?.status === 400) {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
          email: testEmail,
          password: testPassword,
        });
        authToken = loginRes.data.data?.accessToken || loginRes.data.accessToken;
        testUserId = loginRes.data.data?.user?.id || loginRes.data.user?.id;
        logInfo(`Logged in as existing user: ${testEmail}`);
      } else {
        throw error;
      }
    }

    if (!authToken) {
      throw new Error('Failed to get auth token');
    }

    return { token: authToken, userId: testUserId };
  });

  // Test 2: Get Current User
  await testEndpoint('Get Current User', async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  });
}

// Test Projects API
async function testProjects() {
  logHeader('PROJECTS API TESTS');

  // Test 1: Get Projects
  await testEndpoint('Get All Projects', async () => {
    const response = await axios.get(`${API_URL}/projects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const projects = response.data.data || response.data.projects || [];
    logInfo(`Found ${projects.length} projects`);
    return projects;
  });

  // Test 2: Create Project
  await testEndpoint('Create Project', async () => {
    const response = await axios.post(
      `${API_URL}/projects`,
      {
        name: `Test Project ${Date.now()}`,
        description: 'Test project for API testing',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    testProjectId = response.data.data?.id || response.data.id;
    logInfo(`Created project: ${testProjectId}`);
    return response.data;
  });
}

// Test Scripts API
async function testScripts() {
  logHeader('SCRIPTS API TESTS');

  // Test 1: Get All Scripts
  await testEndpoint('Get All Scripts', async () => {
    const response = await axios.get(`${API_URL}/scripts`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const scripts = response.data.data || response.data.scripts || [];
    logInfo(`Found ${scripts.length} scripts`);
    return scripts;
  });

  // Test 2: Get Scripts by Project
  if (testProjectId) {
    await testEndpoint('Get Scripts by Project', async () => {
      const response = await axios.get(`${API_URL}/scripts`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { projectId: testProjectId },
      });
      const scripts = response.data.data || response.data.scripts || [];
      logInfo(`Found ${scripts.length} scripts in project ${testProjectId}`);
      return scripts;
    });
  }

  // Test 3: Create Script
  await testEndpoint('Create Script', async () => {
    const response = await axios.post(
      `${API_URL}/scripts`,
      {
        name: `Test Script ${Date.now()}`,
        description: 'Test script for API testing',
        language: 'typescript',
        code: `test('sample test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button');
});`,
        projectId: testProjectId || null,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    testScriptId = response.data.data?.id || response.data.id;
    logInfo(`Created script: ${testScriptId}`);
    return response.data;
  });

  // Test 4: Get Script by ID
  if (testScriptId) {
    await testEndpoint('Get Script by ID', async () => {
      const response = await axios.get(`${API_URL}/scripts/${testScriptId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return response.data;
    });
  }
}

// Test Test Runs API (including new scriptId filter)
async function testTestRuns() {
  logHeader('TEST RUNS API TESTS');

  // Test 1: Get All Test Runs
  await testEndpoint('Get All Test Runs', async () => {
    const response = await axios.get(`${API_URL}/test-runs`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const runs = response.data.data || [];
    logInfo(`Found ${runs.length} test runs`);
    return runs;
  });

  // Test 2: Get Test Runs by Project (existing filter)
  if (testProjectId) {
    await testEndpoint('Get Test Runs by Project', async () => {
      const response = await axios.get(`${API_URL}/test-runs`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { projectId: testProjectId },
      });
      const runs = response.data.data || [];
      logInfo(`Found ${runs.length} test runs in project ${testProjectId}`);
      return runs;
    });
  }

  // Test 3: Get Test Runs by ScriptId (NEW FEATURE)
  if (testScriptId) {
    await testEndpoint('Get Test Runs by ScriptId (NEW)', async () => {
      const response = await axios.get(`${API_URL}/test-runs`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { scriptId: testScriptId },
      });
      const runs = response.data.data || [];
      logInfo(`Found ${runs.length} test runs for script ${testScriptId}`);
      return runs;
    });
  }

  // Test 4: Create Test Run
  if (testScriptId) {
    await testEndpoint('Create Test Run', async () => {
      const response = await axios.post(
        `${API_URL}/test-runs/start`,
        {
          scriptId: testScriptId,
          environment: 'development',
          browser: 'chromium',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      testRunId = response.data.data?.id || response.data.id;
      logInfo(`Created test run: ${testRunId}`);
      return response.data;
    });
  }

  // Test 5: Get Test Run by ID
  if (testRunId) {
    await testEndpoint('Get Test Run by ID', async () => {
      const response = await axios.get(`${API_URL}/test-runs/${testRunId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const status = response.data.data?.status || response.data.status;
      logInfo(`Test run status: ${status}`);
      return response.data;
    });
  }

  // Test 6: Get Test Runs by ScriptId again (after creating test run)
  if (testScriptId) {
    await testEndpoint('Get Test Runs by ScriptId (After Create)', async () => {
      const response = await axios.get(`${API_URL}/test-runs`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { scriptId: testScriptId },
      });
      const runs = response.data.data || [];
      logInfo(`Found ${runs.length} test runs for script ${testScriptId} (should be >= 1)`);
      if (runs.length === 0) {
        logWarning('No test runs found for script, but we just created one');
      }
      return runs;
    });
  }
}

// Test Allure API
async function testAllure() {
  logHeader('ALLURE API TESTS');

  // Test 1: Generate Report (if test run exists)
  if (testRunId) {
    await testEndpoint('Generate Allure Report', async () => {
      const response = await axios.post(
        `${API_URL}/allure/generate/${testRunId}`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      const reportUrl = response.data.reportUrl || response.data.data?.reportUrl;
      logInfo(`Generated report: ${reportUrl}`);
      return response.data;
    });
  } else {
    logWarning('Skipping Allure report generation - no test run available');
  }
}

// Print Summary
function printSummary() {
  logHeader('TEST SUMMARY');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => r.passed === false).length;
  const total = results.length;

  logInfo(`Total Tests: ${total}`);
  logInfo(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }

  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  logInfo(`Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    logHeader('FAILED TESTS');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        logError(`${r.name}: ${r.message}`);
      });
  }

  logHeader('RESULTS');
  if (failed === 0) {
    logInfo('🎉 All tests passed!', colors.green + colors.bold);
  } else {
    logError('❌ Some tests failed. Please check the errors above.', colors.red + colors.bold);
  }
}

// Main Test Function
async function runTests() {
  logHeader('IMPORT SCRIPT API TEST SUITE');
  logInfo(`Testing API at: ${API_URL}`);
  logInfo(`Timestamp: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  // Check server
  const serverRunning = await checkServer();
  if (!serverRunning) {
    logError('Cannot proceed without server running');
    process.exit(1);
  }

  try {
    // Run all tests
    await testAuthentication();
    await testProjects();
    await testScripts();
    await testTestRuns();
    await testAllure();

    const duration = Date.now() - startTime;
    logInfo(`\nAll tests completed in ${duration}ms`);
  } catch (error: any) {
    logError(`Test suite failed: ${error.message}`);
    console.error(error);
  } finally {
    printSummary();
  }
}

// Run tests
runTests().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

