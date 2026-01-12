-- Create test teachers with subject assignments for immediate testing
-- Run this in Railway PostgreSQL Query console after the sections seed script

-- Step 1: Create test teacher accounts
DO $$
DECLARE
    v_teacher1_id UUID;
    v_teacher2_id UUID;
    v_teacher3_id UUID;
    v_english_id UUID;
    v_math_id UUID;
    v_science_id UUID;
    v_filipino_id UUID;
    v_mapeh_id UUID;
BEGIN
    -- Create Teacher 1: Ms. Sarah Johnson (English & Filipino specialist)
    INSERT INTO auth_users (email, encrypted_password, raw_user_meta_data)
    VALUES (
        'sarah.johnson@school.edu',
        '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJK', -- dummy hash
        '{"full_name": "Ms. Sarah Johnson"}'
    )
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id INTO v_teacher1_id;

    INSERT INTO profiles (id, full_name, email, role, avatar_url, is_active)
    VALUES (
        v_teacher1_id,
        'Ms. Sarah Johnson',
        'sarah.johnson@school.edu',
        'teacher',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah&backgroundColor=transparent',
        true
    )
    ON CONFLICT (id) DO UPDATE SET role = 'teacher', is_active = true;

    -- Create Teacher 2: Mr. John Smith (Math & Science specialist)
    INSERT INTO auth_users (email, encrypted_password, raw_user_meta_data)
    VALUES (
        'john.smith@school.edu',
        '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJK',
        '{"full_name": "Mr. John Smith"}'
    )
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id INTO v_teacher2_id;

    INSERT INTO profiles (id, full_name, email, role, avatar_url, is_active)
    VALUES (
        v_teacher2_id,
        'Mr. John Smith',
        'john.smith@school.edu',
        'teacher',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=John&backgroundColor=transparent',
        true
    )
    ON CONFLICT (id) DO UPDATE SET role = 'teacher', is_active = true;

    -- Create Teacher 3: Ms. Maria Santos (MAPEH specialist)
    INSERT INTO auth_users (email, encrypted_password, raw_user_meta_data)
    VALUES (
        'maria.santos@school.edu',
        '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJK',
        '{"full_name": "Ms. Maria Santos"}'
    )
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id INTO v_teacher3_id;

    INSERT INTO profiles (id, full_name, email, role, avatar_url, is_active)
    VALUES (
        v_teacher3_id,
        'Ms. Maria Santos',
        'maria.santos@school.edu',
        'teacher',
        'https://api.dicebear.com/7.x/adventurer/svg?seed=Maria&backgroundColor=transparent',
        true
    )
    ON CONFLICT (id) DO UPDATE SET role = 'teacher', is_active = true;

    -- Get subject IDs
    SELECT id INTO v_english_id FROM subjects WHERE name = 'English';
    SELECT id INTO v_math_id FROM subjects WHERE name = 'Mathematics';
    SELECT id INTO v_science_id FROM subjects WHERE name = 'Science';
    SELECT id INTO v_filipino_id FROM subjects WHERE name = 'Filipino';
    SELECT id INTO v_mapeh_id FROM subjects WHERE name = 'MAPEH';

    -- Assign subjects to teachers (what they're qualified to teach)
    -- Teacher 1: English & Filipino
    INSERT INTO teacher_subjects (teacher_id, subject_id)
    VALUES 
        (v_teacher1_id, v_english_id),
        (v_teacher1_id, v_filipino_id)
    ON CONFLICT DO NOTHING;

    -- Teacher 2: Math & Science
    INSERT INTO teacher_subjects (teacher_id, subject_id)
    VALUES 
        (v_teacher2_id, v_math_id),
        (v_teacher2_id, v_science_id)
    ON CONFLICT DO NOTHING;

    -- Teacher 3: MAPEH
    INSERT INTO teacher_subjects (teacher_id, subject_id)
    VALUES 
        (v_teacher3_id, v_mapeh_id)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Test teachers created successfully!';
    RAISE NOTICE 'Teacher 1: Ms. Sarah Johnson - English, Filipino';
    RAISE NOTICE 'Teacher 2: Mr. John Smith - Mathematics, Science';
    RAISE NOTICE 'Teacher 3: Ms. Maria Santos - MAPEH';
END $$;

-- Step 2: Create sample teacher assignments for Grade 1
DO $$
DECLARE
    v_grade1_id UUID;
    v_academic_year_id UUID;
    v_english_id UUID;
    v_math_id UUID;
    v_teacher1_id UUID;
    v_teacher2_id UUID;
    v_admin_id UUID;
BEGIN
    -- Get Grade 1 ID
    SELECT id INTO v_grade1_id FROM grade_levels WHERE name = 'Grade 1';
    
    -- Get active academic year
    SELECT id INTO v_academic_year_id FROM academic_years WHERE is_active = true LIMIT 1;
    
    -- Get subject IDs
    SELECT id INTO v_english_id FROM subjects WHERE name = 'English';
    SELECT id INTO v_math_id FROM subjects WHERE name = 'Mathematics';
    
    -- Get teacher IDs
    SELECT id INTO v_teacher1_id FROM profiles WHERE email = 'sarah.johnson@school.edu';
    SELECT id INTO v_teacher2_id FROM profiles WHERE email = 'john.smith@school.edu';
    
    -- Get admin ID for assigned_by
    SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

    -- Assign teachers to Grade 1 subjects
    IF v_grade1_id IS NOT NULL AND v_academic_year_id IS NOT NULL THEN
        -- Ms. Sarah Johnson teaches English in Grade 1
        INSERT INTO teacher_subject_grade_assignments 
            (teacher_id, subject_id, grade_level_id, academic_year_id, assigned_by)
        VALUES 
            (v_teacher1_id, v_english_id, v_grade1_id, v_academic_year_id, v_admin_id)
        ON CONFLICT (teacher_id, subject_id, grade_level_id, academic_year_id) DO NOTHING;

        -- Mr. John Smith teaches Math in Grade 1
        INSERT INTO teacher_subject_grade_assignments 
            (teacher_id, subject_id, grade_level_id, academic_year_id, assigned_by)
        VALUES 
            (v_teacher2_id, v_math_id, v_grade1_id, v_academic_year_id, v_admin_id)
        ON CONFLICT (teacher_id, subject_id, grade_level_id, academic_year_id) DO NOTHING;

        RAISE NOTICE 'Sample teacher assignments created for Grade 1!';
    ELSE
        RAISE NOTICE 'Cannot create assignments: Missing grade level or academic year';
    END IF;
END $$;

-- Verify the setup
SELECT 
    'Teachers Created' as summary,
    COUNT(*) as count
FROM profiles 
WHERE role = 'teacher' AND email LIKE '%@school.edu'
UNION ALL
SELECT 
    'Teacher Qualifications' as summary,
    COUNT(*) as count
FROM teacher_subjects
UNION ALL
SELECT 
    'Active Assignments' as summary,
    COUNT(*) as count
FROM teacher_subject_grade_assignments;

-- Show detailed teacher information
SELECT 
    p.full_name as teacher_name,
    p.email,
    array_agg(DISTINCT s.name) as qualified_subjects
FROM profiles p
INNER JOIN teacher_subjects ts ON p.id = ts.teacher_id
INNER JOIN subjects s ON ts.subject_id = s.id
WHERE p.role = 'teacher'
GROUP BY p.id, p.full_name, p.email
ORDER BY p.full_name;

-- Show current assignments
SELECT 
    p.full_name as teacher_name,
    s.name as subject,
    gl.name as grade_level,
    ay.name as academic_year
FROM teacher_subject_grade_assignments tsga
INNER JOIN profiles p ON tsga.teacher_id = p.id
INNER JOIN subjects s ON tsga.subject_id = s.id
INNER JOIN grade_levels gl ON tsga.grade_level_id = gl.id
INNER JOIN academic_years ay ON tsga.academic_year_id = ay.id
ORDER BY gl.name, s.name;
