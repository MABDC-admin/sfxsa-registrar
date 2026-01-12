// Script to run seed data on Railway PostgreSQL
import 'dotenv/config';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeedScripts() {
  if (!process.env.DATABASE_URL) {
    console.log('❌ No DATABASE_URL found. Please set it in .env file.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Starting data seeding process...\n');

    // Step 1: Seed sections and subjects
    console.log('📝 Step 1: Creating sections and sample classes...');
    const sectionsScript = fs.readFileSync(
      path.join(__dirname, 'seed-sections-and-subjects.sql'),
      'utf8'
    );
    
    await pool.query(sectionsScript);
    console.log('✅ Sections and classes created!\n');

    // Step 2: Seed test teachers and assignments
    console.log('📝 Step 2: Creating test teachers and assignments...');
    const teachersScript = fs.readFileSync(
      path.join(__dirname, 'seed-test-teachers-and-assignments.sql'),
      'utf8'
    );
    
    await pool.query(teachersScript);
    console.log('✅ Test teachers and assignments created!\n');

    // Verify the setup
    console.log('🔍 Verifying setup...\n');
    
    const sectionsCount = await pool.query('SELECT COUNT(*) FROM sections');
    console.log(`✓ Sections: ${sectionsCount.rows[0].count}`);
    
    const classesCount = await pool.query('SELECT COUNT(*) FROM classes WHERE subject_name IS NOT NULL');
    console.log(`✓ Classes: ${classesCount.rows[0].count}`);
    
    const teachersCount = await pool.query("SELECT COUNT(*) FROM profiles WHERE role = 'teacher' AND email LIKE '%@school.edu'");
    console.log(`✓ Test Teachers: ${teachersCount.rows[0].count}`);
    
    const assignmentsCount = await pool.query('SELECT COUNT(*) FROM teacher_subject_grade_assignments');
    console.log(`✓ Active Assignments: ${assignmentsCount.rows[0].count}`);

    console.log('\n🎉 All seed data created successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open your application');
    console.log('2. Go to Grade Levels → Grade 1');
    console.log('3. You should see 5 subject cards with teacher assignment functionality');

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

runSeedScripts();
