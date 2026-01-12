-- Migration 003: Academic Management & Audit Trail System
-- Created: 2026-01-12
-- Purpose: Add assignments, submissions, grading, and audit logging functionality

-- Check and drop existing partial tables if they exist
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS gradebook CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS grading_periods CASCADE;

-- ============================================
-- ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject_id UUID,
  teacher_id UUID,
  grade_level TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  total_points INTEGER DEFAULT 100,
  assignment_type TEXT DEFAULT 'homework',
  status TEXT DEFAULT 'active',
  instructions TEXT DEFAULT '',
  attachment_url TEXT DEFAULT '',
  school_year TEXT DEFAULT '2025-2026',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_subject ON assignments(subject_id);
CREATE INDEX idx_assignments_grade_level ON assignments(grade_level);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_school_year ON assignments(school_year);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- ============================================
-- ASSIGNMENT SUBMISSIONS TABLE
-- ============================================
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  submission_text TEXT DEFAULT '',
  attachment_url TEXT DEFAULT '',
  score INTEGER,
  max_score INTEGER DEFAULT 100,
  feedback TEXT DEFAULT '',
  status TEXT DEFAULT 'not_started',
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID,
  late_submission BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_submissions_status ON assignment_submissions(status);
CREATE INDEX idx_submissions_graded_by ON assignment_submissions(graded_by);
CREATE INDEX idx_submissions_submitted_at ON assignment_submissions(submitted_at);

-- ============================================
-- GRADEBOOK TABLE
-- ============================================
CREATE TABLE gradebook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject_id UUID,
  teacher_id UUID,
  grade_level TEXT NOT NULL,
  school_year TEXT NOT NULL,
  grading_period TEXT DEFAULT 'Q1',
  grade_value DECIMAL(5,2),
  letter_grade TEXT,
  gpa_value DECIMAL(3,2),
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, grading_period, school_year)
);

CREATE INDEX idx_gradebook_student ON gradebook(student_id);
CREATE INDEX idx_gradebook_subject ON gradebook(subject_id);
CREATE INDEX idx_gradebook_teacher ON gradebook(teacher_id);
CREATE INDEX idx_gradebook_school_year ON gradebook(school_year);
CREATE INDEX idx_gradebook_grading_period ON gradebook(grading_period);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id);

-- ============================================
-- GRADING PERIODS TABLE
-- ============================================
CREATE TABLE grading_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  school_year TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  grade_submission_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, school_year)
);

CREATE INDEX idx_grading_periods_school_year ON grading_periods(school_year);
CREATE INDEX idx_grading_periods_active ON grading_periods(is_active);

-- ============================================
-- SEED DEFAULT GRADING PERIODS FOR 2025-2026
-- ============================================
INSERT INTO grading_periods (name, code, school_year, start_date, end_date, is_active, grade_submission_deadline) VALUES
  ('Quarter 1', 'Q1', '2025-2026', '2025-06-01', '2025-08-31', true, '2025-09-05'),
  ('Quarter 2', 'Q2', '2025-2026', '2025-09-01', '2025-11-30', false, '2025-12-05'),
  ('Quarter 3', 'Q3', '2025-2026', '2025-12-01', '2026-02-28', false, '2026-03-05'),
  ('Quarter 4', 'Q4', '2025-2026', '2026-03-01', '2026-05-31', false, '2026-06-05'),
  ('Semester 1', 'S1', '2025-2026', '2025-06-01', '2025-11-30', false, '2025-12-05'),
  ('Semester 2', 'S2', '2025-2026', '2025-12-01', '2026-05-31', false, '2026-06-05');

-- ============================================
-- ADD FOREIGN KEYS (after all tables exist)
-- ============================================
ALTER TABLE assignments ADD CONSTRAINT assignments_subject_id_fkey 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE assignments ADD CONSTRAINT assignments_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE assignment_submissions ADD CONSTRAINT submissions_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES student_records(id) ON DELETE CASCADE;

ALTER TABLE assignment_submissions ADD CONSTRAINT submissions_graded_by_fkey 
  FOREIGN KEY (graded_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE gradebook ADD CONSTRAINT gradebook_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES student_records(id) ON DELETE CASCADE;

ALTER TABLE gradebook ADD CONSTRAINT gradebook_subject_id_fkey 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE gradebook ADD CONSTRAINT gradebook_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL;

-- ============================================
-- AUTO-UPDATE TIMESTAMP TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assignment_timestamp
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_submission_timestamp
  BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_gradebook_timestamp
  BEFORE UPDATE ON gradebook
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION calculate_letter_grade(score DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF score >= 90 THEN RETURN 'A';
  ELSIF score >= 80 THEN RETURN 'B';
  ELSIF score >= 70 THEN RETURN 'C';
  ELSIF score >= 60 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_gpa_value(score DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  IF score >= 93 THEN RETURN 4.0;
  ELSIF score >= 90 THEN RETURN 3.7;
  ELSIF score >= 87 THEN RETURN 3.3;
  ELSIF score >= 83 THEN RETURN 3.0;
  ELSIF score >= 80 THEN RETURN 2.7;
  ELSIF score >= 77 THEN RETURN 2.3;
  ELSIF score >= 73 THEN RETURN 2.0;
  ELSIF score >= 70 THEN RETURN 1.7;
  ELSIF score >= 67 THEN RETURN 1.3;
  ELSIF score >= 60 THEN RETURN 1.0;
  ELSE RETURN 0.0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE assignments IS 'Teacher-created assignments for students';
COMMENT ON TABLE assignment_submissions IS 'Student submissions and grades';
COMMENT ON TABLE gradebook IS 'Final grades by grading period';
COMMENT ON TABLE audit_logs IS 'System-wide audit trail for all user actions';
COMMENT ON TABLE grading_periods IS 'Defines grading periods within academic years';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003 completed successfully!';
  RAISE NOTICE '📚 Created: assignments, assignment_submissions, gradebook';
  RAISE NOTICE '📋 Created: audit_logs, grading_periods';
  RAISE NOTICE '🔧 Created helper functions: calculate_letter_grade, calculate_gpa_value';
END $$;
