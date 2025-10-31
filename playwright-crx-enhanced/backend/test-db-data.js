const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'playwright_crx',
  user: 'postgres',
  password: 'postgres124112'
});

async function checkData() {
  try {
    console.log('Checking database data...');
    
    const users = await pool.query('SELECT id, email, name FROM "User" LIMIT 5');
    console.log('Users:', users.rows);
    
    const scripts = await pool.query('SELECT id, name, "userId", "projectId" FROM "Script" LIMIT 5');
    console.log('Scripts:', scripts.rows);
    
    const projects = await pool.query('SELECT id, name FROM "Project" LIMIT 5');
    console.log('Projects:', projects.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();