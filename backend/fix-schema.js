import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
  try {
    // Add missing columns
    await pool.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID;
      ALTER TABLE grade_levels ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
    `);
    console.log('Columns added');

    // Create user_menu_permissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_menu_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        menu_key TEXT NOT NULL,
        can_view BOOLEAN DEFAULT true,
        can_edit BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('user_menu_permissions table created');

    // Update existing profiles to have user_id = id
    await pool.query('UPDATE profiles SET user_id = id WHERE user_id IS NULL');
    console.log('Profiles updated');

    // Update grade_levels to have level = order_index
    await pool.query('UPDATE grade_levels SET level = order_index WHERE level = 0 OR level IS NULL');
    console.log('Grade levels updated');

    console.log('Schema fixed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixSchema();
