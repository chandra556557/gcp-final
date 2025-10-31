// Migration runner script
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5433';
const DB_NAME = process.env.DB_NAME || 'playwright_crx';

const connectionString = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

console.log('========================================');
console.log('Test Data Management Migration Runner');
console.log('========================================\n');

console.log('Database Configuration:');
console.log(`  Host: ${DB_HOST}`);
console.log(`  Port: ${DB_PORT}`);
console.log(`  Database: ${DB_NAME}`);
console.log(`  User: ${DB_USER}\n`);

const pool = new Pool({ connectionString });

const migrationFile = path.join(__dirname, 'migrations', '004_test_data_management.sql');

async function runMigration() {
  try {
    console.log(`Reading migration file: ${migrationFile}`);
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('Executing SQL migration...\n');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('New tables created:');
    console.log('  - TestDataRepository');
    console.log('  - TestDataSnapshot');
    console.log('  - DataCleanupRule');
    console.log('  - SyntheticDataTemplate');
    console.log('  - ApiTestSuite');
    console.log('  - ApiTestCase');
    console.log('  - ApiContract');
    console.log('  - ApiMock');
    console.log('  - ApiPerformanceBenchmark\n');
    
    console.log('========================================');
    console.log('Migration Complete!');
    console.log('========================================\n');
    
    console.log('Next steps:');
    console.log('  1. Restart your backend server');
    console.log('  2. Test the new endpoints at /api/test-data-management and /api/api-testing');
    console.log('  3. Check API documentation at http://localhost:3001/api-docs\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed with error:');
    console.error(error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
