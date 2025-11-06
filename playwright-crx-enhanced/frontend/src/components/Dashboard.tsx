import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ApiTesting from './ApiTesting';
import TestDataManager from './TestDataManager';
import ScriptCueCards from './ScriptCueCards';
import ImportScriptModal from './ImportScriptModal';
import './Dashboard.css';

const API_URL = 'http://localhost:3001/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

interface Script {
  id: string;
  name: string;
  language: string;
  description?: string;
  createdAt: string;
  user: { name: string; email: string };
  project?: { name: string } | null;
  projectId?: string;
}

interface TestRun {
  id: string;
  status: string;
  duration?: number;
  startedAt: string;
  executionReportUrl?: string;
  script: { name: string };
}

interface Stats {
  totalScripts: number;
  totalRuns: number;
  successRate: number;
}

type ActiveView = 
  | 'overview' 
  | 'scripts' 
  | 'runs' 
  | 'testdata' 
  | 'apitesting' 
  | 'allure'
  | 'analytics'
  | 'settings';

export const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [projectLoading, setProjectLoading] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [stats, setStats] = useState<Stats>({ totalScripts: 0, totalRuns: 0, successRate: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [projectReports, setProjectReports] = useState<Array<{ id: string; scriptName: string; status: string; startedAt: string; completedAt?: string; reportUrl: string }>>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importingSample, setImportingSample] = useState(false);
  const [importScriptModalOpen, setImportScriptModalOpen] = useState(false);
  const [currentScriptForModal, setCurrentScriptForModal] = useState<{ id: string; name: string; language?: string } | null>(null);
  // Pagination controls for Test Runs
  const [runsPageSize, setRunsPageSize] = useState<number>(10);
  const [runsPage, setRunsPage] = useState<number>(1);

  const token = localStorage.getItem('accessToken');
  const headers = { Authorization: `Bearer ${token}` };

  // Reset pagination when project filter or runs change
  useEffect(() => {
    setRunsPage(1);
  }, [selectedProjectId, testRuns.length]);

  // Avoid overlapping requests and add gentle backoff for rate limits
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const fetchWithBackoff = async <T,>(
    url: string,
    options: any,
    retries = 1,
    backoffMs = 1500
  ): Promise<T | null> => {
    try {
      const res = await axios.get(url, options);
      return (res.data?.data || res.data) as T;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429 && retries > 0) {
        console.warn('Rate limited on', url, '— backing off', backoffMs, 'ms');
        await delay(backoffMs);
        return fetchWithBackoff<T>(url, options, retries - 1, backoffMs * 2);
      }
      console.error(`Error loading ${url}:`, err);
      return null;
    }
  };

  useEffect(() => {
    loadProjects();
    loadData(); // Load scripts on initial mount
    // Preload reports for default selection
    loadProjectReports();
  }, []);

  useEffect(() => {
    // Reload data when project changes
    loadData();
    // Also reload reports list for the selected project
    loadProjectReports();
  }, [selectedProjectId]);

  useEffect(() => {
    if (activeView === 'allure') {
      loadProjectReports();
    }
  }, [activeView]);

  const loadProjects = async () => {
    setProjectLoading(true);
    try {
      const res = await axios.get(`${API_URL}/projects`, { headers });
      const list: Project[] = res.data?.data || res.data?.projects || [];
      setProjects(list);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setProjectLoading(false);
    }
  };

  const importSampleScript = async () => {
    if (!token) {
      alert('Please log in to import a sample script');
      return;
    }
    setImportingSample(true);
    try {
      const sampleCode = `import { test, expect } from '@playwright/test';
test('sample login flow', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('h1')).toContainText('Example');
});\n`;
      const payload = {
        name: `Sample Script ${new Date().toLocaleTimeString()}`,
        description: 'Starter script imported from UI',
        language: 'typescript',
        code: sampleCode,
        projectId: selectedProjectId || null,
      };
      await axios.post(`${API_URL}/scripts`, payload, { headers });
      await loadData();
    } catch (error: any) {
      alert('Failed to import sample script: ' + (error?.response?.data?.error || error?.message || 'Unknown error'));
    } finally {
      setImportingSample(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      alert('Project name is required');
      return;
    }
    setProjectLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/projects`,
        { name: newProjectName.trim(), description: newProjectDescription.trim() || undefined },
        { headers }
      );
      const created: Project = res.data?.data || res.data?.project;
      await loadProjects();
      if (created?.id) setSelectedProjectId(created.id);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert('Failed to create project: ' + (error.response?.data?.error || error.message));
    } finally {
      setProjectLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProjectId) {
        params.projectId = selectedProjectId;
      }
      
      // Scripts load (standard)
      const scriptsRes = await axios.get(`${API_URL}/scripts`, { headers, params }).catch((err) => {
        console.error('Error loading scripts:', err);
        return { data: { data: [] } } as any;
      });
      const scriptData = scriptsRes?.data?.scripts || scriptsRes?.data?.data || [];

      // Test runs load with 429 backoff
      const runDataRaw = await fetchWithBackoff<any[]>(`${API_URL}/test-runs`, { headers, params }, 1, 1500);
      const runData = Array.isArray(runDataRaw)
        ? runDataRaw
        : (runDataRaw && (runDataRaw as any).testRuns) || [];

      console.log('Loaded scripts:', scriptData.length);
      console.log('Loaded test runs:', Array.isArray(runData) ? runData.length : 0);

      setScripts(scriptData);
      setTestRuns(runData);

      const successCount = runData.filter((r: TestRun) => r.status === 'passed').length;
      setStats({
        totalScripts: scriptData.length,
        totalRuns: runData.length,
        successRate: runData.length > 0 ? Math.round((successCount / runData.length) * 100) : 0
      });
    } catch (error: any) {
      console.error('Error loading data:', error);
      // Set empty data on error to prevent crashes
      setScripts([]);
      setTestRuns([]);
      setStats({
        totalScripts: 0,
        totalRuns: 0,
        successRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const generateExecutionReport = async (testRunId: string) => {
    setGeneratingReport(testRunId);
    try {
      const response = await axios.post(`${API_URL}/allure/generate/${testRunId}`, {}, { headers });
      await loadData();
      setSelectedReport(response.data.reportUrl);
      setActiveView('allure');
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport(null);
    }
  };

  const loadProjectReports = async () => {
    try {
      const params: any = {};
      if (selectedProjectId) params.projectId = selectedProjectId;
      const res = await axios.get(`${API_URL}/allure/reports/by-project`, { headers, params });
      const list = res.data?.data || [];
      setProjectReports(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Error loading project reports:', e);
      setProjectReports([]);
    }
  };

  const handleImportScriptAndGenerateReport = async (scriptId: string, projectId?: string) => {
    try {
      // Get the script to find its project
      const scriptRes = await axios.get(`${API_URL}/scripts/${scriptId}`, { headers });
      const script = scriptRes.data?.data || scriptRes.data;
      const scriptProjectId = projectId || script.projectId;

      // First, check if there are existing test runs for this script
      const runsRes = await axios.get(`${API_URL}/test-runs`, {
        headers,
        params: { scriptId, projectId: scriptProjectId }
      });

      const existingRuns = runsRes.data?.data || [];
      let testRunId: string;

      // If there are existing test runs, use the most recent one
      if (existingRuns.length > 0) {
        // Sort by startedAt descending and get the most recent
        const sortedRuns = existingRuns.sort((a: TestRun, b: TestRun) => 
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        const mostRecentRun = sortedRuns[0];
        
        // If it already has a report, use it
        if (mostRecentRun.executionReportUrl) {
          setSelectedReport(mostRecentRun.executionReportUrl);
          // Filter by project and script
          if (scriptProjectId) {
            setSelectedProjectId(scriptProjectId);
          }
          setActiveView('allure');
          await loadData();
          return;
        }
        
        testRunId = mostRecentRun.id;
      } else {
        // Create a new test run
        const testRunRes = await axios.post(
          `${API_URL}/test-runs/start`,
          { scriptId },
          { headers }
        );
        testRunId = testRunRes.data.data?.id || testRunRes.data.id;

        // Wait for test run to complete (poll for status)
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
          
          const statusRes = await axios.get(`${API_URL}/test-runs/${testRunId}`, { headers });
          const status = statusRes.data.data?.status || statusRes.data.status;
          
          if (status === 'passed' || status === 'failed' || status === 'completed') {
            break;
          }
          
          attempts++;
        }
      }

      // Generate Allure report
      const reportRes = await axios.post(
        `${API_URL}/allure/generate/${testRunId}`,
        {},
        { headers }
      );

      // Set project filter if available
      if (scriptProjectId) {
        setSelectedProjectId(scriptProjectId);
      }

      // Reload data to get updated test runs
      await loadData();

      // Redirect to execution reports (allure) view to show the generated report
      if (reportRes.data.reportUrl) {
        setSelectedReport(reportRes.data.reportUrl);
        setActiveView('allure');
      } else {
        // If no report URL, still go to runs view
        setActiveView('runs');
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to generate report');
    }
  };

  // Derived pagination values
  const totalRuns = testRuns.length;
  const totalPages = Math.max(1, Math.ceil(totalRuns / runsPageSize));
  const pagedRuns = useMemo(() => {
    const start = (runsPage - 1) * runsPageSize;
    const end = start + runsPageSize;
    return testRuns.slice(start, end);
  }, [testRuns, runsPage, runsPageSize]);

  const handleOpenImportScriptModal = (script: { id: string; name: string; language?: string }) => {
    console.log('Opening import script modal for:', script);
    try {
      setCurrentScriptForModal(script);
      setImportScriptModalOpen(true);
      console.log('Modal state set to open');
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  };

  const handleCloseImportScriptModal = () => {
    setImportScriptModalOpen(false);
    setCurrentScriptForModal(null);
  };


  const menuItems = [
    { id: 'overview', icon: '📊', label: 'Project Overview', category: 'Main' },
    { id: 'scripts', icon: '📝', label: 'Scripts', category: 'Test Management' },
    { id: 'runs', icon: '▶️', label: 'Test Runs', category: 'Test Management' },
    { id: 'testdata', icon: '🗄️', label: 'Test Data', category: 'Data Management' },
    { id: 'apitesting', icon: '🔌', label: 'API Testing', category: 'Testing Tools' },
    { id: 'allure', icon: '📈', label: 'Execution Reports', category: 'Reports' },
    { id: 'analytics', icon: '📉', label: 'Analytics', category: 'Reports' },
    { id: 'settings', icon: '⚙️', label: 'Settings', category: 'System' }
  ];

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const currentProjectName = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)?.name || 'Unknown Project'
    : 'No Project';

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>🎭 Playwright CRX</h2>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
          <button
            className="btn-secondary"
            style={{ marginLeft: 8 }}
            onClick={() => {
              localStorage.removeItem('accessToken');
              window.location.reload();
            }}
          >
            🚪 Logout
          </button>
        </div>

        {/* Project badge */}
        <div className="project-badge" style={{ padding: '8px 12px', color: '#888' }}>
          Project: <strong>{currentProjectName}</strong>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(groupedMenuItems).map(([category, items]) => (
            <div key={category} className="nav-category">
              <div className="category-label">{category}</div>
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveView(item.id as ActiveView);
                    setMenuOpen(false);
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Overview */}
          {activeView === 'overview' && (
            <div className="view-container">
              <h1 className="view-title">Project Overview</h1>

              {/* Project Controls */}
              <div className="project-controls" style={{ marginBottom: 24 }}>
                <h2>Project</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="content-card">
                    <div className="form-group">
                      <label>Selected Project</label>
                      <select
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value || null)}
                        disabled={projectLoading}
                        className="form-select"
                      >
                        <option value="">All Projects</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-secondary" onClick={loadProjects} disabled={projectLoading}>
                        {projectLoading ? '🔄 Refreshing...' : '🔄 Refresh'}
                      </button>
                      <button className="btn-secondary" onClick={loadData} disabled={loading}>
                        {loading ? '⏳ Loading...' : '↻ Reload Data'}
                      </button>
                    </div>
                  </div>

                  <div className="content-card">
                    <h3>Create Project</h3>
                    <div className="form-group">
                      <label>Project Name</label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g., Checkout Flow"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Description (optional)</label>
                      <textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Short description"
                        className="form-textarea"
                        rows={3}
                      />
                    </div>
                    <button className="btn-primary" onClick={createProject} disabled={projectLoading}>
                      {projectLoading ? '⏳ Creating...' : '➕ Create Project'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="action-grid">
                  <button className="action-card" onClick={() => setActiveView('scripts')}>
                    <span className="action-icon">📝</span>
                    <span className="action-label">View Scripts</span>
                  </button>
                  <button className="action-card" onClick={() => setActiveView('runs')}>
                    <span className="action-icon">▶️</span>
                    <span className="action-label">Test Runs</span>
                  </button>
                  <button className="action-card" onClick={() => setActiveView('apitesting')}>
                    <span className="action-icon">🔌</span>
                    <span className="action-label">API Testing</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity">
                <h2>Recent Test Runs</h2>
                <div className="activity-list">
                  {testRuns.slice(0, 5).map((run) => (
                    <div key={run.id} className="activity-item">
                      <div className="activity-icon">
                        {run.status === 'passed' ? '✅' : run.status === 'failed' ? '❌' : '⏳'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{run.script.name}</div>
                        <div className="activity-meta">
                          {new Date(run.startedAt).toLocaleString()}
                          {run.duration && ` • ${run.duration}ms`}
                        </div>
                      </div>
                      <span className={`status-badge ${run.status}`}>{run.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scripts View */}
          {activeView === 'scripts' && (
          <div className="view-container">
            <h1 className="view-title">Test Scripts</h1>
            <div style={{ marginBottom: 12, color: '#666' }}>
              Filter: <strong>{selectedProjectId ? currentProjectName : 'All Projects'}</strong>
              {selectedProjectId && (
                <button
                  className="btn-link"
                  style={{ marginLeft: 8, padding: 0, border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer' }}
                  onClick={() => setSelectedProjectId(null)}
                  title="Clear project filter"
                >
                  Clear Filter
                </button>
              )}
              <button
                className="btn-secondary"
                style={{ marginLeft: 12 }}
                onClick={() => handleOpenImportScriptModal({ id: 'new', name: 'New Script', language: 'typescript' })}
                disabled={loading}
                title="Import script from database"
              >
                📥 Import Script
              </button>
            </div>
            {loading ? (
              <div className="loading-state">Loading scripts...</div>
            ) : (
              <>
                <div className="content-card" style={{ marginTop: 16 }}>
                  <div className="card-header">
                    <h3>New Script Workflow</h3>
                    <span className="language-badge">typescript</span>
                  </div>
                  <p className="card-description">Guided 5-step process for creating and running tests.</p>
                </div>
                <ScriptCueCards
                  layout="standalone"
                  showHeader={false}
                  script={{ id: 'new', name: 'New Script', language: 'typescript' }}
                  onGenerate={() => handleOpenImportScriptModal({ id: 'new', name: 'New Script', language: 'typescript' })}
                  onEnhance={() => alert('AI Enhancement coming soon')}
                  onValidate={() => alert('Open review flow coming soon')}
                  onFinalize={() => setActiveView('runs')}
                  onInsights={() => setActiveView('analytics')}
                />
              </>
            )}
          </div>
          )}

          {/* Test Runs View */}
          {activeView === 'runs' && (
            <div className="view-container">
              <h1 className="view-title">Test Runs</h1>
              <div style={{ marginBottom: 12, color: '#666' }}>
                Filter: <strong>{selectedProjectId ? currentProjectName : 'All Projects'}</strong>
              </div>
              {loading ? (
                <div className="loading-state">Loading test runs...</div>
              ) : testRuns.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">▶️</div>
                  <h3>No Test Runs Yet</h3>
                  <p>Execute tests using the extension to see results here!</p>
                </div>
              ) : (
                <div className="runs-list">
                  {pagedRuns.map((run) => (
                    <div key={run.id} className="run-card">
                      <div className="run-header">
                        <div className="run-info">
                          <h3>{run.script.name}</h3>
                          <div className="run-meta">
                            <span className={`status-badge ${run.status}`}>{run.status}</span>
                            <span>🕒 {new Date(run.startedAt).toLocaleString()}</span>
                            {run.duration && <span>⏱️ {run.duration}ms</span>}
                          </div>
                        </div>
                        <div className="run-actions">
                          {run.executionReportUrl ? (
                            <button
                              className="btn-secondary"
                              onClick={() => {
                                setSelectedReport(run.executionReportUrl!);
                                setActiveView('allure');
                              }}
                            >
                              📊 View Report
                            </button>
                          ) : (
                            <button
                              className="btn-primary"
                              onClick={() => generateExecutionReport(run.id)}
                              disabled={generatingReport === run.id}
                            >
                              {generatingReport === run.id ? '⏳ Generating...' : '📊 Generate Report'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Pagination Controls */}
                  <div className="pagination" aria-label="Test runs pagination" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                    <span style={{ color: '#666' }}>
                      Showing {Math.min((runsPage - 1) * runsPageSize + 1, totalRuns)}–{Math.min(runsPage * runsPageSize, totalRuns)} of {totalRuns}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => setRunsPage((p) => Math.max(1, p - 1))}
                        disabled={runsPage <= 1}
                        aria-label="Previous page"
                      >
                        ← Prev
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setRunsPage((p) => Math.min(totalPages, p + 1))}
                        disabled={runsPage >= totalPages}
                        aria-label="Next page"
                      >
                        Next →
                      </button>
                    </div>
                    <label htmlFor="runs-page-size" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      Page size:
                      <select
                        id="runs-page-size"
                        value={runsPageSize}
                        onChange={(e) => setRunsPageSize(parseInt(e.target.value, 10))}
                        aria-label="Select page size"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Test Data Management */}
          {activeView === 'testdata' && (
            <TestDataManager selectedProjectId={selectedProjectId} />
          )}

          {/* API Testing */}
          {activeView === 'apitesting' && <ApiTesting />}

          {/* Execution Reports */}
          {activeView === 'allure' && (
            <div className="view-container full-height">
              <h1 className="view-title">Execution Reports</h1>
              {selectedReport ? (
                <div className="report-viewer">
                  <div className="report-header">
                    <button className="btn-secondary" onClick={() => setSelectedReport(null)}>
                      ← Back to Runs
                    </button>
                  </div>
                  <iframe
                    src={`http://localhost:3001${selectedReport}`}
                    className="report-iframe"
                    title="Execution Report"
                  />
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 12, color: '#666' }}>
                    Project: <strong>{selectedProjectId ? currentProjectName : 'All Projects'}</strong>
                  </div>
                  {projectReports.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📊</div>
                      <h3>No Reports Found</h3>
                      <p>Select a project or generate a report from Test Runs.</p>
                      <button className="btn-primary" onClick={() => setActiveView('runs')}>
                        View Test Runs
                      </button>
                    </div>
                  ) : (
                    <div className="runs-list">
                      {projectReports.map((rep) => (
                        <div key={rep.id} className="run-card">
                          <div className="run-header">
                            <div className="run-info">
                              <h3>{rep.scriptName}</h3>
                              <div className="run-meta">
                                <span className={`status-badge ${rep.status}`}>{rep.status}</span>
                                <span>🕒 {new Date(rep.startedAt).toLocaleString()}</span>
                                {rep.completedAt && <span>✅ {new Date(rep.completedAt).toLocaleString()}</span>}
                              </div>
                            </div>
                            <div className="run-actions">
                              <button
                                className="btn-secondary"
                                onClick={() => {
                                  setSelectedReport(rep.reportUrl);
                                }}
                              >
                                📊 View Report
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analytics */}
          {activeView === 'analytics' && (
            <div className="view-container">
              <h1 className="view-title">Analytics</h1>
              <div className="empty-state">
                <div className="empty-icon">📉</div>
                <h3>Analytics Dashboard</h3>
                <p>Analytics and trend reports are under construction.</p>
              </div>
            </div>
          )}

          {/* Settings */}
          {activeView === 'settings' && (
            <div className="view-container">
              <h1 className="view-title">Settings</h1>
              <div className="empty-state">
                <div className="empty-icon">⚙️</div>
                <h3>System Settings</h3>
                <p>Configure system-wide settings, integrations, and defaults here.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Import Script Modal */}
      {importScriptModalOpen && (
        <ImportScriptModal
          isOpen={importScriptModalOpen}
          onClose={handleCloseImportScriptModal}
          onGenerateReport={handleImportScriptAndGenerateReport}
          currentScriptId={currentScriptForModal?.id}
        />
      )}
    </div>
  );
};

export default Dashboard;