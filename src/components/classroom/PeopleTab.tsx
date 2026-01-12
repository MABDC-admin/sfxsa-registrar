import { useState, useEffect } from 'react'
import { api } from '../../lib/apiClient'

interface Person {
  id: string
  name: string
  email: string
  avatar: string
  role: 'teacher' | 'student'
  gradeLevel?: string
}

interface Props {
  subjectId?: string
  gradeLevel?: string
}

export function PeopleTab({ gradeLevel }: Props) {
  const [teachers, setTeachers] = useState<Person[]>([
    { id: '1', name: 'Mrs. Anderson', email: 'anderson@school.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anderson', role: 'teacher' }
  ])
  const [students, setStudents] = useState<Person[]>([])
  const [allStudents, setAllStudents] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'teacher' | 'student'>('student')
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [showStudentPicker, setShowStudentPicker] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Load students from student_records on mount
  useEffect(() => {
    loadStudentsFromDatabase()
  }, [gradeLevel])

  async function loadStudentsFromDatabase() {
    setLoading(true)
    try {
      let query = api
        .from('student_records')
        .select('*')
        .order('student_name')

      // Filter by grade level if provided
      if (gradeLevel) {
        // Handle different grade level formats
        if (gradeLevel === 'Kindergarten') {
          query = query.or('grade_level.eq.Kindergarten,level.eq.Kindergarten')
        } else {
          // Exact match for Grade 1, Grade 2, etc.
          query = query.or(`grade_level.eq.${gradeLevel},level.eq.${gradeLevel}`)
        }
      }

      const { data } = await query.limit(100) // Get more students

      if (data && data.length > 0) {
        const formattedStudents: Person[] = data.map((row: any) => ({
          id: row.id,
          name: row.student_name || '',
          email: `${(row.student_name || 'student').toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)}@school.com`,
          avatar: row.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(row.student_name || 'default')}&backgroundColor=transparent`,
          role: 'student' as const,
          gradeLevel: row.grade_level || row.level
        }))
        setAllStudents(formattedStudents)
        // Auto-enroll students matching the grade level
        setStudents(formattedStudents.slice(0, 20))
      } else {
        setAllStudents([])
        setStudents([])
      }
    } catch (err) {
      console.error('Error loading students:', err)
    }
    setLoading(false)
  }

  function openModal(type: 'teacher' | 'student', person?: Person) {
    if (type === 'student' && !person) {
      // Show student picker instead of form
      setShowStudentPicker(true)
      return
    }
    setModalType(type)
    setEditingPerson(person || null)
    setFormData({
      name: person?.name || '',
      email: person?.email || ''
    })
    setShowModal(true)
  }

  function handleSave() {
    if (!formData.name || !formData.email) return

    const newPerson: Person = {
      id: editingPerson?.id || Date.now().toString(),
      name: formData.name,
      email: formData.email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`,
      role: modalType
    }

    if (modalType === 'teacher') {
      if (editingPerson) {
        setTeachers(teachers.map(t => t.id === editingPerson.id ? newPerson : t))
      } else {
        setTeachers([...teachers, newPerson])
      }
    } else {
      if (editingPerson) {
        setStudents(students.map(s => s.id === editingPerson.id ? newPerson : s))
      } else {
        setStudents([...students, newPerson])
      }
    }
    setShowModal(false)
  }

  function enrollStudent(student: Person) {
      if (!students.find(s => s.id === student.id)) {
        setStudents([...students, student])
      }
      setShowStudentPicker(false)
    }

  function toggleStudentSelection(id: string) {
    const newSelection = new Set(selectedStudents)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedStudents(newSelection)
  }

  function selectAllStudents() {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedStudents.size === 0) return
    if (!confirm(`Remove ${selectedStudents.size} student(s) from this class?`)) return
    
    // Remove selected students from enrolled list
    setStudents(students.filter(s => !selectedStudents.has(s.id)))
    setSelectedStudents(new Set())
  }
  
    function handleDelete(type: 'teacher' | 'student', id: string) {
    if (!confirm('Remove this person from the class?')) return
    if (type === 'teacher') {
      setTeachers(teachers.filter(t => t.id !== id))
    } else {
      setStudents(students.filter(s => s.id !== id))
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Loading State */}
      {loading && (
        <div className="text-center py-4 text-gray-500">Loading students...</div>
      )}

      {/* Teachers Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">👨‍🏫</span>
            <h2 className="text-lg font-semibold text-gray-800">Teachers</h2>
            <span className="text-sm text-gray-500">({teachers.length})</span>
          </div>
          <button
            onClick={() => openModal('teacher')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium text-sm"
            style={{ backgroundColor: '#5B8C51' }}
          >
            + Assign Teacher
          </button>
        </div>
        
        <div className="divide-y divide-gray-50">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  <img src={teacher.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{teacher.name}</p>
                  <p className="text-sm text-gray-500">{teacher.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal('teacher', teacher)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✏️</button>
                <button onClick={() => handleDelete('teacher', teacher.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">🗑️</button>
              </div>
            </div>
          ))}
          {teachers.length === 0 && (
            <div className="p-8 text-center text-gray-500">No teachers assigned</div>
          )}
        </div>
      </div>

      {/* Students Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <h2 className="text-lg font-semibold text-gray-800">Students</h2>
            <span className="text-sm text-gray-500">({students.length})</span>
            {gradeLevel && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                {gradeLevel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedStudents.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium text-sm bg-red-500 hover:bg-red-600"
              >
                🗑️ Remove ({selectedStudents.size})
              </button>
            )}
            <button
              onClick={() => openModal('student')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium text-sm"
              style={{ backgroundColor: '#5B8C51' }}
            >
              + Enroll Student
            </button>
          </div>
        </div>
        
        {/* Select All Header */}
        {students.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
            <input
              type="checkbox"
              checked={selectedStudents.size === students.length && students.length > 0}
              onChange={selectAllStudents}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-600">
              {selectedStudents.size > 0 ? `${selectedStudents.size} selected` : 'Select all'}
            </span>
          </div>
        )}
        
        <div className="divide-y divide-gray-50">
          {students.map((student) => (
            <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedStudents.has(student.id)}
                  onChange={() => toggleStudentSelection(student.id)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  <img src={student.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{student.name}</p>
                  <p className="text-sm text-gray-500">{student.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal('student', student)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✏️</button>
                <button onClick={() => handleDelete('student', student.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">🗑️</button>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="p-8 text-center text-gray-500">No students enrolled</div>
          )}
        </div>
      </div>

      {/* Student Picker Modal */}
      {showStudentPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Enroll Student</h2>
              <button onClick={() => setShowStudentPicker(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none mb-4"
            />

            <div className="overflow-auto max-h-[400px] divide-y divide-gray-100">
              {allStudents
                .filter(s => !students.find(enrolled => enrolled.id === s.id))
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .slice(0, 20)
                .map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <img src={student.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => enrollStudent(student)}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                      style={{ backgroundColor: '#5B8C51' }}
                    >
                      Enroll
                    </button>
                  </div>
                ))}
              {allStudents.filter(s => !students.find(enrolled => enrolled.id === s.id)).length === 0 && (
                <div className="p-8 text-center text-gray-500">All students are already enrolled</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingPerson ? 'Edit' : modalType === 'teacher' ? 'Assign Teacher' : 'Enroll Student'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600">
                Cancel
              </button>
              <button onClick={handleSave} className="flex-1 px-4 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: '#5B8C51' }}>
                {editingPerson ? 'Update' : modalType === 'teacher' ? 'Assign' : 'Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
