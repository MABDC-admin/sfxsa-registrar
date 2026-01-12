-- Migration: Add missing columns to profiles table
-- Date: 2026-01-12
-- Description: Adds email and is_active columns to support refactored user management

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT DEFAULT '';
    RAISE NOTICE 'Added email column to profiles table';
  ELSE
    RAISE NOTICE 'email column already exists in profiles table';
  END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_active column to profiles table';
  ELSE
    RAISE NOTICE 'is_active column already exists in profiles table';
  END IF;
END $$;

-- Create subjects table if it doesn't exist
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

-- Create teacher_subjects junction table
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);

-- Create teacher_grade_levels junction table
CREATE TABLE IF NOT EXISTS teacher_grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  grade_level_id UUID REFERENCES grade_levels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, grade_level_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_grade_levels_teacher ON teacher_grade_levels(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_grade_levels_grade ON teacher_grade_levels(grade_level_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'Added columns: profiles.email, profiles.is_active';
  RAISE NOTICE 'Created tables: subjects, teacher_subjects, teacher_grade_levels';
END $$;
