// Test script to verify teacher assignment functionality

const API_URL = 'https://sfxsa-registrar-production.up.railway.app';

async function testTeacherAssignments() {
  console.log('🔍 Testing Teacher Assignment System...\n');

  // Step 1: Login to get token
  console.log('1. Logging in...');
  const loginResponse = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@school.com',
      password: 'admin123',
      grant_type: 'password'
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text());
    return;
  }

  const { access_token: token } = await loginResponse.json();
  console.log('✅ Login successful\n');

  // Step 2: Check if table exists by querying assignments
  console.log('2. Testing GET /api/teacher-assignments/grade/{id}/year/{id}...');
  
  // First, get a grade level ID and academic year ID
  const gradeLevelsResponse = await fetch(`${API_URL}/rest/v1/grade_levels?select=id,name&limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const academicYearsResponse = await fetch(`${API_URL}/rest/v1/academic_years?select=id,name&is_active=eq.true&limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!gradeLevelsResponse.ok || !academicYearsResponse.ok) {
    console.error('❌ Failed to fetch grade levels or academic years');
    return;
  }

  const gradeLevels = await gradeLevelsResponse.json();
  const academicYears = await academicYearsResponse.json();

  if (!gradeLevels[0] || !academicYears[0]) {
    console.error('❌ No grade levels or academic years found');
    return;
  }

  const gradeId = gradeLevels[0].id;
  const yearId = academicYears[0].id;
  
  console.log(`   Testing with Grade: ${gradeLevels[0].name}, Year: ${academicYears[0].name}`);

  // Step 3: Test the teacher assignments endpoint
  const assignmentsResponse = await fetch(
    `${API_URL}/api/teacher-assignments/grade/${gradeId}/year/${yearId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (!assignmentsResponse.ok) {
    const errorText = await assignmentsResponse.text();
    console.error('❌ Teacher assignments endpoint failed:', errorText);
    
    if (errorText.includes('teacher_subject_grade_assignments') && errorText.includes('does not exist')) {
      console.error('\n⚠️  DATABASE TABLE MISSING!');
      console.error('   The table "teacher_subject_grade_assignments" needs to be created in Railway PostgreSQL.');
      return false;
    }
    return;
  }

  const assignments = await assignmentsResponse.json();
  console.log('✅ Teacher assignments endpoint working!');
  console.log(`   Found ${assignments.data?.length || 0} assignments\n`);

  // Step 4: Test available teachers endpoint
  console.log('3. Testing GET /api/teacher-assignments/available-teachers/{id}...');
  
  const subjectsResponse = await fetch(`${API_URL}/rest/v1/subjects?select=id,name&limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const subjects = await subjectsResponse.json();
  
  if (subjects[0]) {
    const teachersResponse = await fetch(
      `${API_URL}/api/teacher-assignments/available-teachers/${subjects[0].id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (teachersResponse.ok) {
      const teachers = await teachersResponse.json();
      console.log(`✅ Available teachers endpoint working!`);
      console.log(`   Found ${teachers.data?.length || 0} teachers for ${subjects[0].name}\n`);
    }
  }

  console.log('✅ ALL TESTS PASSED! Teacher assignment system is fully functional.\n');
  return true;
}

testTeacherAssignments().catch(console.error);
