import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool settings for Railway
  max: 20,                   // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,  // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds for a connection
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to Railway PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Log error but don't exit - let the application handle it gracefully
});

export default pool;
