-- Seed sections and subjects for teacher assignment testing
-- Run this in Railway PostgreSQL Query console

-- First, create sections for each grade level
INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Kindergarten'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 1'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section B', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 1'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 2'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 3'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 4'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 5'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 6'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 7'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 8'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 9'
ON CONFLICT DO NOTHING;

INSERT INTO sections (name, grade_level_id)
SELECT 'Section A', gl.id FROM grade_levels gl WHERE gl.name = 'Grade 10'
ON CONFLICT DO NOTHING;

-- Now create sample classes for Grade 1 Section A
-- Get the active academic year ID
DO $$
DECLARE
    v_section_id UUID;
    v_academic_year_id UUID;
    v_admin_id UUID;
BEGIN
    -- Get Grade 1 Section A ID
    SELECT id INTO v_section_id 
    FROM sections s
    INNER JOIN grade_levels gl ON s.grade_level_id = gl.id
    WHERE gl.name = 'Grade 1' AND s.name = 'Section A'
    LIMIT 1;

    -- Get active academic year
    SELECT id INTO v_academic_year_id 
    FROM academic_years 
    WHERE is_active = true 
    LIMIT 1;

    -- Get first admin user
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE role = 'admin'
    LIMIT 1;

    -- Insert classes if section and year exist
    IF v_section_id IS NOT NULL AND v_academic_year_id IS NOT NULL THEN
        -- English
        INSERT INTO classes (subject_name, section_id, academic_year_id, class_code, created_by, name, grade_level, section, school_year, is_active)
        SELECT 'English', v_section_id, v_academic_year_id, 'G1-ENG-' || EXTRACT(EPOCH FROM NOW())::BIGINT, v_admin_id, 'English', 'Grade 1', 'Section A', '2025-2026', true
        ON CONFLICT DO NOTHING;

        -- Mathematics
        INSERT INTO classes (subject_name, section_id, academic_year_id, class_code, created_by, name, grade_level, section, school_year, is_active)
        SELECT 'Mathematics', v_section_id, v_academic_year_id, 'G1-MATH-' || EXTRACT(EPOCH FROM NOW())::BIGINT, v_admin_id, 'Mathematics', 'Grade 1', 'Section A', '2025-2026', true
        ON CONFLICT DO NOTHING;

        -- Science
        INSERT INTO classes (subject_name, section_id, academic_year_id, class_code, created_by, name, grade_level, section, school_year, is_active)
        SELECT 'Science', v_section_id, v_academic_year_id, 'G1-SCI-' || EXTRACT(EPOCH FROM NOW())::BIGINT, v_admin_id, 'Science', 'Grade 1', 'Section A', '2025-2026', true
        ON CONFLICT DO NOTHING;

        -- Filipino
        INSERT INTO classes (subject_name, section_id, academic_year_id, class_code, created_by, name, grade_level, section, school_year, is_active)
        SELECT 'Filipino', v_section_id, v_academic_year_id, 'G1-FIL-' || EXTRACT(EPOCH FROM NOW())::BIGINT, v_admin_id, 'Filipino', 'Grade 1', 'Section A', '2025-2026', true
        ON CONFLICT DO NOTHING;

        -- MAPEH
        INSERT INTO classes (subject_name, section_id, academic_year_id, class_code, created_by, name, grade_level, section, school_year, is_active)
        SELECT 'MAPEH', v_section_id, v_academic_year_id, 'G1-MAPEH-' || EXTRACT(EPOCH FROM NOW())::BIGINT, v_admin_id, 'MAPEH', 'Grade 1', 'Section A', '2025-2026', true
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sample classes created successfully for Grade 1 Section A';
    ELSE
        RAISE NOTICE 'Cannot create classes: Missing section or academic year';
    END IF;
END $$;

-- Verify the data
SELECT 
    gl.name as grade_level,
    s.name as section,
    COUNT(c.id) as class_count
FROM grade_levels gl
LEFT JOIN sections s ON s.grade_level_id = gl.id
LEFT JOIN classes c ON c.section_id = s.id
GROUP BY gl.name, s.name
ORDER BY gl.order_index, s.name;
