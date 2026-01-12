// Auto-migration script that runs on Railway startup
import pkg from 'pg';
const { Pool } = pkg;

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  No DATABASE_URL found, skipping migrations');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Running database migrations...');

    // Check if teacher_subject_grade_assignments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'teacher_subject_grade_assignments'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📝 Creating teacher_subject_grade_assignments table...');
      
      await pool.query(`
        CREATE TABLE teacher_subject_grade_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          teacher_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
          subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
          grade_level_id UUID REFERENCES grade_levels(id) ON DELETE CASCADE,
          academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
          assigned_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(teacher_id, subject_id, grade_level_id, academic_year_id)
        );

        CREATE INDEX idx_teacher_subject_grade_teacher ON teacher_subject_grade_assignments(teacher_id);
        CREATE INDEX idx_teacher_subject_grade_subject ON teacher_subject_grade_assignments(subject_id);
        CREATE INDEX idx_teacher_subject_grade_grade ON teacher_subject_grade_assignments(grade_level_id);
        CREATE INDEX idx_teacher_subject_grade_year ON teacher_subject_grade_assignments(academic_year_id);
      `);
      
      console.log('✅ Teacher assignments table created successfully!');
    } else {
      console.log('✅ Teacher assignments table already exists');
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    // Don't fail startup, just log the error
  } finally {
    await pool.end();
  }
}
