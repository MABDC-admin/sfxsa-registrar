import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  const email = 'admin@school.edu';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Check if user exists
    const existing = await pool.query('SELECT id FROM auth_users WHERE email = $1', [email]);
    
    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      // Update password
      await pool.query(
        'UPDATE auth_users SET encrypted_password = $1, raw_user_meta_data = $2 WHERE id = $3',
        [hashedPassword, JSON.stringify({ role: 'admin' }), userId]
      );
    } else {
      userId = uuidv4();
      // Create auth user
      await pool.query(
        `INSERT INTO auth_users (id, email, encrypted_password, raw_user_meta_data)
         VALUES ($1, $2, $3, $4)`,
        [userId, email, hashedPassword, JSON.stringify({ role: 'admin' })]
      );
    }

    // Delete old profile if exists and create new one
    await pool.query('DELETE FROM profiles WHERE id = $1', [userId]);
    await pool.query(
      `INSERT INTO profiles (id, user_id, full_name, role) VALUES ($1, $1, $2, $3)`,
      [userId, 'System Administrator', 'admin']
    );

    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
