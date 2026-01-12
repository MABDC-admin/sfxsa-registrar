-- Migration 004: File Upload & Content Management System
-- Created: 2026-01-12
-- Purpose: Add file storage for lessons, assignments, and student submissions

-- ============================================
-- LESSON MATERIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  grade_level TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  video_url TEXT,
  youtube_embed_id TEXT,
  content_type TEXT DEFAULT 'document', -- document, video, image, link
  school_year TEXT DEFAULT '2025-2026',
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_materials_subject ON lesson_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_teacher ON lesson_materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_grade_level ON lesson_materials(grade_level);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_school_year ON lesson_materials(school_year);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_published ON lesson_materials(is_published);

COMMENT ON TABLE lesson_materials IS 'Storage for lesson materials, documents, videos, and resources';
COMMENT ON COLUMN lesson_materials.content_type IS 'Type: document, video, image, link';

-- ============================================
-- UPDATE ASSIGNMENTS TABLE - Add file upload fields
-- ============================================
DO $$
BEGIN
  -- Add attachment columns to assignments if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='assignments' AND column_name='file_name') THEN
    ALTER TABLE assignments ADD COLUMN file_name TEXT;
    ALTER TABLE assignments ADD COLUMN file_type TEXT;
    ALTER TABLE assignments ADD COLUMN file_size INTEGER;
    RAISE NOTICE 'Added file upload fields to assignments table';
  END IF;
END $$;

-- ============================================
-- UPDATE ASSIGNMENT SUBMISSIONS TABLE - Add file upload fields
-- ============================================
DO $$
BEGIN
  -- Add file submission columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='assignment_submissions' AND column_name='file_name') THEN
    ALTER TABLE assignment_submissions ADD COLUMN file_name TEXT;
    ALTER TABLE assignment_submissions ADD COLUMN file_type TEXT;
    ALTER TABLE assignment_submissions ADD COLUMN file_size INTEGER;
    RAISE NOTICE 'Added file upload fields to assignment_submissions table';
  END IF;
END $$;

-- ============================================
-- STUDENT SUBMISSION FILES TABLE (Multiple files per submission)
-- ============================================
CREATE TABLE IF NOT EXISTS submission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON submission_files(submission_id);

COMMENT ON TABLE submission_files IS 'Multiple file attachments for student submissions';

-- ============================================
-- LESSON MATERIAL VIEWS TABLE (Track student views)
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_material_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES lesson_materials(id) ON DELETE CASCADE,
  student_id UUID REFERENCES student_records(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration INTEGER DEFAULT 0,
  UNIQUE(material_id, student_id, viewed_at)
);

CREATE INDEX IF NOT EXISTS idx_material_views_material ON lesson_material_views(material_id);
CREATE INDEX IF NOT EXISTS idx_material_views_student ON lesson_material_views(student_id);

COMMENT ON TABLE lesson_material_views IS 'Tracks student engagement with lesson materials';

-- ============================================
-- UPDATE STORAGE_BLOBS TABLE - Add metadata
-- ============================================
DO $$
BEGIN
  -- Add metadata columns to storage_blobs if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='storage_blobs' AND column_name='uploaded_by') THEN
    ALTER TABLE storage_blobs ADD COLUMN uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    ALTER TABLE storage_blobs ADD COLUMN folder TEXT DEFAULT 'general';
    ALTER TABLE storage_blobs ADD COLUMN description TEXT;
    ALTER TABLE storage_blobs ADD COLUMN is_public BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added metadata fields to storage_blobs table';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_storage_blobs_uploaded_by ON storage_blobs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_storage_blobs_folder ON storage_blobs(folder);

-- ============================================
-- AUTO-UPDATE TIMESTAMP TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_lesson_material_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lesson_material_timestamp ON lesson_materials;
CREATE TRIGGER trigger_update_lesson_material_timestamp
  BEFORE UPDATE ON lesson_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_material_timestamp();

-- ============================================
-- HELPER FUNCTION: Extract YouTube Video ID from URL
-- ============================================
CREATE OR REPLACE FUNCTION extract_youtube_id(url TEXT)
RETURNS TEXT AS $$
DECLARE
  video_id TEXT;
BEGIN
  -- Handle youtube.com/watch?v=VIDEO_ID
  IF url ~* 'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)' THEN
    video_id := substring(url from 'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)');
    RETURN video_id;
  END IF;
  
  -- Handle youtu.be/VIDEO_ID
  IF url ~* 'youtu\.be/([a-zA-Z0-9_-]+)' THEN
    video_id := substring(url from 'youtu\.be/([a-zA-Z0-9_-]+)');
    RETURN video_id;
  END IF;
  
  -- Handle youtube.com/embed/VIDEO_ID
  IF url ~* 'youtube\.com/embed/([a-zA-Z0-9_-]+)' THEN
    video_id := substring(url from 'youtube\.com/embed/([a-zA-Z0-9_-]+)');
    RETURN video_id;
  END IF;
  
  -- If no pattern matches, return the original URL
  RETURN url;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- HELPER FUNCTION: Get file icon based on type
-- ============================================
CREATE OR REPLACE FUNCTION get_file_icon(file_type TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE
    WHEN file_type IN ('application/pdf') THEN RETURN '📄';
    WHEN file_type LIKE 'image/%' THEN RETURN '🖼️';
    WHEN file_type LIKE 'video/%' THEN RETURN '🎬';
    WHEN file_type IN ('application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') THEN RETURN '📝';
    WHEN file_type IN ('application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') THEN RETURN '📊';
    WHEN file_type IN ('application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation') THEN RETURN '📽️';
    WHEN file_type IN ('application/zip', 'application/x-rar-compressed') THEN RETURN '📦';
    ELSE RETURN '📎';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 004 completed successfully!';
  RAISE NOTICE '📁 Created: lesson_materials, submission_files, lesson_material_views';
  RAISE NOTICE '📤 Updated: assignments, assignment_submissions with file fields';
  RAISE NOTICE '💾 Enhanced: storage_blobs with metadata';
  RAISE NOTICE '🔧 Added helper functions: extract_youtube_id, get_file_icon';
END $$;
