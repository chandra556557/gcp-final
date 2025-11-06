import fs from 'fs';
import path from 'path';

export interface Template {
  id: string;
  name: string;
  description?: string;
  projectId?: string | null;
  schema?: any;
  createdAt?: string;
}

export interface GenerationJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  templateId?: string;
  count?: number;
  projectId?: string | null;
  error?: string;
}

export class TestDataService {
  private baseDir: string;
  private templatesFile: string;
  private jobsFile: string;
  private datasetsFile: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'logs', 'test-data');
    this.templatesFile = path.join(this.baseDir, 'templates.json');
    this.jobsFile = path.join(this.baseDir, 'jobs.json');
    this.datasetsFile = path.join(this.baseDir, 'datasets.json');
    this.ensure();
  }

  private ensure() {
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
    if (!fs.existsSync(this.templatesFile)) fs.writeFileSync(this.templatesFile, JSON.stringify({ templates: [] }, null, 2));
    if (!fs.existsSync(this.jobsFile)) fs.writeFileSync(this.jobsFile, JSON.stringify({ jobs: [] }, null, 2));
    if (!fs.existsSync(this.datasetsFile)) fs.writeFileSync(this.datasetsFile, JSON.stringify({ items: [] }, null, 2));
  }

  async getTemplates(projectId?: string | null): Promise<Template[]> {
    const raw = JSON.parse(fs.readFileSync(this.templatesFile, 'utf-8'));
    let list: Template[] = raw.templates || [];

    // Provide a default template if none exist
    if (list.length === 0) {
      list = [{ id: 'tmpl_default', name: 'Default User Profile', description: 'Basic synthetic user data', projectId: null, createdAt: new Date().toISOString() }];
      fs.writeFileSync(this.templatesFile, JSON.stringify({ templates: list }, null, 2));
    }

    if (projectId) return list.filter(t => !t.projectId || t.projectId === projectId);
    return list;
  }

  async addTemplate(input: { name: string; description?: string; projectId?: string | null; schema?: any }): Promise<Template> {
    const raw = JSON.parse(fs.readFileSync(this.templatesFile, 'utf-8'));
    const list: Template[] = raw.templates || [];
    const tmpl: Template = {
      id: `tmpl_${Date.now().toString(36)}`,
      name: input.name,
      description: input.description,
      projectId: input.projectId ?? null,
      schema: input.schema,
      createdAt: new Date().toISOString(),
    };
    list.push(tmpl);
    fs.writeFileSync(this.templatesFile, JSON.stringify({ templates: list }, null, 2));
    return tmpl;
  }

  async updateTemplate(id: string, changes: { name?: string; description?: string; schema?: any }): Promise<Template> {
    const raw = JSON.parse(fs.readFileSync(this.templatesFile, 'utf-8'));
    const list: Template[] = raw.templates || [];
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Template not found');
    const updated: Template = {
      ...list[idx],
      ...changes,
      // keep createdAt unchanged; update timestamp not tracked explicitly
    };
    list[idx] = updated;
    fs.writeFileSync(this.templatesFile, JSON.stringify({ templates: list }, null, 2));
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const raw = JSON.parse(fs.readFileSync(this.templatesFile, 'utf-8'));
    const list: Template[] = raw.templates || [];
    const next = list.filter(t => t.id !== id);
    const deleted = next.length !== list.length;
    fs.writeFileSync(this.templatesFile, JSON.stringify({ templates: next }, null, 2));
    return deleted;
  }

  async getJobs(projectId?: string | null): Promise<GenerationJob[]> {
    const raw = JSON.parse(fs.readFileSync(this.jobsFile, 'utf-8'));
    let list: GenerationJob[] = raw.jobs || [];
    if (projectId) list = list.filter(j => !j.projectId || j.projectId === projectId);
    // Sort by createdAt desc
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addJob(job: GenerationJob): Promise<void> {
    const raw = JSON.parse(fs.readFileSync(this.jobsFile, 'utf-8'));
    const list: GenerationJob[] = raw.jobs || [];
    list.push(job);
    fs.writeFileSync(this.jobsFile, JSON.stringify({ jobs: list }, null, 2));
  }

  async completeJob(id: string, error?: string): Promise<void> {
    const raw = JSON.parse(fs.readFileSync(this.jobsFile, 'utf-8'));
    const list: GenerationJob[] = raw.jobs || [];
    const idx = list.findIndex(j => j.id === id);
    if (idx >= 0) {
      list[idx].status = error ? 'failed' : 'completed';
      list[idx].error = error;
      list[idx].completedAt = new Date().toISOString();
      fs.writeFileSync(this.jobsFile, JSON.stringify({ jobs: list }, null, 2));
    }
  }

  async appendDataset(items: any[]): Promise<void> {
    const raw = JSON.parse(fs.readFileSync(this.datasetsFile, 'utf-8'));
    const list: any[] = raw.items || [];
    list.push(...items.map(i => ({ ...i, _ts: new Date().toISOString() })));
    // Keep at most 1000 items
    const trimmed = list.slice(Math.max(0, list.length - 1000));
    fs.writeFileSync(this.datasetsFile, JSON.stringify({ items: trimmed }, null, 2));
  }

  async getLatest(limit = 25, projectId?: string | null): Promise<any[]> {
    const raw = JSON.parse(fs.readFileSync(this.datasetsFile, 'utf-8'));
    let list: any[] = raw.items || [];
    // Project scoping: if items have projectId attribute, filter; else return all
    if (projectId) list = list.filter((i: any) => !i.projectId || i.projectId === projectId);
    list = list.sort((a, b) => new Date(b._ts || 0).getTime() - new Date(a._ts || 0).getTime());
    return list.slice(0, limit);
  }
}

export const testDataService = new TestDataService();