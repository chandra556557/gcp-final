import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ImportScriptModal.css';

const API_URL = 'http://localhost:3001/api';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface Script {
  id: string;
  name: string;
  language: string;
  description?: string;
  projectId?: string;
  project?: { name: string } | null;
}

interface ImportScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateReport: (scriptId: string, projectId?: string) => Promise<void>;
  currentScriptId?: string;
}

const ImportScriptModal: React.FC<ImportScriptModalProps> = ({
  isOpen,
  onClose,
  onGenerateReport,
  currentScriptId
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem('accessToken');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (isOpen) {
      console.log('ImportScriptModal opened, currentScriptId:', currentScriptId);
      loadProjects();
      loadScripts(null);
      setSelectedProjectId(null);
      setSelectedScriptId(null);
      setError(null);

      // Focus management: focus first interactive control when opened
      setTimeout(() => {
        const projectSelect = document.getElementById('project-select');
        const scriptSelect = document.getElementById('script-select');
        const target = (scriptSelect as HTMLElement) || (projectSelect as HTMLElement);
        if (target) {
          target.focus();
        }
      }, 0);

      // Keyboard & focus trap inside the modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!modalRef.current) return;
        const focusableSelectors = [
          'a[href]','button:not([disabled])','textarea:not([disabled])','input:not([disabled])','select:not([disabled])','[tabindex]:not([tabindex="-1"])'
        ];
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors.join(','))
        ).filter(el => el.offsetParent !== null);

        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }

        if (e.key === 'Enter') {
          // Allow Enter to trigger generate when appropriate
          if (selectedScriptId && !generatingReport && !loadingScripts) {
            e.preventDefault();
            handleGenerateReport();
          }
          return;
        }

        if (e.key === 'Tab' && focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            // Shift+Tab: if focus is on first, loop to last
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            // Tab: if focus is on last, loop to first
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentScriptId]);

  useEffect(() => {
    if (isOpen) {
      loadScripts(selectedProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, isOpen]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await axios.get(`${API_URL}/projects`, { headers });
      const projectList: Project[] = res.data?.data || res.data?.projects || [];
      setProjects(projectList);
    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadScripts = async (projectId: string | null) => {
    setLoadingScripts(true);
    try {
      const params: any = {};
      if (projectId) {
        params.projectId = projectId;
      }
      const res = await axios.get(`${API_URL}/scripts`, { headers, params });
      const scriptList: Script[] = res.data?.data || res.data?.scripts || [];
      // Filter out current script if provided
      const filteredScripts = currentScriptId
        ? scriptList.filter((s) => s.id !== currentScriptId)
        : scriptList;
      setScripts(filteredScripts);
      // Auto-select the first script to make dropdown immediately usable
      if (!selectedScriptId && filteredScripts.length > 0) {
        setSelectedScriptId(filteredScripts[0].id);
      }
    } catch (err: any) {
      console.error('Error loading scripts:', err);
      setError('Failed to load scripts');
    } finally {
      setLoadingScripts(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedScriptId) {
      setError('Please select a script');
      return;
    }

    setGeneratingReport(true);
    setError(null);

    try {
      // Get the selected script to find its project
      const selectedScript = scripts.find(s => s.id === selectedScriptId);
      const projectId = selectedProjectId || selectedScript?.projectId;
      
      await onGenerateReport(selectedScriptId, projectId || undefined);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!isOpen) {
    console.log('Modal is not open, returning null');
    return null;
  }

  console.log('Rendering modal, isOpen:', isOpen);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        aria-describedby="import-modal-desc"
        aria-busy={loadingProjects || loadingScripts || generatingReport}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        <div className="modal-header">
          <h2 id="import-modal-title">Import Script & Generate Report</h2>
          <button className="modal-close" aria-label="Close dialog" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <p id="import-modal-desc" style={{ marginTop: -6, marginBottom: 8, color: '#666' }}>
            Choose a project (optional), select a script, then generate a report.
          </p>
          {error && (
            <div className="modal-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="project-select">Filter by Project (Optional):</label>
            <select
              id="project-select"
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              disabled={loadingProjects}
              aria-label="Filter scripts by project"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="script-select">Select Script:</label>
            {loadingScripts ? (
              <div className="loading-state">Loading scripts...</div>
            ) : scripts.length === 0 ? (
              <div className="empty-state">
                {selectedProjectId
                  ? 'No scripts found in this project'
                  : 'No scripts available'}
              </div>
            ) : (
              <select
                id="script-select"
                value={selectedScriptId || ''}
                onChange={(e) => setSelectedScriptId(e.target.value || null)}
                disabled={loadingScripts}
                aria-label="Select a script to generate a report"
              >
                <option value="">-- Select a script --</option>
                {scripts.map((script) => (
                  <option key={script.id} value={script.id}>
                    {script.name} {script.language && `(${script.language})`}
                    {script.project?.name && ` - ${script.project.name}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedScriptId && (
            <div className="selected-script-info">
              <strong>Selected:</strong> {scripts.find((s) => s.id === selectedScriptId)?.name}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={generatingReport} aria-label="Cancel and close dialog">
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleGenerateReport}
            disabled={!selectedScriptId || generatingReport || loadingScripts}
            aria-disabled={!selectedScriptId || generatingReport || loadingScripts}
            aria-label="Generate Playwright report for selected script"
          >
            {generatingReport ? '⏳ Generating Report...' : '📊 Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportScriptModal;

