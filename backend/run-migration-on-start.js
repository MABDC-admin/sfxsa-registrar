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

    // Migration 1: Check if teacher_subject_grade_assignments table exists
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

    // Migration 2: Update classes table structure
    console.log('📝 Checking classes table structure...');
    
    // Check if subject_name column exists
    const subjectNameCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'subject_name'
      );
    `);

    if (!subjectNameCheck.rows[0].exists) {
      console.log('📝 Adding subject_name column to classes table...');
      await pool.query(`
        ALTER TABLE classes ADD COLUMN IF NOT EXISTS subject_name TEXT;
        UPDATE classes SET subject_name = name WHERE subject_name IS NULL;
      `);
    }

    // Check if section_id column exists
    const sectionIdCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'section_id'
      );
    `);

    if (!sectionIdCheck.rows[0].exists) {
      console.log('📝 Adding section_id column to classes table...');
      await pool.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id);`);
    }

    // Check if academic_year_id column exists
    const academicYearIdCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'academic_year_id'
      );
    `);

    if (!academicYearIdCheck.rows[0].exists) {
      console.log('📝 Adding academic_year_id column to classes table...');
      await pool.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);`);
    }

    // Check if class_code column exists
    const classCodeCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'class_code'
      );
    `);

    if (!classCodeCheck.rows[0].exists) {
      console.log('📝 Adding class_code column to classes table...');
      await pool.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_code TEXT;`);
    }

    // Check if created_by column exists
    const createdByCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'created_by'
      );
    `);

    if (!createdByCheck.rows[0].exists) {
      console.log('📝 Adding created_by column to classes table...');
      await pool.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth_users(id);`);
    }

    console.log('✅ Classes table structure updated successfully!');

    // Migration 3: Add foreign key constraint to teacher_id in classes table
    console.log('📝 Adding foreign key constraint to classes.teacher_id...');
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          -- Check if foreign key constraint already exists
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'classes_teacher_id_fkey' 
            AND table_name = 'classes'
          ) THEN
            -- Add foreign key constraint
            ALTER TABLE classes 
            ADD CONSTRAINT classes_teacher_id_fkey 
            FOREIGN KEY (teacher_id) REFERENCES auth_users(id) ON DELETE SET NULL;
            
            -- Add index for teacher_id if not exists
            CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
          END IF;
        END $$;
      `);
      console.log('✅ Foreign key constraint added!');
    } catch (error) {
      console.log('⚠️  Foreign key constraint may already exist or failed:', error.message);
    }

    // Migration 4: Seed sections if they don't exist
    console.log('📝 Checking sections data...');
    const sectionsCheck = await pool.query('SELECT COUNT(*) FROM sections');
    const sectionsCount = parseInt(sectionsCheck.rows[0].count);

    if (sectionsCount === 0) {
      console.log('📝 Creating default sections for all grade levels...');
      await pool.query(`
        INSERT INTO sections (name, grade_level_id)
        SELECT 'Section A', id FROM grade_levels
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ Default sections created!');
    } else {
      console.log(`✅ Sections already exist (${sectionsCount} sections)`);
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    // Don't fail startup, just log the error
  } finally {
    await pool.end();
  }
}
