-- Migration 002: Add role_module_permissions table
-- Date: 2026-01-12
-- Description: Creates role-based module permissions system

-- Create role_module_permissions table
CREATE TABLE IF NOT EXISTS role_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  module_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_role ON role_module_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module ON role_module_permissions(module_key);

-- Add performance indexes to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_role') THEN
    CREATE INDEX idx_profiles_role ON profiles(role);
    RAISE NOTICE 'Created index: idx_profiles_role';
  ELSE
    RAISE NOTICE 'Index idx_profiles_role already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_email') THEN
    CREATE INDEX idx_profiles_email ON profiles(email);
    RAISE NOTICE 'Created index: idx_profiles_email';
  ELSE
    RAISE NOTICE 'Index idx_profiles_email already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_is_active') THEN
    CREATE INDEX idx_profiles_is_active ON profiles(is_active);
    RAISE NOTICE 'Created index: idx_profiles_is_active';
  ELSE
    RAISE NOTICE 'Index idx_profiles_is_active already exists';
  END IF;
END $$;

-- Seed default permissions for all roles and modules
INSERT INTO role_module_permissions (role, module_key, is_enabled) VALUES
  -- Admin (full access)
  ('admin', 'Dashboard', true),
  ('admin', 'Announcements', true),
  ('admin', 'Student Records', true),
  ('admin', 'Classroom', true),
  ('admin', 'Grade Levels', true),
  ('admin', 'Classes', true),
  ('admin', 'Teachers', true),
  ('admin', 'Admins', true),
  ('admin', 'Principals', true),
  ('admin', 'Registrars', true),
  ('admin', 'Accounting', true),
  ('admin', 'Finance', true),
  ('admin', 'Academic Years', true),
  ('admin', 'Reports', true),
  ('admin', 'Chat', true),
  ('admin', 'Calendar', true),
  ('admin', 'Suggestions', true),
  ('admin', 'Settings', true),
  
  -- Teacher
  ('teacher', 'Dashboard', true),
  ('teacher', 'Announcements', true),
  ('teacher', 'Student Records', true),
  ('teacher', 'Classroom', true),
  ('teacher', 'Grade Levels', false),
  ('teacher', 'Classes', true),
  ('teacher', 'Teachers', false),
  ('teacher', 'Admins', false),
  ('teacher', 'Principals', false),
  ('teacher', 'Registrars', false),
  ('teacher', 'Accounting', false),
  ('teacher', 'Finance', false),
  ('teacher', 'Academic Years', false),
  ('teacher', 'Reports', true),
  ('teacher', 'Chat', true),
  ('teacher', 'Calendar', true),
  ('teacher', 'Suggestions', true),
  ('teacher', 'Settings', false),
  
  -- Student
  ('student', 'Dashboard', true),
  ('student', 'Announcements', true),
  ('student', 'Student Records', false),
  ('student', 'Classroom', true),
  ('student', 'Grade Levels', false),
  ('student', 'Classes', false),
  ('student', 'Teachers', false),
  ('student', 'Admins', false),
  ('student', 'Principals', false),
  ('student', 'Registrars', false),
  ('student', 'Accounting', false),
  ('student', 'Finance', false),
  ('student', 'Academic Years', false),
  ('student', 'Reports', false),
  ('student', 'Chat', true),
  ('student', 'Calendar', true),
  ('student', 'Suggestions', true),
  ('student', 'Settings', false),
  
  -- Finance
  ('finance', 'Dashboard', true),
  ('finance', 'Announcements', true),
  ('finance', 'Student Records', true),
  ('finance', 'Classroom', false),
  ('finance', 'Grade Levels', false),
  ('finance', 'Classes', false),
  ('finance', 'Teachers', false),
  ('finance', 'Admins', false),
  ('finance', 'Principals', false),
  ('finance', 'Registrars', false),
  ('finance', 'Accounting', true),
  ('finance', 'Finance', true),
  ('finance', 'Academic Years', false),
  ('finance', 'Reports', true),
  ('finance', 'Chat', true),
  ('finance', 'Calendar', true),
  ('finance', 'Suggestions', false),
  ('finance', 'Settings', false),
  
  -- Principal (high access)
  ('principal', 'Dashboard', true),
  ('principal', 'Announcements', true),
  ('principal', 'Student Records', true),
  ('principal', 'Classroom', true),
  ('principal', 'Grade Levels', true),
  ('principal', 'Classes', true),
  ('principal', 'Teachers', true),
  ('principal', 'Admins', true),
  ('principal', 'Principals', true),
  ('principal', 'Registrars', true),
  ('principal', 'Accounting', true),
  ('principal', 'Finance', true),
  ('principal', 'Academic Years', true),
  ('principal', 'Reports', true),
  ('principal', 'Chat', true),
  ('principal', 'Calendar', true),
  ('principal', 'Suggestions', true),
  ('principal', 'Settings', true),
  
  -- Registrar
  ('registrar', 'Dashboard', true),
  ('registrar', 'Announcements', true),
  ('registrar', 'Student Records', true),
  ('registrar', 'Classroom', false),
  ('registrar', 'Grade Levels', true),
  ('registrar', 'Classes', true),
  ('registrar', 'Teachers', false),
  ('registrar', 'Admins', false),
  ('registrar', 'Principals', false),
  ('registrar', 'Registrars', true),
  ('registrar', 'Accounting', false),
  ('registrar', 'Finance', false),
  ('registrar', 'Academic Years', true),
  ('registrar', 'Reports', true),
  ('registrar', 'Chat', true),
  ('registrar', 'Calendar', true),
  ('registrar', 'Suggestions', false),
  ('registrar', 'Settings', false),
  
  -- Accounting
  ('accounting', 'Dashboard', true),
  ('accounting', 'Announcements', true),
  ('accounting', 'Student Records', true),
  ('accounting', 'Classroom', false),
  ('accounting', 'Grade Levels', false),
  ('accounting', 'Classes', false),
  ('accounting', 'Teachers', false),
  ('accounting', 'Admins', false),
  ('accounting', 'Principals', false),
  ('accounting', 'Registrars', false),
  ('accounting', 'Accounting', true),
  ('accounting', 'Finance', true),
  ('accounting', 'Academic Years', false),
  ('accounting', 'Reports', true),
  ('accounting', 'Chat', true),
  ('accounting', 'Calendar', true),
  ('accounting', 'Suggestions', false),
  ('accounting', 'Settings', false)
ON CONFLICT (role, module_key) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 002 completed successfully!';
  RAISE NOTICE 'Created table: role_module_permissions';
  RAISE NOTICE 'Added indexes: idx_profiles_role, idx_profiles_email, idx_profiles_is_active';
  RAISE NOTICE 'Seeded permissions for 7 roles × 18 modules = 126 records';
END $$;
