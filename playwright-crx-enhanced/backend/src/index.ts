import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import * as path from 'path';

// Routes
import authRoutes from './routes/auth.routes';
import scriptRoutes from './routes/script.routes';
import projectRoutes from './routes/project.routes';
import testRunRoutes from './routes/testRun.routes';
import extensionRoutes from './routes/extension.routes';
import allureRoutes from './routes/allure.routes';
import apiTestingRoutes from './routes/apiTesting.routes';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security
const isDev = (process.env.NODE_ENV || 'development') === 'development';
if (isDev) {
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'frame-ancestors': ["'self'", 'http://localhost:5173']
      }
    },
    frameguard: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
} else {
  app.use(helmet());
}

const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const defaultOrigins = [
  'chrome-extension://*',
  'ms-browser-extension://*',
  'edge-extension://*',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];
const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if ((process.env.NODE_ENV || 'development') === 'development') {
      return callback(null, true);
    }
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = new RegExp('^' + allowed.replace('*', '.*') + '$');
        return pattern.test(origin);
      }
      return allowed === origin;
    });
    if (isAllowed) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('user-agent') });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: NODE_ENV });
});

app.get('/api', (_req, res) => {
  res.json({
    status: 'ok',
    api: 'playwright-crx-backend',
    endpoints: [
      '/api/auth/*',
      '/api/projects/*',
      '/api/scripts/*',
      '/api/test-runs/*',
      // Test data endpoints removed
      '/api/api-testing/*',
      '/api/extensions/*',
      '/api/allure',
      '/api-docs',
      '/api-docs.json'
    ]
  });
});

app.get('/api-docs.json', (_req, res) => { res.json(swaggerSpec); });
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/allure-reports', express.static(path.join(process.cwd(), 'allure-reports')));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/test-runs', testRunRoutes);
app.use('/api/extensions', extensionRoutes);
app.use('/api/allure', allureRoutes);
app.use('/api/api-testing', apiTestingRoutes);

app.use((_req, res) => { res.status(404).json({ error: 'Route not found' }); });
app.use(errorHandler);

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 Environment: ${NODE_ENV}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => { logger.info('SIGTERM signal received: closing HTTP server'); httpServer.close(() => { logger.info('HTTP server closed'); }); });
process.on('SIGINT', () => { logger.info('SIGINT signal received: closing HTTP server'); httpServer.close(() => { logger.info('HTTP server closed'); process.exit(0); }); });

export { app, httpServer };
