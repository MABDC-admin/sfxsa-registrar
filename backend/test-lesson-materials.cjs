/**
 * Test Script: Verify Lesson Materials Functionality
 * Tests basic CRUD operations on lesson_materials table
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.app') ? { rejectUnauthorized: false } : false
});

async function testLessonMaterials() {
  console.log('🧪 Testing Lesson Materials Functionality...\n');
  
  try {
    // Test 1: Check if table exists
    console.log('📋 Test 1: Checking if lesson_materials table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lesson_materials'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ lesson_materials table does not exist!');
      console.log('Run migration 004: npm run migrate');
      return;
    }
    console.log('✅ lesson_materials table exists\n');

    // Test 2: Count existing materials
    console.log('📋 Test 2: Counting existing materials...');
    const countResult = await pool.query('SELECT COUNT(*) FROM lesson_materials');
    console.log(`✅ Found ${countResult.rows[0].count} lesson materials\n`);

    // Test 3: Get a teacher ID for testing
    console.log('📋 Test 3: Finding a teacher for test data...');
    const teacherResult = await pool.query(`
      SELECT id, full_name FROM profiles WHERE role = 'teacher' LIMIT 1
    `);
    
    if (teacherResult.rows.length === 0) {
      console.log('⚠️  No teachers found in database. Creating test teacher...');
      const createTeacherResult = await pool.query(`
        INSERT INTO auth_users (email, encrypted_password, role)
        VALUES ('test.teacher@school.com', '$2a$10$test', 'teacher')
        RETURNING id
      `);
      const teacherId = createTeacherResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO profiles (id, email, full_name, role, is_active)
        VALUES ($1, 'test.teacher@school.com', 'Test Teacher', 'teacher', true)
      `, [teacherId]);
      
      console.log(`✅ Created test teacher: ${teacherId}\n`);
    } else {
      console.log(`✅ Using teacher: ${teacherResult.rows[0].full_name} (${teacherResult.rows[0].id})\n`);
    }

    // Test 4: Get a subject ID
    console.log('📋 Test 4: Finding a subject...');
    const subjectResult = await pool.query(`
      SELECT id, name FROM subjects WHERE is_active = true LIMIT 1
    `);
    
    if (subjectResult.rows.length === 0) {
      console.log('❌ No active subjects found!');
      return;
    }
    console.log(`✅ Using subject: ${subjectResult.rows[0].name} (${subjectResult.rows[0].id})\n`);

    // Test 5: Insert a test material
    console.log('📋 Test 5: Inserting test lesson material...');
    const teacherId = teacherResult.rows[0]?.id || (await pool.query(`
      SELECT id FROM profiles WHERE role = 'teacher' LIMIT 1
    `)).rows[0].id;
    
    const subjectId = subjectResult.rows[0].id;
    
    const insertResult = await pool.query(`
      INSERT INTO lesson_materials (
        title, description, subject_id, grade_level, teacher_id,
        content_type, is_published, school_year
      ) VALUES (
        'Test Material - ' || NOW()::TEXT,
        'This is a test lesson material',
        $1,
        'Grade 1',
        $2,
        'document',
        true,
        '2025-2026'
      )
      RETURNING *
    `, [subjectId, teacherId]);
    
    console.log('✅ Inserted test material:');
    console.log(`   ID: ${insertResult.rows[0].id}`);
    console.log(`   Title: ${insertResult.rows[0].title}`);
    console.log(`   Teacher: ${insertResult.rows[0].teacher_id}`);
    console.log(`   Subject: ${insertResult.rows[0].subject_id}\n`);

    // Test 6: Query the material back
    console.log('📋 Test 6: Querying lesson materials...');
    const queryResult = await pool.query(`
      SELECT 
        lm.*,
        s.name as subject_name,
        p.full_name as teacher_name
      FROM lesson_materials lm
      LEFT JOIN subjects s ON lm.subject_id = s.id
      LEFT JOIN profiles p ON lm.teacher_id = p.id
      ORDER BY lm.created_at DESC
      LIMIT 5
    `);
    
    console.log(`✅ Found ${queryResult.rows.length} materials:`);
    queryResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.title}`);
      console.log(`      Teacher: ${row.teacher_name || 'Unknown'}`);
      console.log(`      Subject: ${row.subject_name || 'Unknown'}`);
      console.log(`      Grade: ${row.grade_level}`);
      console.log(`      Published: ${row.is_published}`);
    });
    console.log('');

    // Test 7: Update the test material
    console.log('📋 Test 7: Updating test material...');
    const updateResult = await pool.query(`
      UPDATE lesson_materials 
      SET description = 'Updated description - ' || NOW()::TEXT
      WHERE id = $1
      RETURNING *
    `, [insertResult.rows[0].id]);
    
    console.log('✅ Updated material description\n');

    // Test 8: Delete the test material
    console.log('📋 Test 8: Deleting test material...');
    await pool.query(`
      DELETE FROM lesson_materials WHERE id = $1
    `, [insertResult.rows[0].id]);
    
    console.log('✅ Deleted test material\n');

    console.log('🎉 All tests passed! Lesson materials functionality is working.\n');
    console.log('📊 Summary:');
    console.log('   ✅ Table exists and is accessible');
    console.log('   ✅ Can insert new materials');
    console.log('   ✅ Can query materials with JOINs');
    console.log('   ✅ Can update materials');
    console.log('   ✅ Can delete materials');
    console.log('');
    console.log('✨ The lesson materials system is ready to use!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n📋 Error details:', error);
  } finally {
    await pool.end();
  }
}

testLessonMaterials();
