import React, { useEffect, useMemo, useState } from 'react';
import Ajv from 'ajv';
import type { AxiosRequestConfig, Method } from 'axios';
import axios from 'axios';

type KeyVal = { key: string; value: string };
type AssertionOp = 'equals' | 'contains' | 'exists' | 'status';
type BodyMode = 'none' | 'json' | 'text' | 'form';

interface Assertion {
  id: string;
  path: string; // dot-path e.g. data.user.name
  op: AssertionOp;
  expected?: string;
  result?: { pass: boolean; actual?: string; message?: string };
}

interface Env {
  name: string;
  variables: KeyVal[];
}

type Suggestion = {
  id: string;
  path: string;
  op: AssertionOp;
  expected?: string;
  reason: string;
};

const API_BASE = 'http://localhost:3001';

function useLocalStorage<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

function substituteVars(input: string, vars: KeyVal[]) {
  let out = input;
  for (const { key, value } of vars) {
    if (!key) continue;
    const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    out = out.replace(re, value);
  }
  return out;
}

function getByPath(obj: any, path: string): any {
  if (!path) return obj;
  return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

const defaultHeaders: KeyVal[] = [
  { key: 'Content-Type', value: 'application/json' },
];

const methods: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const ApiTesting: React.FC = () => {
  const token = localStorage.getItem('accessToken');

  // Request builder state
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useLocalStorage<KeyVal[]>('api.headers', defaultHeaders);
  const [bodyMode, setBodyMode] = useState<BodyMode>('none');
  const [bodyText, setBodyText] = useState('');
  const [formBody, setFormBody] = useState<KeyVal[]>([{ key: '', value: '' }]);

  // Env management
  const [envs, setEnvs] = useLocalStorage<Env[]>('api.envs', [
    { name: 'Default', variables: [{ key: 'baseUrl', value: API_BASE }] },
  ]);
  const [activeEnv, setActiveEnv] = useLocalStorage<string>('api.env.active', envs[0]?.name || 'Default');

  // Assertions and history
  const [assertions, setAssertions] = useLocalStorage<Assertion[]>('api.assertions', []);
  const [history, setHistory] = useLocalStorage<any[]>('api.history', []);

  // Response state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [respHeaders, setRespHeaders] = useState<Record<string, string>>({});
  const [respBody, setRespBody] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [openApiText, setOpenApiText] = useState<string>('');
  const [openApiSpec, setOpenApiSpec] = useState<any | null>(null);
  const [contractMessage, setContractMessage] = useState<string>('');
  const [contractErrors, setContractErrors] = useState<string[]>([]);

  const activeVars = useMemo(() => envs.find(e => e.name === activeEnv)?.variables || [], [envs, activeEnv]);

  const sendRequest = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    setRespHeaders({});
    setRespBody(null);
    try {
      const finalUrl = substituteVars(url, activeVars);
      const hdrs: Record<string, string> = {};
      for (const h of headers) {
        if (h.key) hdrs[h.key] = substituteVars(h.value, activeVars);
      }
      if (token && !hdrs['Authorization']) hdrs['Authorization'] = `Bearer ${token}`;

      const config: AxiosRequestConfig = { method, url: finalUrl, headers: hdrs };
      if (method !== 'GET' && method !== 'DELETE') {
        if (bodyMode === 'json' && bodyText.trim()) {
          config.data = JSON.parse(substituteVars(bodyText, activeVars));
        } else if (bodyMode === 'text') {
          config.data = substituteVars(bodyText, activeVars);
        } else if (bodyMode === 'form') {
          const form: Record<string, string> = {};
          for (const kv of formBody) if (kv.key) form[kv.key] = substituteVars(kv.value, activeVars);
          config.data = form;
        }
      }

      const start = performance.now();
      const res = await axios(config);
      const duration = Math.round(performance.now() - start);

      setStatus(res.status);
      setRespHeaders(res.headers as any);
      setRespBody(res.data);

      const histItem = {
        ts: new Date().toISOString(),
        method,
        url: finalUrl,
        status: res.status,
        duration,
      };
      setHistory([histItem, ...history].slice(0, 50));

      // evaluate assertions
      const evaluated = assertions.map(a => {
        const result: Assertion['result'] = { pass: false };
        try {
          if (a.op === 'status') {
            const exp = Number(a.expected || '200');
            result.pass = res.status === exp;
            result.actual = String(res.status);
            result.message = result.pass ? 'Status matches' : `Expected ${exp}, got ${res.status}`;
          } else {
            const val = getByPath(res.data, a.path);
            const actualStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
            result.actual = actualStr;
            if (a.op === 'exists') {
              result.pass = val !== undefined;
              result.message = result.pass ? 'Path exists' : 'Path not found';
            } else if (a.op === 'equals') {
              result.pass = actualStr === (a.expected || '');
              result.message = result.pass ? 'Equals' : 'Not equal';
            } else if (a.op === 'contains') {
              result.pass = actualStr.includes(a.expected || '');
              result.message = result.pass ? 'Contains' : 'Does not contain';
            }
          }
        } catch (e: any) {
          result.pass = false;
          result.message = e?.message || 'Evaluation error';
        }
        return { ...a, result };
      });
      setAssertions(evaluated);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeader = (i: number, field: keyof KeyVal, value: string) => {
    const copy = [...headers];
    copy[i] = { ...copy[i], [field]: value };
    setHeaders(copy);
  };
  const removeHeader = (i: number) => setHeaders(headers.filter((_, idx) => idx !== i));

  const addAssertion = () => {
    setAssertions([
      ...assertions,
      { id: Math.random().toString(36).slice(2), path: '', op: 'exists' },
    ]);
  };
  const updateAssertion = (id: string, patch: Partial<Assertion>) => {
    setAssertions(assertions.map(a => (a.id === id ? { ...a, ...patch } : a)));
  };
  const removeAssertion = (id: string) => setAssertions(assertions.filter(a => a.id !== id));

  const addEnv = () => setEnvs([...envs, { name: `Env ${envs.length + 1}`, variables: [] }]);
  const updateEnv = (idx: number, patch: Partial<Env>) => {
    const copy = [...envs];
    copy[idx] = { ...copy[idx], ...patch };
    setEnvs(copy);
  };
  const addEnvVar = (envIdx: number) => {
    const copy = [...envs];
    copy[envIdx].variables.push({ key: '', value: '' });
    setEnvs(copy);
  };
  const updateEnvVar = (envIdx: number, varIdx: number, field: keyof KeyVal, value: string) => {
    const copy = [...envs];
    copy[envIdx].variables[varIdx] = { ...copy[envIdx].variables[varIdx], [field]: value } as KeyVal;
    setEnvs(copy);
  };

  const genPlaywright = () => {
    const hdrs: Record<string, string> = {};
    headers.forEach(h => h.key && (hdrs[h.key] = substituteVars(h.value, activeVars)));
    const hdrStr = pretty(hdrs);
    let dataExpr = 'undefined';
    if (bodyMode === 'json' && bodyText.trim()) {
      try { JSON.parse(bodyText); dataExpr = bodyText; } catch { dataExpr = '/* invalid JSON */ {}'; }
    } else if (bodyMode === 'text' && bodyText.trim()) {
      dataExpr = '`' + bodyText.replace(/`/g, '\\`') + '`';
    } else if (bodyMode === 'form') {
      const form: Record<string, string> = {};
      formBody.forEach(kv => kv.key && (form[kv.key] = kv.value));
      dataExpr = JSON.stringify(form, null, 2);
    }
    const finalUrl = substituteVars(url, activeVars);
    const lines = [
      "import { test, expect } from '@playwright/test';",
      '',
      "test('API test', async ({ request }) => {",
      `  const res = await request.${method.toLowerCase()}('${finalUrl}', {`,
      '    headers: ' + hdrStr + ',',
      dataExpr !== 'undefined' ? '    data: ' + dataExpr + ',' : '',
      '  });',
      '  expect(res.status()).toBe(200);',
      '  const json = await res.json();',
      ...assertions.map(a => {
        if (a.op === 'status') return `  expect(res.status()).toBe(${Number(a.expected || '200')});`;
        const pathParts = a.path.split('.').map(p => `['${p}']`).join('');
        if (a.op === 'exists') return `  expect(json${pathParts}).toBeTruthy();`;
        if (a.op === 'equals') return `  expect(String(json${pathParts})).toBe('${(a.expected || '').replace(/'/g, "\\'")}');`;
        if (a.op === 'contains') return `  expect(String(json${pathParts})).toContain('${(a.expected || '').replace(/'/g, "\\'")}');`;
        return '';
      }),
      '});',
    ].filter(Boolean);
    return lines.join('\n');
  };

  // AI Suggestions from response body (heuristics)
  const generateSuggestions = () => {
    if (respBody == null) {
      setSuggestions([]);
      return;
    }
    const maxSuggestions = 20;
    const out: Suggestion[] = [];
    const enqueue = (s: Suggestion) => {
      if (out.length < maxSuggestions) out.push(s);
    };
    const walk = (node: any, basePath: string, depth: number) => {
      if (depth > 4) return; // limit depth
      if (node === null || node === undefined) return;
      const t = typeof node;
      if (Array.isArray(node)) {
        enqueue({ id: Math.random().toString(36).slice(2), path: basePath, op: 'exists', reason: 'Array exists' });
        if (node.length > 0) walk(node[0], basePath + '[0]', depth + 1);
        return;
      }
      if (t === 'object') {
        enqueue({ id: Math.random().toString(36).slice(2), path: basePath || '', op: 'exists', reason: 'Object exists' });
        for (const k of Object.keys(node)) {
          const child = node[k];
          const childPath = basePath ? `${basePath}.${k}` : k;
          const ct = typeof child;
          if (child === null || child === undefined) {
            enqueue({ id: Math.random().toString(36).slice(2), path: childPath, op: 'exists', reason: 'Field may be optional' });
            continue;
          }
          if (ct === 'string') {
            const sample = String(child);
            const snippet = sample.length > 24 ? sample.slice(0, 24) : sample;
            enqueue({ id: Math.random().toString(36).slice(2), path: childPath, op: 'contains', expected: snippet, reason: 'String field contains sample' });
          } else if (ct === 'number' || ct === 'boolean') {
            enqueue({ id: Math.random().toString(36).slice(2), path: childPath, op: 'equals', expected: String(child), reason: 'Primitive equals observed value' });
          } else if (Array.isArray(child)) {
            enqueue({ id: Math.random().toString(36).slice(2), path: childPath, op: 'exists', reason: 'Array exists' });
            if (child.length > 0) walk(child[0], childPath + '[0]', depth + 1);
          } else if (ct === 'object') {
            walk(child, childPath, depth + 1);
          }
        }
        return;
      }
      // primitives
      if (t === 'string') {
        const sample = String(node);
        const snippet = sample.length > 24 ? sample.slice(0, 24) : sample;
        enqueue({ id: Math.random().toString(36).slice(2), path: basePath, op: 'contains', expected: snippet, reason: 'String value contains sample' });
      } else {
        enqueue({ id: Math.random().toString(36).slice(2), path: basePath, op: 'equals', expected: String(node), reason: 'Primitive equals observed value' });
      }
    };
    try {
      walk(respBody, '', 0);
      // Always include a status assertion suggestion
      if (status !== null) {
        out.unshift({ id: Math.random().toString(36).slice(2), path: '', op: 'status', expected: String(status), reason: 'Match observed HTTP status' });
      }
      setSuggestions(out.slice(0, maxSuggestions));
    } catch (e) {
      setSuggestions([]);
    }
  };

  // AI Suggestions from backend endpoint
  const askBackendForSuggestions = async () => {
    if (respBody == null) {
      setSuggestions([]);
      return;
    }
    try {
      const headersObj = respHeaders || {};
      const payload = {
        responseBody: respBody,
        status: status ?? undefined,
        headers: headersObj,
        method: method || 'GET',
        endpoint: url || '',
        maxSuggestions: 20,
      };
      const res = await fetch(`${API_BASE}/api/api-testing/ai/assertions/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }
      const list = (data?.data || []) as Suggestion[];
      setSuggestions(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setSuggestions([]);
      setError(e?.message || 'Failed to get suggestions from backend');
    }
  };

  const addSuggestionToAssertions = (s: Suggestion) => {
    setAssertions([
      ...assertions,
      { id: Math.random().toString(36).slice(2), path: s.path, op: s.op, expected: s.expected },
    ]);
  };

  // Scenario Composer
  type ScenarioCapture = { path: string; var: string };
  type ScenarioStep = {
    id: string;
    name: string;
    method: Method;
    url: string;
    headers: KeyVal[];
    bodyMode: BodyMode;
    bodyText: string;
    formBody: KeyVal[];
    captures: ScenarioCapture[];
    lastStatus?: number;
    lastDuration?: number;
  };
  const [scenarioSteps, setScenarioSteps] = useLocalStorage<ScenarioStep[]>('api.scenario', []);

  const addScenarioStep = () => {
    setScenarioSteps([
      ...scenarioSteps,
      {
        id: Math.random().toString(36).slice(2),
        name: `Step ${scenarioSteps.length + 1}`,
        method: 'GET',
        url: '',
        headers: [],
        bodyMode: 'none',
        bodyText: '',
        formBody: [],
        captures: [],
      },
    ]);
  };
  const updateScenarioStep = (id: string, patch: Partial<ScenarioStep>) => {
    setScenarioSteps(scenarioSteps.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };
  const removeScenarioStep = (id: string) => setScenarioSteps(scenarioSteps.filter(s => s.id !== id));

  const runScenario = async () => {
    const localVars: KeyVal[] = [...activeVars];
    const setVar = (key: string, value: string) => {
      const idx = localVars.findIndex(v => v.key === key);
      if (idx >= 0) localVars[idx].value = value; else localVars.push({ key, value });
    };
    for (let i = 0; i < scenarioSteps.length; i++) {
      const step = scenarioSteps[i];
      const hdrs: Record<string, string> = {};
      for (const h of step.headers) {
        if (h.key) hdrs[h.key] = substituteVars(h.value, localVars);
      }
      const config: AxiosRequestConfig = {
        method: step.method,
        url: substituteVars(step.url, localVars),
        headers: hdrs,
      };
      if (step.method !== 'GET' && step.method !== 'DELETE') {
        if (step.bodyMode === 'json' && step.bodyText.trim()) {
          config.data = JSON.parse(substituteVars(step.bodyText, localVars));
        } else if (step.bodyMode === 'text') {
          config.data = substituteVars(step.bodyText, localVars);
        } else if (step.bodyMode === 'form') {
          const form: Record<string, string> = {};
          for (const kv of step.formBody) if (kv.key) form[kv.key] = substituteVars(kv.value, localVars);
          config.data = form;
        }
      }
      const start = performance.now();
      try {
        const res = await axios(config);
        const duration = Math.round(performance.now() - start);
        // capture variables
        for (const c of step.captures) {
          const val = getByPath(res.data, c.path);
          if (val !== undefined && c.var) setVar(c.var, typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
        updateScenarioStep(step.id, { lastStatus: res.status, lastDuration: duration });
      } catch (e: any) {
        const duration = Math.round(performance.now() - start);
        updateScenarioStep(step.id, { lastStatus: -1, lastDuration: duration });
        break; // stop on failure
      }
    }
  };

  // OpenAPI Contract Validation
  const parseOpenApi = () => {
    setContractMessage('');
    setContractErrors([]);
    try {
      const spec = JSON.parse(openApiText);
      setOpenApiSpec(spec);
      setContractMessage('OpenAPI spec loaded.');
    } catch (e: any) {
      setOpenApiSpec(null);
      setContractMessage('Failed to parse OpenAPI JSON.');
      setContractErrors([e?.message || 'Invalid JSON']);
    }
  };

  function pathToRegex(specPath: string): RegExp {
    // Convert "/users/{id}" to /^\/users\/[^/]+$/
    const escaped = specPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = '^' + escaped.replace(/\{[^}]+\}/g, '[^/]+') + '$';
    return new RegExp(pattern);
  }

  const validateAgainstOpenApi = () => {
    setContractMessage('');
    setContractErrors([]);
    if (!openApiSpec) {
      setContractMessage('Load an OpenAPI spec first.');
      return;
    }
    if (respBody == null || status == null) {
      setContractMessage('Send a request to get a response to validate.');
      return;
    }
    try {
      const u = new URL(substituteVars(url, activeVars));
      const path = u.pathname;
      const methodLower = (method || 'GET').toLowerCase();
      const paths = openApiSpec.paths || {};
      let matchedPathKey: string | null = null;
      for (const p of Object.keys(paths)) {
        const re = pathToRegex(p);
        if (re.test(path)) { matchedPathKey = p; break; }
      }
      if (!matchedPathKey) {
        setContractMessage(`No matching path in OpenAPI for '${path}'.`);
        return;
      }
      const op = paths[matchedPathKey][methodLower];
      if (!op) {
        setContractMessage(`Path '${matchedPathKey}' has no '${methodLower}' operation.`);
        return;
      }
      const statusStr = String(status);
      const respObj = (op.responses && (op.responses[statusStr] || op.responses['default'])) || null;
      if (!respObj) {
        setContractMessage(`No response schema for status ${statusStr}.`);
        return;
      }
      const content = respObj.content || {};
      const appJson = content['application/json'] || content['*/*'] || null;
      if (!appJson || !appJson.schema) {
        setContractMessage('No JSON schema found in OpenAPI response.');
        return;
      }
      const schema = appJson.schema;
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validate = ajv.compile(schema);
      const ok = validate(respBody);
      if (ok) {
        setContractMessage('Response matches OpenAPI schema.');
        setContractErrors([]);
      } else {
        setContractMessage('Response does not match OpenAPI schema.');
        setContractErrors((validate.errors || []).map(e => `${e.instancePath || ''} ${e.message || ''}`.trim()));
      }
    } catch (e: any) {
      setContractMessage('Validation failed.');
      setContractErrors([e?.message || 'Unknown error']);
    }
  };

  return (
    <div className="view-container">
      <h1 className="view-title">API Testing Suite</h1>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        <div>
          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={method} onChange={e => setMethod(e.target.value as Method)} className="input">
                {methods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="{{baseUrl}}/api/example" className="input" style={{ flex: 1 }} />
              <button className="btn-primary" onClick={sendRequest} disabled={loading || !url}>Send</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: '12px 0' }}>Headers</h3>
              {headers.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={h.key} onChange={e => updateHeader(i, 'key', e.target.value)} placeholder="Header" className="input" />
                  <input value={h.value} onChange={e => updateHeader(i, 'value', e.target.value)} placeholder="Value (supports {{var}})" className="input" style={{ flex: 1 }} />
                  <button className="btn-secondary" onClick={() => removeHeader(i)}>Remove</button>
                </div>
              ))}
              <button className="btn-secondary" onClick={addHeader}>Add Header</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: '12px 0' }}>Body</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select value={bodyMode} onChange={e => setBodyMode(e.target.value as BodyMode)} className="input">
                  <option value="none">None</option>
                  <option value="json">JSON</option>
                  <option value="text">Text</option>
                  <option value="form">Form</option>
                </select>
              </div>
              {bodyMode === 'json' && (
                <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={8} className="input" placeholder='{"key":"value"}' />
              )}
              {bodyMode === 'text' && (
                <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={8} className="input" placeholder="Raw text body (supports {{var}})" />
              )}
              {bodyMode === 'form' && (
                <div>
                  {formBody.map((kv, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input className="input" value={kv.key} onChange={e => setFormBody(formBody.map((v, i) => i === idx ? { ...v, key: e.target.value } : v))} placeholder="Field" />
                      <input className="input" value={kv.value} onChange={e => setFormBody(formBody.map((v, i) => i === idx ? { ...v, value: e.target.value } : v))} placeholder="Value" />
                    </div>
                  ))}
                  <button className="btn-secondary" onClick={() => setFormBody([...formBody, { key: '', value: '' }])}>Add Field</button>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <h3 style={{ margin: '12px 0' }}>Assertions</h3>
            {assertions.length === 0 && <div className="text-muted">No assertions. Add some below.</div>}
            {assertions.map(a => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.6fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input className="input" placeholder="dot path e.g. data.user.id" value={a.path} onChange={e => updateAssertion(a.id, { path: e.target.value })} />
                <select className="input" value={a.op} onChange={e => updateAssertion(a.id, { op: e.target.value as AssertionOp })}>
                  <option value="exists">exists</option>
                  <option value="equals">equals</option>
                  <option value="contains">contains</option>
                  <option value="status">status</option>
                </select>
                <input className="input" placeholder="expected" value={a.expected || ''} onChange={e => updateAssertion(a.id, { expected: e.target.value })} />
                <button className="btn-secondary" onClick={() => removeAssertion(a.id)}>Remove</button>
                {a.result && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 12, color: a.result.pass ? '#10b981' : '#ef4444' }}>
                    {a.result.pass ? '✔ Pass' : '✖ Fail'} {a.result.message ? `- ${a.result.message}` : ''}
                    {a.result.actual ? ` (actual: ${a.result.actual})` : ''}
                  </div>
                )}
              </div>
            ))}
            <button className="btn-secondary" onClick={addAssertion}>Add Assertion</button>
          </div>

          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <h3 style={{ margin: '12px 0' }}>Playwright Code</h3>
            <pre className="code" style={{ background: '#0b1020', color: '#e0e6ff', padding: 12, borderRadius: 8, overflow: 'auto' }}>{genPlaywright()}</pre>
          </div>
        </div>

        <div>
          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h3 style={{ margin: '12px 0' }}>Response</h3>
            {loading && <div className="loading-state">Sending request...</div>}
            {error && <div className="error-state">{error}</div>}
            {status !== null && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                <div>Status: <strong>{status}</strong></div>
                <div>Headers: <span className="text-muted">{Object.keys(respHeaders).length}</span></div>
              </div>
            )}
            {respBody !== null && (
              <pre className="code" style={{ background: '#0b1020', color: '#e0e6ff', padding: 12, borderRadius: 8, overflow: 'auto' }}>{pretty(respBody)}</pre>
            )}
          </div>

          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <h3 style={{ margin: '12px 0' }}>AI Suggestions</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <button className="btn-secondary" onClick={generateSuggestions} disabled={respBody == null}>Generate from Response</button>
              <button className="btn-secondary" onClick={askBackendForSuggestions} disabled={respBody == null}>Ask Backend AI</button>
              <span className="text-muted" style={{ fontSize: 12 }}>Create assertions locally or via backend-assisted analysis.</span>
            </div>
            {suggestions.length === 0 ? (
              <div className="text-muted">No suggestions yet. Send a request, then generate.</div>
            ) : (
              <div>
                {suggestions.map(s => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 1.4fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input className="input" value={s.path} readOnly />
                    <select className="input" value={s.op} disabled>
                      <option value="exists">exists</option>
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      <option value="status">status</option>
                    </select>
                    <input className="input" value={s.expected || ''} readOnly />
                    <button className="btn-secondary" onClick={() => addSuggestionToAssertions(s)}>Add</button>
                    <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#6b7280' }}>{s.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <h3 style={{ margin: '12px 0' }}>Scenario Composer</h3>
            {scenarioSteps.length === 0 && <div className="text-muted">No steps yet. Add steps to chain API calls.</div>}
            {scenarioSteps.map(s => (
              <div key={s.id} style={{ border: '1px dashed #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 2fr auto', gap: 8, alignItems: 'center' }}>
                  <input className="input" value={s.name} onChange={e => updateScenarioStep(s.id, { name: e.target.value })} />
                  <select className="input" value={s.method} onChange={e => updateScenarioStep(s.id, { method: e.target.value as Method })}>
                    {methods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input className="input" value={s.url} onChange={e => updateScenarioStep(s.id, { url: e.target.value })} placeholder="{{baseUrl}}/api/path" />
                  <button className="btn-secondary" onClick={() => removeScenarioStep(s.id)}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Captures (save response values to variables)</div>
                    {s.captures.map((c, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 8, marginBottom: 8 }}>
                        <input className="input" value={c.path} onChange={e => {
                          const next = s.captures.slice(); next[idx] = { ...next[idx], path: e.target.value }; updateScenarioStep(s.id, { captures: next });
                        }} placeholder="dot path e.g. data.token" />
                        <input className="input" value={c.var} onChange={e => {
                          const next = s.captures.slice(); next[idx] = { ...next[idx], var: e.target.value }; updateScenarioStep(s.id, { captures: next });
                        }} placeholder="variable name e.g. authToken" />
                      </div>
                    ))}
                    <button className="btn-secondary" onClick={() => updateScenarioStep(s.id, { captures: [...s.captures, { path: '', var: '' }] })}>Add Capture</button>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Last Result</div>
                    <div style={{ fontSize: 12 }}>
                      Status: <strong>{s.lastStatus ?? '-'}</strong> | Duration: <strong>{s.lastDuration ? `${s.lastDuration}ms` : '-'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={addScenarioStep}>Add Step</button>
              <button className="btn-primary" onClick={runScenario} disabled={scenarioSteps.length === 0}>Run Scenario</button>
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>{'Scenarios support variable substitution via {{var}} across steps.'}</div>
          </div>

          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <h3 style={{ margin: '12px 0' }}>OpenAPI Contract Validation</h3>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>Paste your OpenAPI v3 JSON here and validate the latest response.</div>
            <textarea className="input" rows={8} value={openApiText} onChange={e => setOpenApiText(e.target.value)} placeholder={`{ "openapi": "3.0.0", "paths": {} }`} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-secondary" onClick={parseOpenApi}>Load Spec</button>
              <button className="btn-primary" onClick={validateAgainstOpenApi} disabled={!openApiSpec || respBody == null}>Validate Response</button>
            </div>
            {contractMessage && (
              <div style={{ marginTop: 8, color: contractErrors.length ? '#ef4444' : '#10b981' }}>{contractMessage}</div>
            )}
            {contractErrors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {contractErrors.slice(0, 8).map((err, idx) => (
                  <div key={idx} className="text-muted" style={{ fontSize: 12 }}>• {err}</div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <h3 style={{ margin: '12px 0' }}>Environments</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <select className="input" value={activeEnv} onChange={e => setActiveEnv(e.target.value)}>
                {envs.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
              </select>
              <button className="btn-secondary" onClick={addEnv}>Add Env</button>
            </div>
            {envs.map((env, idx) => (
              <div key={env.name} style={{ border: '1px dashed #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input className="input" value={env.name} onChange={e => updateEnv(idx, { name: e.target.value })} />
                </div>
                {env.variables.map((v, j) => (
                  <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input className="input" value={v.key} onChange={e => updateEnvVar(idx, j, 'key', e.target.value)} placeholder="key" />
                    <input className="input" value={v.value} onChange={e => updateEnvVar(idx, j, 'value', e.target.value)} placeholder="value" />
                  </div>
                ))}
                <button className="btn-secondary" onClick={() => addEnvVar(idx)}>Add Variable</button>
              </div>
            ))}
            <div className="text-muted" style={{ fontSize: 12 }}>{'Use variables with {{var}} syntax in URL, headers, and body.'}</div>
          </div>

          <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <h3 style={{ margin: '12px 0' }}>History</h3>
            {history.length === 0 ? (
              <div className="text-muted">No history yet.</div>
            ) : (
              <div>
                {history.slice(0, 15).map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ minWidth: 54, color: '#6b7280' }}>{h.method}</span>
                    <span style={{ flex: 1 }}>{h.url}</span>
                    <span style={{ minWidth: 60, color: '#6b7280' }}>{h.status}</span>
                    <span style={{ minWidth: 60, color: '#6b7280' }}>{h.duration}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTesting;