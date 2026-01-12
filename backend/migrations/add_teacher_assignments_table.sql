-- Migration: Add teacher_subject_grade_assignments table
-- This table links teachers to specific subjects within grade levels for each academic year

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

-- Add comments for documentation
COMMENT ON TABLE teacher_subject_grade_assignments IS 'Maps teachers to specific subjects within grade levels for each academic year';
COMMENT ON COLUMN teacher_subject_grade_assignments.assigned_by IS 'Admin or Principal who made the assignment';

-- Verification query
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'teacher_subject_grade_assignments'
ORDER BY ordinal_position;
