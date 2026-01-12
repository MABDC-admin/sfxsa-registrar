-- SMS2 School Management System - Railway PostgreSQL Schema
-- Run this in your Railway PostgreSQL to create all required tables

-- ============================================
-- AUTH USERS TABLE (replaces Supabase auth)
-- ============================================
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT NOT NULL,
  raw_user_meta_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Trigger to auto-set user_id from id
CREATE OR REPLACE FUNCTION set_profile_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profile_user_id_trigger ON profiles;
CREATE TRIGGER set_profile_user_id_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_profile_user_id();

-- ============================================
-- USER MENU PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_menu_permissions_user ON user_menu_permissions(user_id);

-- ============================================
-- STORAGE BLOBS TABLE (for Railway ephemeral storage)
-- ============================================
CREATE TABLE IF NOT EXISTS storage_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content BYTEA NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STUDENT RECORDS TABLE
-- ============================================
-- Column names match CSV headers: LRN | GRADE LEVEL | STUDENT NAME | BIRTH DATE | AGE | GENDER | MOTHER CONTACT # | MOTHERS MAIDEN NAME | FATHER CONTACT # | FATHER | PHIL. ADDRESS | UAE ADDRESS | PREVIOUS SCHOOL
CREATE TABLE IF NOT EXISTS student_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  lrn TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  student_name TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  age INTEGER,
  gender TEXT DEFAULT '',
  mother_contact TEXT DEFAULT '',
  mothers_maiden_name TEXT DEFAULT '',
  father_contact TEXT DEFAULT '',
  father TEXT DEFAULT '',
  phil_address TEXT DEFAULT '',
  uae_address TEXT DEFAULT '',
  previous_school TEXT DEFAULT '',
  school_year TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  photo_url TEXT DEFAULT '',
  enrolled_at DATE DEFAULT '2025-07-01',
  enrollment_status TEXT DEFAULT 'Enrolled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_records_user ON student_records(user_id);

CREATE INDEX IF NOT EXISTS idx_student_records_school_year ON student_records(school_year);
CREATE INDEX IF NOT EXISTS idx_student_records_grade_level ON student_records(grade_level);
CREATE INDEX IF NOT EXISTS idx_student_records_status ON student_records(status);
CREATE INDEX IF NOT EXISTS idx_student_records_lrn ON student_records(lrn);

-- ============================================
-- STUDENT DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES student_records(id) ON DELETE CASCADE,
  blob_id UUID REFERENCES storage_blobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  file_path TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_blob ON student_documents(blob_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_uploaded_by ON student_documents(uploaded_by);

-- ============================================
-- SCHOOL SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS school_settings (
  id SERIAL PRIMARY KEY,
  name TEXT DEFAULT 'St. Francis Xavier Smart Academy Inc.',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  fax TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  principal_name TEXT DEFAULT '',
  principal_email TEXT DEFAULT '',
  founded_year TEXT DEFAULT '',
  mission_statement TEXT DEFAULT '',
  vision_statement TEXT DEFAULT '',
  motto TEXT DEFAULT '',
  logo_blob_id UUID REFERENCES storage_blobs(id) ON DELETE SET NULL,
  logo_url TEXT DEFAULT '',
  crest_blob_id UUID REFERENCES storage_blobs(id) ON DELETE SET NULL,
  crest_url TEXT DEFAULT '',
  banner_blob_id UUID REFERENCES storage_blobs(id) ON DELETE SET NULL,
  banner_url TEXT DEFAULT '',
  accreditation TEXT DEFAULT '',
  curriculum_type TEXT DEFAULT '',
  school_colors TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO school_settings (id, name, address, phone, email, website, principal_name, founded_year)
VALUES (1, 'St. Francis Xavier Smart Academy Inc.', 'Metro Manila, Philippines', '+63 (02) 1234-5678', 'admin@sfxsa.edu.ph', 'www.sfxsa.edu.ph', 'Dr. Maria Santos', '1995')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ACADEMIC YEARS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate academic years from 2024-2025 to 2039-2040
INSERT INTO academic_years (name, start_date, end_date, is_active) VALUES
  ('2024-2025', '2024-06-01', '2025-03-31', false),
  ('2025-2026', '2025-06-01', '2026-03-31', true),
  ('2026-2027', '2026-06-01', '2027-03-31', false),
  ('2027-2028', '2027-06-01', '2028-03-31', false),
  ('2028-2029', '2028-06-01', '2029-03-31', false),
  ('2029-2030', '2029-06-01', '2030-03-31', false),
  ('2030-2031', '2030-06-01', '2031-03-31', false),
  ('2031-2032', '2031-06-01', '2032-03-31', false),
  ('2032-2033', '2032-06-01', '2033-03-31', false),
  ('2033-2034', '2033-06-01', '2034-03-31', false),
  ('2034-2035', '2034-06-01', '2035-03-31', false),
  ('2035-2036', '2035-06-01', '2036-03-31', false),
  ('2036-2037', '2036-06-01', '2037-03-31', false),
  ('2037-2038', '2037-06-01', '2038-03-31', false),
  ('2038-2039', '2038-06-01', '2039-03-31', false),
  ('2039-2040', '2039-06-01', '2040-03-31', false)
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_years_name ON academic_years(name);

-- ============================================
-- USER MENU ORDER TABLE (for sidebar reordering)
-- ============================================
CREATE TABLE IF NOT EXISTS user_menu_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  menu_order JSONB DEFAULT '[]',
  sidebar_collapsed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_menu_order_user ON user_menu_order(user_id);

-- ============================================
-- FEE STRUCTURE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS fee_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  grade_level TEXT DEFAULT 'All',
  description TEXT DEFAULT '',
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GRADE LEVELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  level INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO grade_levels (name, order_index, is_active) VALUES
  ('Kindergarten', 1, true),
  ('Grade 1', 2, true),
  ('Grade 2', 3, true),
  ('Grade 3', 4, true),
  ('Grade 4', 5, true),
  ('Grade 5', 6, true),
  ('Grade 6', 7, true),
  ('Grade 7', 8, true),
  ('Grade 8', 9, true),
  ('Grade 9', 10, true),
  ('Grade 10', 11, true),
  ('Grade 11', 12, true),
  ('Grade 12', 13, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#5B8C51',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subjects
INSERT INTO subjects (name, code, icon, color, is_active) VALUES
  ('English', 'ENG', '📖', '#4A90E2', true),
  ('Mathematics', 'MATH', '🔢', '#E94B3C', true),
  ('Science', 'SCI', '🔬', '#50C878', true),
  ('Filipino', 'FIL', '🇵🇭', '#FDB813', true),
  ('Social Studies', 'SS', '🌍', '#9B59B6', true),
  ('MAPEH', 'MAPEH', '🎨', '#FF6B6B', true),
  ('TLE', 'TLE', '🔧', '#F39C12', true),
  ('Values Education', 'VAL', '❤️', '#E91E63', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TEACHER SUBJECTS TABLE (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);

-- ============================================
-- TEACHER GRADE LEVELS TABLE (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  grade_level_id UUID REFERENCES grade_levels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, grade_level_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_grade_levels_teacher ON teacher_grade_levels(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_grade_levels_grade ON teacher_grade_levels(grade_level_id);

-- ============================================
-- TEACHER SUBJECT GRADE ASSIGNMENTS TABLE
-- ============================================
-- Links teachers to specific subjects within grade levels for a specific academic year
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

CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade_teacher ON teacher_subject_grade_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade_subject ON teacher_subject_grade_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade_grade ON teacher_subject_grade_assignments(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade_year ON teacher_subject_grade_assignments(academic_year_id);

COMMENT ON TABLE teacher_subject_grade_assignments IS 'Maps teachers to specific subjects within grade levels for each academic year';
COMMENT ON COLUMN teacher_subject_grade_assignments.assigned_by IS 'Admin or Principal who made the assignment';

-- ============================================
-- ROLE MODULE PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS role_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  module_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module_key)
);

CREATE INDEX IF NOT EXISTS idx_role_module_permissions_role ON role_module_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module ON role_module_permissions(module_key);

-- Add performance indexes to profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Seed default role module permissions
INSERT INTO role_module_permissions (role, module_key, is_enabled) VALUES
  ('admin', 'Dashboard', true), ('admin', 'Announcements', true), ('admin', 'Student Records', true),
  ('admin', 'Classroom', true), ('admin', 'Grade Levels', true), ('admin', 'Classes', true),
  ('admin', 'Teachers', true), ('admin', 'Admins', true), ('admin', 'Principals', true),
  ('admin', 'Registrars', true), ('admin', 'Accounting', true), ('admin', 'Finance', true),
  ('admin', 'Academic Years', true), ('admin', 'Reports', true), ('admin', 'Chat', true),
  ('admin', 'Calendar', true), ('admin', 'Suggestions', true), ('admin', 'Settings', true),
  ('teacher', 'Dashboard', true), ('teacher', 'Announcements', true), ('teacher', 'Student Records', true),
  ('teacher', 'Classroom', true), ('teacher', 'Classes', true), ('teacher', 'Reports', true),
  ('teacher', 'Chat', true), ('teacher', 'Calendar', true), ('teacher', 'Suggestions', true),
  ('student', 'Dashboard', true), ('student', 'Announcements', true), ('student', 'Classroom', true),
  ('student', 'Chat', true), ('student', 'Calendar', true), ('student', 'Suggestions', true),
  ('finance', 'Dashboard', true), ('finance', 'Announcements', true), ('finance', 'Student Records', true),
  ('finance', 'Accounting', true), ('finance', 'Finance', true), ('finance', 'Reports', true),
  ('finance', 'Chat', true), ('finance', 'Calendar', true),
  ('principal', 'Dashboard', true), ('principal', 'Announcements', true), ('principal', 'Student Records', true),
  ('principal', 'Classroom', true), ('principal', 'Grade Levels', true), ('principal', 'Classes', true),
  ('principal', 'Teachers', true), ('principal', 'Admins', true), ('principal', 'Principals', true),
  ('principal', 'Registrars', true), ('principal', 'Accounting', true), ('principal', 'Finance', true),
  ('principal', 'Academic Years', true), ('principal', 'Reports', true), ('principal', 'Chat', true),
  ('principal', 'Calendar', true), ('principal', 'Suggestions', true), ('principal', 'Settings', true),
  ('registrar', 'Dashboard', true), ('registrar', 'Announcements', true), ('registrar', 'Student Records', true),
  ('registrar', 'Grade Levels', true), ('registrar', 'Classes', true), ('registrar', 'Registrars', true),
  ('registrar', 'Academic Years', true), ('registrar', 'Reports', true), ('registrar', 'Chat', true), ('registrar', 'Calendar', true),
  ('accounting', 'Dashboard', true), ('accounting', 'Announcements', true), ('accounting', 'Student Records', true),
  ('accounting', 'Accounting', true), ('accounting', 'Finance', true), ('accounting', 'Reports', true),
  ('accounting', 'Chat', true), ('accounting', 'Calendar', true)
ON CONFLICT (role, module_key) DO NOTHING;

-- ============================================
-- NOTIFICATION SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  email_announcements BOOLEAN DEFAULT true,
  email_grades BOOLEAN DEFAULT true,
  email_attendance BOOLEAN DEFAULT false,
  email_payments BOOLEAN DEFAULT true,
  sms_urgent BOOLEAN DEFAULT true,
  sms_reminders BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO notification_settings (id, email_announcements, email_grades, email_attendance, email_payments, sms_urgent, sms_reminders)
VALUES (1, true, true, false, true, true, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  timezone TEXT DEFAULT 'Asia/Manila',
  currency TEXT DEFAULT 'PHP',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  grading_system TEXT DEFAULT 'percentage',
  attendance_threshold INTEGER DEFAULT 80,
  late_payment_penalty INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (id, timezone, currency, date_format, grading_system, attendance_threshold, late_payment_penalty)
VALUES (1, 'Asia/Manila', 'PHP', 'MM/DD/YYYY', 'percentage', 80, 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT DEFAULT 'Tuition',
  status TEXT DEFAULT 'pending',
  reference TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE,
  student_name TEXT NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_by TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  receipt_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_no TEXT,
  name TEXT NOT NULL DEFAULT '',
  position TEXT DEFAULT '',
  department TEXT DEFAULT '',
  salary DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  hire_date DATE DEFAULT CURRENT_DATE,
  bank_account TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- ============================================
-- PAYROLL RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT CURRENT_DATE,
  basic_salary DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  bonuses DECIMAL(12,2) DEFAULT 0,
  net_pay DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUGGESTIONS & REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS suggestions_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('suggestion', 'review', 'complaint', 'feedback')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  submitter_name TEXT,
  submitter_email TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'archived')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions_reviews(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON suggestions_reviews(type);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON suggestions_reviews(created_at DESC);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  author_name TEXT DEFAULT '',
  priority TEXT DEFAULT 'normal',
  is_pinned BOOLEAN DEFAULT false,
  target_audience TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);

-- ============================================
-- CLASSES TABLE (Google Classroom-like)
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_name TEXT,
  grade_level TEXT NOT NULL,
  section TEXT DEFAULT '',
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  school_year TEXT NOT NULL,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  class_code TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  room TEXT DEFAULT '',
  schedule TEXT DEFAULT '',
  max_students INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_school_year ON classes(school_year);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade_level);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);

-- ============================================
-- CLASS MEMBERSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS class_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'assistant')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_class ON class_memberships(class_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON class_memberships(user_id);

-- ============================================
-- TOPICS TABLE (Classwork organization)
-- ============================================
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_class ON topics(class_id);

-- ============================================
-- LESSONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_topic ON lessons(topic_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(class_id);

-- ============================================
-- MATERIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('document', 'link', 'video', 'other')),
  file_path TEXT,
  file_url TEXT,
  created_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_lesson ON materials(lesson_id);
CREATE INDEX IF NOT EXISTS idx_materials_topic ON materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_materials_class ON materials(class_id);

-- ============================================
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES student_records(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- Schema created successfully for Railway PostgreSQL!
-- Tables created:
-- 1. auth_users - User authentication
-- 2. profiles - User profiles
-- 3. student_records - Student information
-- 4. student_documents - Student document files
-- 5. school_settings - School information
-- 6. academic_years - Academic year management
-- 7. fee_structure - Fee types and amounts
-- 8. grade_levels - Available grade levels
-- 9. notification_settings - Notification preferences
-- 10. system_settings - System configuration
-- 11. payments - Payment records
-- 12. invoices - Student invoices
-- 13. expenses - Expense tracking
-- 14. employees - Employee/staff records
-- 15. payroll_records - Payroll history
-- 16. suggestions_reviews - Community feedback
-- 17. announcements - School announcements
-- 18. classes - Class/section management
-- 19. attendance - Student attendance


-- Add missing tables and views for Dashboards and New Modules

-- ============================================
-- SECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_level_id UUID REFERENCES grade_levels(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_grade_level ON sections(grade_level_id);

-- ============================================
-- ASSIGNMENTS TABLE (Enhanced for Classroom)
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  points_possible INTEGER DEFAULT 100,
  allow_late_submission BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_topic ON assignments(topic_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);

-- ============================================
-- SUBMISSIONS TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  content TEXT,
  file_path TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'late', 'graded', 'returned', 'missing')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  grade DECIMAL(5,2),
  feedback TEXT,
  graded_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ============================================
-- STUDENT GRADES TABLE (for Final Grades)
-- ============================================
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES student_records(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  grading_period TEXT NOT NULL, -- e.g., 'Q1', 'Q2', 'Final'
  grade_value DECIMAL(5,2),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, academic_year, grading_period)
);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  type TEXT DEFAULT 'school' CHECK (type IN ('school', 'class', 'holiday', 'exam', 'other')),
  target_audience TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DASHBOARD KPI VIEWS
-- ============================================

-- View for teacher stats
CREATE OR REPLACE VIEW v_teacher_dashboard_stats AS
SELECT 
    t.id as teacher_id,
    (SELECT count(*) FROM classes WHERE teacher_id = t.id AND is_active = true) as my_classes,
    (SELECT count(*) FROM submissions s 
     JOIN assignments a ON s.assignment_id = a.id 
     WHERE a.teacher_id = t.id AND s.status IN ('submitted', 'late') AND s.graded_at IS NULL) as submissions_to_check
FROM auth_users t;

-- Add enrollment_status to student_records if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_records' AND column_name='enrollment_status') THEN
        ALTER TABLE student_records ADD COLUMN enrollment_status TEXT DEFAULT 'Enrolled';
    END IF;
END $$;
