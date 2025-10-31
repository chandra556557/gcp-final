require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runFix() {
  try {
    const client = await pool.connect();
    
    console.log('Running database schema fix...');
    
    const sql = fs.readFileSync('fix-test-data-user-id.sql', 'utf8');
    
    // Split by semicolon and run each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        try {
          await client.query(statement);
          console.log('✅ Success');
        } catch (error) {
          console.log('⚠️ Warning:', error.message);
        }
      }
    }
    
    console.log('\n✅ Schema fix completed!');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'test_data_repositories' 
      AND column_name = 'user_id'
    `);
    
    console.log('Updated user_id column:', result.rows[0]);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

runFix();