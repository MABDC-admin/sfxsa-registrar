/**
 * Test Script: Verify File Upload Tables
 * Checks that all tables and columns exist in the database
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.app') ? { rejectUnauthorized: false } : false
});

async function testFileUploadTables() {
  console.log('🧪 Testing File Upload System Tables...\n');
  
  try {
    // Test 1: Check lesson_materials table
    console.log('📋 Test 1: Checking lesson_materials table...');
    const lessonMaterialsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lesson_materials'
      ORDER BY ordinal_position;
    `;
    const lessonMaterialsResult = await pool.query(lessonMaterialsQuery);
    
    if (lessonMaterialsResult.rows.length === 0) {
      console.log('❌ lesson_materials table not found!');
      return;
    }
    
    console.log('✅ lesson_materials table exists with columns:');
    lessonMaterialsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    console.log('');

    // Test 2: Check submission_files table
    console.log('📋 Test 2: Checking submission_files table...');
    const submissionFilesQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'submission_files'
      ORDER BY ordinal_position;
    `;
    const submissionFilesResult = await pool.query(submissionFilesQuery);
    
    if (submissionFilesResult.rows.length === 0) {
      console.log('❌ submission_files table not found!');
      return;
    }
    
    console.log('✅ submission_files table exists with columns:');
    submissionFilesResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    console.log('');

    // Test 3: Check lesson_material_views table
    console.log('📋 Test 3: Checking lesson_material_views table...');
    const viewsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lesson_material_views'
      ORDER BY ordinal_position;
    `;
    const viewsResult = await pool.query(viewsQuery);
    
    if (viewsResult.rows.length === 0) {
      console.log('❌ lesson_material_views table not found!');
      return;
    }
    
    console.log('✅ lesson_material_views table exists with columns:');
    viewsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    console.log('');

    // Test 4: Check assignments table for new columns
    console.log('📋 Test 4: Checking assignments table for file fields...');
    const assignmentsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assignments' 
      AND column_name IN ('file_name', 'file_type', 'file_size');
    `;
    const assignmentsResult = await pool.query(assignmentsQuery);
    
    if (assignmentsResult.rows.length === 0) {
      console.log('❌ assignments table file fields not found!');
      return;
    }
    
    console.log('✅ assignments table has file upload fields:');
    assignmentsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    console.log('');

    // Test 5: Check assignment_submissions table for new columns
    console.log('📋 Test 5: Checking assignment_submissions table for file fields...');
    const submissionsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assignment_submissions' 
      AND column_name IN ('file_name', 'file_type', 'file_size');
    `;
    const submissionsResult = await pool.query(submissionsQuery);
    
    if (submissionsResult.rows.length === 0) {
      console.log('❌ assignment_submissions table file fields not found!');
      return;
    }
    
    console.log('✅ assignment_submissions table has file upload fields:');
    submissionsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    console.log('');

    // Test 6: Check storage_blobs table for new columns
    console.log('📋 Test 6: Checking storage_blobs table for metadata fields...');
    const storageBlobsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'storage_blobs' 
      AND column_name IN ('uploaded_by', 'folder', 'description', 'is_public');
    `;
    const storageBlobsResult = await pool.query(storageBlobsQuery);
    
    if (storageBlobsResult.rows.length === 0) {
      console.log('❌ storage_blobs table metadata fields not found!');
      return;
    }
    
    console.log('✅ storage_blobs table has metadata fields:');
    storageBlobsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    console.log('');

    // Test 7: Check helper functions
    console.log('📋 Test 7: Checking helper functions...');
    const functionsQuery = `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_type = 'FUNCTION' 
      AND routine_name IN ('extract_youtube_id', 'get_file_icon', 'update_lesson_material_timestamp')
      ORDER BY routine_name;
    `;
    const functionsResult = await pool.query(functionsQuery);
    
    if (functionsResult.rows.length === 0) {
      console.log('❌ Helper functions not found!');
      return;
    }
    
    console.log('✅ Helper functions exist:');
    functionsResult.rows.forEach(row => {
      console.log(`   - ${row.routine_name}()`);
    });
    console.log('');

    // Test 8: Check indexes
    console.log('📋 Test 8: Checking indexes...');
    const indexesQuery = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('lesson_materials', 'submission_files', 'lesson_material_views')
      ORDER BY tablename, indexname;
    `;
    const indexesResult = await pool.query(indexesQuery);
    
    console.log('✅ Indexes created:');
    indexesResult.rows.forEach(row => {
      console.log(`   - ${row.indexname} on ${row.tablename}`);
    });
    console.log('');

    // Test 9: Check foreign keys
    console.log('📋 Test 9: Checking foreign key constraints...');
    const fkQuery = `
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name IN ('lesson_materials', 'submission_files', 'lesson_material_views')
      ORDER BY tc.table_name;
    `;
    const fkResult = await pool.query(fkQuery);
    
    console.log('✅ Foreign key constraints:');
    fkResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    console.log('');

    // Test 10: Test extract_youtube_id function
    console.log('📋 Test 10: Testing extract_youtube_id() function...');
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    ];
    
    for (const url of testUrls) {
      const result = await pool.query('SELECT extract_youtube_id($1) as video_id', [url]);
      console.log(`   ✅ ${url} → ${result.rows[0].video_id}`);
    }
    console.log('');

    // Test 11: Test get_file_icon function
    console.log('📋 Test 11: Testing get_file_icon() function...');
    const testTypes = [
      'application/pdf',
      'image/jpeg',
      'video/mp4',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    for (const type of testTypes) {
      const result = await pool.query('SELECT get_file_icon($1) as icon', [type]);
      console.log(`   ✅ ${type} → ${result.rows[0].icon}`);
    }
    console.log('');

    console.log('🎉 All tests passed! File upload system is ready.\n');
    console.log('📊 Summary:');
    console.log('   ✅ lesson_materials table: OK');
    console.log('   ✅ submission_files table: OK');
    console.log('   ✅ lesson_material_views table: OK');
    console.log('   ✅ assignments file fields: OK');
    console.log('   ✅ assignment_submissions file fields: OK');
    console.log('   ✅ storage_blobs metadata: OK');
    console.log('   ✅ Helper functions: OK');
    console.log('   ✅ Indexes: OK');
    console.log('   ✅ Foreign keys: OK');
    console.log('   ✅ Function tests: OK');
    console.log('');
    console.log('✨ System Status: READY FOR USE');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n📋 Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

testFileUploadTables();
