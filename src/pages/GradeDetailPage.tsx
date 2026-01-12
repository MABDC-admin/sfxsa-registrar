import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { useSchoolYear } from '../contexts/SchoolYearContext'

interface Subject {
  id: string
  name: string
  section: string
  section_id?: string
  color: string
  icon: string
  classwork_count: number
  students_count: number
}

const subjectColors: { [key: string]: string } = {
  'English': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'Mathematics': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'Science': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'Filipino': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'Social Studies': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'MAPEH': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'TLE': 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'Values Education': 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
}

const subjectIcons: { [key: string]: string } = {
  'English': '📗',
  'Mathematics': '🔢',
  'Science': '🔬',
  'Filipino': '🇵🇭',
  'Social Studies': '🌍',
  'MAPEH': '🎨',
  'TLE': '🔧',
  'Values Education': '💝',
}

export function GradeDetailPage() {
  const { gradeId } = useParams()
  const navigate = useNavigate()
  const { selectedYear } = useSchoolYear()
  const [gradeName, setGradeName] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [formData, setFormData] = useState({ name: '', section: 'Section A' })
  const [sections, setSections] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    loadGradeData()
  }, [gradeId, selectedYear])

  async function loadGradeData() {
    setLoading(true)
    
    // Get grade name from gradeId
    const gradeNames: { [key: string]: string } = {
      'kinder': 'Kindergarten',
      'g1': 'Grade 1', 'g2': 'Grade 2', 'g3': 'Grade 3',
      'g4': 'Grade 4', 'g5': 'Grade 5', 'g6': 'Grade 6', 'g7': 'Grade 7',
      'g8': 'Grade 8', 'g9': 'Grade 9', 'g10': 'Grade 10', 'g11': 'Grade 11', 'g12': 'Grade 12'
    }
    const currentGradeName = gradeNames[gradeId || 'g1'] || 'Grade 1'
    setGradeName(currentGradeName)

    // Try to get sections for this grade from database
    const { data: sectionsData } = await api
      .from('sections')
      .select(`
        id,
        name,
        grade_levels!inner(name)
      `)
      .eq('grade_levels.name', currentGradeName)

    if (sectionsData && sectionsData.length > 0) {
      setSections(sectionsData.map((s: any) => ({ id: s.id, name: s.name })))
    } else {
      // Default sections if none exist
      setSections([{ id: 'default', name: 'Section A' }])
    }

    // Get classes (subjects) for this grade
    const { data: classesData } = await api
      .from('classes')
      .select(`
        id,
        subject_name,
        section_id,
        sections!inner(
          name,
          grade_levels!inner(name)
        )
      `)
      .eq('sections.grade_levels.name', currentGradeName)

    if (classesData && classesData.length > 0) {
      // Get student counts from student_records
      const { data: studentRecords } = await api
        .from('student_records')
        .select('grade_level, level')
        .eq('school_year', selectedYear)

      // Map grade name to match student_records level format
      let levelFilter = currentGradeName
      if (currentGradeName === 'Kindergarten') levelFilter = 'Kindergarten'

      const studentCount = studentRecords?.filter((r: any) => (r.grade_level || r.level) === levelFilter).length || 0

      const formattedSubjects: Subject[] = classesData.map((c: any) => ({
        id: c.id,
        name: c.subject_name,
        section: c.sections?.name || 'Section A',
        section_id: c.section_id,
        color: subjectColors[c.subject_name] || subjectColors['English'],
        icon: subjectIcons[c.subject_name] || '📚',
        classwork_count: 0,
        students_count: studentCount
      }))
      setSubjects(formattedSubjects)
    } else {
      // No classes in DB yet - show empty state or allow creating
      setSubjects([])
    }
    
    setLoading(false)
  }

  function handleCreateSubject() {
    setEditingSubject(null)
    setFormData({ name: '', section: sections[0]?.name || 'Section A' })
    setShowModal(true)
  }

  function handleEditSubject(subject: Subject) {
    setEditingSubject(subject)
    setFormData({ name: subject.name, section: subject.section })
    setShowModal(true)
  }

  async function handleSaveSubject() {
    if (!formData.name) return

    if (editingSubject) {
      // Update existing subject in DB
      const { error } = await api
        .from('classes')
        .update({ subject_name: formData.name })
        .eq('id', editingSubject.id)

      if (!error) {
        setSubjects(subjects.map(s => 
          s.id === editingSubject.id 
            ? { ...s, name: formData.name, section: formData.section, color: subjectColors[formData.name] || subjectColors['English'], icon: subjectIcons[formData.name] || '📚' }
            : s
        ))
      }
    } else {
      // Find section_id for the selected section
      const selectedSection = sections.find(s => s.name === formData.section)
      
      // Get or create academic year
      let academicYearId: string | null = null
      const { data: activeYear } = await api
        .from('academic_years')
        .select('id')
        .eq('name', selectedYear)
        .single()
      
      if (activeYear) {
        academicYearId = activeYear.id
      } else {
        // Create new academic year if doesn't exist
        const { data: newYear } = await api
          .from('academic_years')
          .insert({
            name: selectedYear,
            start_date: `${selectedYear.split('-')[0]}-06-01`,
            end_date: `${selectedYear.split('-')[1]}-05-31`,
            is_active: true
          })
          .select()
          .single()
        if (newYear) academicYearId = newYear.id
      }

      if (!academicYearId || !selectedSection?.id) {
        alert('Cannot create subject: Missing academic year or section. Please ensure the grade level has sections configured.')
        return
      }

      // Get created_by user ID
      const { data: { user } } = await api.auth.getUser()
      const userId = user?.id

      if (!userId) {
        alert('Cannot create subject: You must be logged in.')
        return
      }

      // Insert new class to DB
      const { data: newClass, error } = await api
        .from('classes')
        .insert({
          subject_name: formData.name,
          section_id: selectedSection.id,
          academic_year_id: academicYearId,
          class_code: `${gradeName.replace(/\s+/g, '')}-${formData.name.replace(/\s+/g, '')}-${Date.now()}`,
          created_by: userId
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating subject:', error)
        alert(`Error creating subject: ${error.message}`)
        return
      }

      if (newClass) {
        const newSubject: Subject = {
          id: newClass.id,
          name: formData.name,
          section: formData.section,
          section_id: selectedSection?.id,
          color: subjectColors[formData.name] || subjectColors['English'],
          icon: subjectIcons[formData.name] || '📚',
          classwork_count: 0,
          students_count: 0
        }
        setSubjects([...subjects, newSubject])
      }
    }
    setShowModal(false)
  }

  async function handleDeleteSubject(id: string) {
    if (confirm('Are you sure you want to delete this subject?')) {
      const { error } = await api
        .from('classes')
        .delete()
        .eq('id', id)

      if (!error) {
        setSubjects(subjects.filter(s => s.id !== id))
      }
    }
  }

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Back Link */}
      <Link to="/grade-levels" className="flex items-center gap-2 text-sm mb-4" style={{ color: '#5B8C51' }}>
        ← Back to Grade Levels
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{gradeName}</h1>
          <p className="text-gray-500">{subjects.length} Subjects</p>
        </div>
        <button
          onClick={handleCreateSubject}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
          style={{ backgroundColor: '#5B8C51' }}
        >
          + Create Subject
        </button>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Subjects Yet</h3>
          <p className="text-gray-500 mb-6">Create your first subject to get started</p>
          <button
            onClick={handleCreateSubject}
            className="px-6 py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#5B8C51' }}
          >
            + Create Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {subjects.map((subject) => (
            <div key={subject.id} className="rounded-2xl overflow-hidden shadow-lg">
              {/* Subject Header */}
              <div 
                className="p-5 relative min-h-[120px]"
                style={{ background: subject.color }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{subject.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">{subject.name}</h3>
                      <p className="text-sm text-white/80">{subject.section}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleEditSubject(subject)}
                    className="text-white/80 hover:text-white"
                  >
                    ⋮
                  </button>
                </div>

                {/* Decorative */}
                <div className="absolute right-4 bottom-4 text-6xl opacity-20 font-bold text-white">
                  {subject.icon}
                </div>
              </div>

              {/* Subject Stats */}
              <div className="bg-white p-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <span>📚</span>
                    <span>{subject.classwork_count} Classwork</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>👥</span>
                    <span>{subject.students_count} Students</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    📅 Lesson Planner
                  </button>
                  <button 
                    onClick={() => navigate(`/classroom/${subject.id}?grade=${encodeURIComponent(gradeName)}&subject=${encodeURIComponent(subject.name)}&section=${encodeURIComponent(subject.section)}`)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white font-medium"
                    style={{ backgroundColor: '#5B8C51' }}
                  >
                    Open Classroom
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingSubject ? 'Edit Subject' : 'Create Subject'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <select
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                >
                  <option value="">Select Subject</option>
                  <option value="English">English</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="Filipino">Filipino</option>
                  <option value="Social Studies">Social Studies</option>
                  <option value="MAPEH">MAPEH</option>
                  <option value="TLE">TLE</option>
                  <option value="Values Education">Values Education</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="e.g., Section A"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubject}
                className="flex-1 px-4 py-3 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#5B8C51' }}
              >
                {editingSubject ? 'Update' : 'Create'}
              </button>
              {editingSubject && (
                <button
                  onClick={() => { handleDeleteSubject(editingSubject.id); setShowModal(false); }}
                  className="px-4 py-3 rounded-xl bg-red-500 text-white"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
