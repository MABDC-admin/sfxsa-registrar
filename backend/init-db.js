import 'dotenv/config';
import fs from 'fs';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  console.log('Connecting to Railway PostgreSQL...');
  
  try {
    const schema = fs.readFileSync('./railway_schema.sql', 'utf8');
    
    console.log('Running schema...');
    await pool.query(schema);
    
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

initDatabase();
