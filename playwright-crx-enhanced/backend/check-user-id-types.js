require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkUserIdType() {
  try {
    const client = await pool.connect();
    
    // Check the user_id column type in test_data_repositories
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'test_data_repositories' 
      AND column_name = 'user_id'
    `);
    
    console.log('test_data_repositories.user_id column info:', result.rows[0]);
    
    // Also check the users table to see what type id is
    const userIdResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'id'
    `);
    
    console.log('users.id column info:', userIdResult.rows[0]);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkUserIdType();