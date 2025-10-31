import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

const DB_USER = process.env.DB_USER || 'playwright_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'playwright123';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'playwright_crx';

const rawEnvUrl = process.env.DATABASE_URL;
const envUrl = typeof rawEnvUrl === 'string' ? rawEnvUrl.trim() : '';

// Helper to safely log a redacted DATABASE_URL without password
function redactDbUrl(url: string): string {
  try {
    const u = new URL(url);
    const protocol = u.protocol;
    const user = u.username ? `${u.username}:***@` : '';
    const host = u.hostname;
    const port = u.port ? `:${u.port}` : '';
    const db = u.pathname;
    return `${protocol}//${user}${host}${port}${db}`;
  } catch {
    return 'INVALID_URL';
  }
}

// Validate DATABASE_URL via WHATWG URL and ensure it includes a db name
let connectionString: string | undefined;
if (envUrl) {
  try {
    const parsed = new URL(envUrl);
    const protocolOk = parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
    const hasDbName = parsed.pathname && parsed.pathname !== '/' && parsed.pathname.length > 1;
    if (protocolOk && hasDbName) {
      connectionString = envUrl;
      logger.info('Using DATABASE_URL for PostgreSQL connection', { db: redactDbUrl(envUrl) });
    } else {
      logger.warn('Invalid DATABASE_URL format; falling back to discrete DB_* settings', {
        db: redactDbUrl(envUrl)
      });
    }
  } catch (error: any) {
    logger.warn('Failed to parse DATABASE_URL; falling back to discrete DB_* settings', {
      error: error?.message,
      db: redactDbUrl(envUrl)
    });
  }
}
if (!connectionString) {
  connectionString = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  logger.info('Using discrete DB_* environment variables for PostgreSQL connection', {
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER
  });
}
const ssl =
  process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined;

const pool = new Pool({
  connectionString,
  ssl,
  // Fix for PostgreSQL case sensitivity issues
  // Force all identifiers to be quoted to preserve case
  // This ensures "createdAt" is treated as a proper identifier, not "createdat"
  query_timeout: 30000,
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 30000,
});

export default pool;
