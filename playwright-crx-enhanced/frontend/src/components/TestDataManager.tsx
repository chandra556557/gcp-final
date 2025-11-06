import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, Play, Download, Upload, Search, Filter, Eye, EyeOff } from 'lucide-react';
import './Dashboard.css';
import './ImportScriptModal.css';

const TestDataManager = () => {
  const [testSuites, setTestSuites] = useState([]);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [testData, setTestData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnv, setFilterEnv] = useState('all');
  const [showPasswords, setShowPasswords] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    environment: 'dev',
    type: 'user',
    data: {}
  });

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const suitesResult = await window.storage.get('test-suites');
      const dataResult = await window.storage.get('test-data');
      
      if (suitesResult) setTestSuites(JSON.parse(suitesResult.value));
      if (dataResult) setTestData(JSON.parse(dataResult.value));
    } catch (error) {
      // Initialize with default data if not found
      const defaultSuites = [
        { id: '1', name: 'Login Tests', description: 'User login test scenarios' },
        { id: '2', name: 'E-commerce Tests', description: 'Shopping cart and checkout tests' }
      ];
      const defaultData = [
        {
          id: '1',
          suiteId: '1',
          name: 'Valid User',
          environment: 'dev',
          type: 'user',
          data: { username: 'testuser@example.com', password: 'Test@123', role: 'admin' }
        },
        {
          id: '2',
          suiteId: '2',
          name: 'Test Product',
          environment: 'staging',
          type: 'product',
          data: { sku: 'PROD001', name: 'Test Widget', price: 29.99 }
        }
      ];
      setTestSuites(defaultSuites);
      setTestData(defaultData);
      await window.storage.set('test-suites', JSON.stringify(defaultSuites));
      await window.storage.set('test-data', JSON.stringify(defaultData));
    }
  };

  const saveData = async (suites, data) => {
    try {
      await window.storage.set('test-suites', JSON.stringify(suites));
      await window.storage.set('test-data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const openModal = (mode, item = null) => {
    setModalMode(mode);
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        name: '',
        environment: 'dev',
        type: 'user',
        data: {}
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (modalMode === 'create') {
      const newItem = {
        ...formData,
        id: Date.now().toString(),
        suiteId: selectedSuite?.id || '1'
      };
      const updated = [...testData, newItem];
      setTestData(updated);
      await saveData(testSuites, updated);
    } else {
      const updated = testData.map(item => 
        item.id === formData.id ? formData : item
      );
      setTestData(updated);
      await saveData(testSuites, updated);
    }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this test data?')) {
      const updated = testData.filter(item => item.id !== id);
      setTestData(updated);
      await saveData(testSuites, updated);
    }
  };

  const handleDuplicate = async (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      name: `${item.name} (Copy)`
    };
    const updated = [...testData, newItem];
    setTestData(updated);
    await saveData(testSuites, updated);
  };

  const exportData = () => {
    const exportObj = {
      suites: testSuites,
      data: filteredData
    };
    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `testdata-${Date.now()}.json`);
    link.click();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (imported.suites) setTestSuites(imported.suites);
          if (imported.data) setTestData(imported.data);
          await saveData(imported.suites || testSuites, imported.data || testData);
          alert('Data imported successfully!');
        } catch (error) {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const generatePlaywrightCode = (item) => {
    const code = `// Playwright Test Data - ${item.name}
const testData = ${JSON.stringify(item.data, null, 2)};

// Usage in your test:
test('${item.name}', async ({ page }) => {
  await page.goto('your-url');
  ${item.type === 'user' ? `await page.fill('#username', testData.username);
  await page.fill('#password', testData.password);` : '// Use testData properties as needed'}
});`;
    
    navigator.clipboard.writeText(code);
    alert('Playwright code copied to clipboard!');
  };

  const filteredData = testData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnv = filterEnv === 'all' || item.environment === filterEnv;
    const matchesSuite = !selectedSuite || item.suiteId === selectedSuite.id;
    return matchesSearch && matchesEnv && matchesSuite;
  });

  const togglePasswordVisibility = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="view-container">
      <h1 className="view-title">Test Data Management</h1>

      {/* Header and Import/Export */}
      <div className="content-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Manage test data for Playwright automation</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Upload className="w-4 h-4" />
              Import
              <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
            </label>
            <button onClick={exportData} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Test Suites */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <button
            onClick={() => setSelectedSuite(null)}
            className={!selectedSuite ? 'btn-primary' : 'btn-secondary'}
          >
            All Suites
          </button>
          {testSuites.map((suite: any) => (
            <button
              key={suite.id}
              onClick={() => setSelectedSuite(suite)}
              className={selectedSuite?.id === suite.id ? 'btn-primary' : 'btn-secondary'}
            >
              {suite.name}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="content-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ position: 'relative' }}>
              <Search className="w-5 h-5" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search test data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter className="w-5 h-5" style={{ color: '#6b7280' }} />
            <select
              value={filterEnv}
              onChange={(e) => setFilterEnv(e.target.value)}
              className="input"
            >
              <option value="all">All Environments</option>
              <option value="dev">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          <button onClick={() => openModal('create')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus className="w-5 h-5" />
            Add Test Data
          </button>
        </div>
      </div>

      {/* Test Data Grid */}
      <div className="stats-grid">
        {filteredData.map(item => (
          <div key={item.id} className="content-card">
            <div className="card-header">
              <div>
                <h3>{item.name}</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="language-badge" style={{ background: '#9333ea' }}>{item.environment}</span>
                  <span className="language-badge" style={{ background: '#3b82f6' }}>{item.type}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 12, maxHeight: 160, overflowY: 'auto' }}>
              <pre style={{ fontSize: 13, color: '#1f2937' }}>
                {Object.entries(item.data).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: 4 }}>
                    <span style={{ color: '#6b21a8', fontWeight: 600 }}>{key}:</span>{' '}
                    {key.toLowerCase().includes('password') ? (
                      <span>
                        {showPasswords[item.id] ? String(value) : '••••••••'}
                        <button onClick={() => togglePasswordVisibility(item.id)} className="btn-secondary" style={{ marginLeft: 8, padding: '2px 6px' }}>
                          {showPasswords[item.id] ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                        </button>
                      </span>
                    ) : (
                      String(value)
                    )}
                  </div>
                ))}
              </pre>
            </div>

            <div className="run-actions">
              <button onClick={() => generatePlaywrightCode(item)} className="btn-approve" title="Generate Playwright code">
                <Play className="w-4 h-4" />
              </button>
              <button onClick={() => handleDuplicate(item)} className="btn-secondary" title="Duplicate">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={() => openModal('edit', item)} className="btn-primary" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(item.id)} className="btn-reject" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="empty-state">
          <p className="benefit-text">No test data found. Create your first test data entry!</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create Test Data' : 'Edit Test Data'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="settings-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Valid Admin User"
                  />
                </div>
                <div className="form-group">
                  <label>Environment</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="form-select"
                  >
                    <option value="dev">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="user">User</option>
                    <option value="product">Product</option>
                    <option value="api">API</option>
                    <option value="config">Config</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Test Data (JSON)</label>
                <textarea
                  value={JSON.stringify(formData.data, null, 2)}
                  onChange={(e) => {
                    try {
                      setFormData({ ...formData, data: JSON.parse(e.target.value) });
                    } catch (err) {
                      // Invalid JSON, keep existing
                    }
                  }}
                  className="form-textarea"
                  rows={8}
                  placeholder='{"username": "test@example.com", "password": "Test@123"}'
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>
                  {modalMode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestDataManager;