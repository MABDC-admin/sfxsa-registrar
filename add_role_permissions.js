import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:RyignrQfNJGlSlAYVaDlHGpZTQAkqOGZ@shortline.proxy.rlwy.net:35335/railway',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Creating role_module_permissions table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_module_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role TEXT NOT NULL,
        module_key TEXT NOT NULL,
        is_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(role, module_key)
      );
    `);
    
    // Seed default permissions for roles
    const roles = ['admin', 'teacher', 'student', 'finance', 'principal', 'registrar', 'accounting'];
    const modules = [
      'Dashboard',
      'Announcements',
      'Student Records',
      'Classroom',
      'Grade Levels',
      'Classes',
      'Teachers',
      'Admins',
      'Principals',
      'Registrars',
      'Accounting',
      'Finance',
      'Academic Years',
      'Reports',
      'Chat',
      'Calendar',
      'Suggestions',
      'Settings'
    ];

    console.log('Seeding default permissions...');
    for (const role of roles) {
      for (const module of modules) {
        await pool.query(`
          INSERT INTO role_module_permissions (role, module_key, is_enabled)
          VALUES ($1, $2, $3)
          ON CONFLICT (role, module_key) DO NOTHING
        `, [role, module, true]);
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
