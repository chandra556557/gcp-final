import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { testDataService } from '../services/testData.service';

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.projectId as string) || null;
    const templates = await testDataService.getTemplates(projectId);
    res.status(200).json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get templates' });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { name, description, projectId, schema } = req.body;
    if (!name) throw new AppError('name is required', 400);
    let parsedSchema: any = undefined;
    if (schema !== undefined) {
      // Accept already-parsed object; if string, try to parse JSON
      parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
    }
    const tmpl = await testDataService.addTemplate({ name, description, projectId: projectId || null, schema: parsedSchema });
    res.status(201).json({ success: true, template: tmpl });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to create template' });
    }
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { id } = req.params as { id: string };
    const { name, description, schema } = req.body;
    let parsedSchema: any = undefined;
    if (schema !== undefined) parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
    const updated = await testDataService.updateTemplate(id, { name, description, schema: parsedSchema });
    res.status(200).json({ success: true, template: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to update template' });
    }
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { id } = req.params as { id: string };
    const deleted = await testDataService.deleteTemplate(id);
    res.status(200).json({ success: true, deleted });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to delete template' });
    }
  }
};

export const getJobs = async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.projectId as string) || null;
    const jobs = await testDataService.getJobs(projectId);
    res.status(200).json({ success: true, jobs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get jobs' });
  }
};

export const generateData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { templateId, count, projectId, config } = req.body;
    if (!templateId) throw new AppError('templateId is required', 400);
    const n = typeof count === 'number' && count > 0 ? Math.min(count, 1000) : 10;

    // Create job
    const jobId = `job_${Date.now().toString(36)}`;
    await testDataService.addJob({
      id: jobId,
      status: 'running',
      createdAt: new Date().toISOString(),
      templateId,
      count: n,
      projectId: projectId || null,
    });

    // Synchronously generate simple synthetic items (replace with real AI call later)
    const items = Array.from({ length: n }).map((_, idx) => ({
      id: `${jobId}_${idx}`,
      projectId: projectId || null,
      templateId,
      userProfile: {
        firstName: randomFirstName(),
        lastName: randomLastName(),
        email: `${randomFirstName().toLowerCase()}.${randomLastName().toLowerCase()}${Math.floor(Math.random()*1000)}@example.com`,
        age: 18 + Math.floor(Math.random() * 50),
      },
      config: config || null,
    }));

    await testDataService.appendDataset(items);
    await testDataService.completeJob(jobId);

    res.status(202).json({ success: true, jobId });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to generate data' });
    }
  }
};

export const getLatestDataset = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const projectId = (req.query.projectId as string) || null;
    const items = await testDataService.getLatest(limit, projectId);
    res.status(200).json({ success: true, items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get latest dataset' });
  }
};

function randomFirstName(): string {
  const names = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Avery', 'Jamie', 'Morgan'];
  return names[Math.floor(Math.random() * names.length)];
}

function randomLastName(): string {
  const names = ['Smith', 'Johnson', 'Lee', 'Garcia', 'Brown', 'Davis', 'Miller', 'Wilson'];
  return names[Math.floor(Math.random() * names.length)];
}