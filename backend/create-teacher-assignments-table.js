// Automatic database migration script for teacher_subject_grade_assignments table
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTeacherAssignmentsTable() {
  console.log('🔧 Creating teacher_subject_grade_assignments table...\n');

  const createTableSQL = `
    -- Create the table
    CREATE TABLE IF NOT EXISTS teacher_subject_grade_assignments (
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

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade_teacher ON teacher_subject_grade_assignments(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade_subject ON teacher_subject_grade_assignments(subject_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade_grade ON teacher_subject_grade_assignments(grade_level_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade_year ON teacher_subject_grade_assignments(academic_year_id);
  `;

  try {
    await pool.query(createTableSQL);
    console.log('✅ Table created successfully!');
    
    // Verify table exists
    const verifyResult = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'teacher_subject_grade_assignments'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n📊 Table structure (${verifyResult.rows.length} columns):`);
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('   Teacher assignment functionality is now ready to use.\n');
    
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTeacherAssignmentsTable();
