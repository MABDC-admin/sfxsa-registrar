import { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { calculateAge } from '../utils/dateUtils'
import { StudentDetailModal } from '../components/StudentDetailModal'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

interface StudentRecord {
  id: string
  lrn: string
  grade_level: string
  student_name: string
  birth_date: string
  age: number | null
  gender: string
  mother_contact: string
  mothers_maiden_name: string
  father_contact: string
  father: string
  phil_address: string
  uae_address: string
  previous_school: string
  school_year: string
  status: 'Active' | 'Inactive'
  avatar_url: string
  enrolled_at?: string
}

interface AcademicYear {
  id: string
  name: string
  is_active: boolean
}

const gradeLevels = ['All', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const gradeColors: { [key: string]: string } = {
  'Kindergarten': 'linear-gradient(135deg, #E8D5B7 0%, #F5E6D3 50%, #E8D5B7 100%)',
  'Grade 1': 'linear-gradient(135deg, #F4D03F 0%, #F7DC6F 50%, #FDEBD0 100%)',
  'Grade 2': 'linear-gradient(135deg, #F8A5C2 0%, #FDCBDF 50%, #F8A5C2 100%)',
  'Grade 3': 'linear-gradient(135deg, #A8E6CF 0%, #DCEDC1 50%, #A8E6CF 100%)',
  'Grade 4': 'linear-gradient(135deg, #F4D03F 0%, #F7DC6F 50%, #F4D03F 100%)',
  'Grade 5': 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 50%, #87CEEB 100%)',
  'Grade 6': 'linear-gradient(135deg, #F8A5C2 0%, #FFC1CC 50%, #F8A5C2 100%)',
  'Grade 7': 'linear-gradient(135deg, #DDA0DD 0%, #E8C0E8 50%, #DDA0DD 100%)',
  'Grade 8': 'linear-gradient(135deg, #DDA0DD 0%, #E6D0E6 50%, #DDA0DD 100%)',
  'Grade 9': 'linear-gradient(135deg, #87CEEB 0%, #ADD8E6 50%, #87CEEB 100%)',
  'Grade 10': 'linear-gradient(135deg, #F8A5C2 0%, #FDCBDF 50%, #F8A5C2 100%)',
  'Grade 11': 'linear-gradient(135deg, #98D8C8 0%, #C1E8DC 50%, #98D8C8 100%)',
  'Grade 12': 'linear-gradient(135deg, #B8A9C9 0%, #D4C8E0 50%, #B8A9C9 100%)',
}

export function StudentRecordsPage() {
  const [records, setRecords] = useState<StudentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('All')
  const [selectedYear, setSelectedYear] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showYearSelectModal, setShowYearSelectModal] = useState(false)
  const [importPreview, setImportPreview] = useState<StudentRecord[]>([])
  const [importing, setImporting] = useState(false)
  const [importTargetYear, setImportTargetYear] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [studentForm, setStudentForm] = useState({
    lrn: '',
    student_name: '',
    birth_date: '',
    grade_level: 'Kindergarten',
    gender: '',
    mother_contact: '',
    mothers_maiden_name: '',
    father_contact: '',
    father: '',
    phil_address: '',
    uae_address: '',
    previous_school: '',
  })

  // Load academic years from database
  const loadAcademicYears = useCallback(async () => {
    try {
      const { data, error } = await api
        .from('academic_years')
        .select('id, name, is_active')
        .order('name', { ascending: false })

      if (error) {
        console.error('Error loading academic years:', error)
        return
      }

      if (data && data.length > 0) {
        setAcademicYears(data)
        // Set default selected year to active year
        const activeYear = data.find((y: AcademicYear) => y.is_active)
        if (activeYear && !selectedYear) {
          setSelectedYear(activeYear.name)
        } else if (!selectedYear && data.length > 0) {
          setSelectedYear(data[0].name)
        }
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }, [selectedYear])

  // Load records function (memoized for real-time updates)
  const loadRecordsFromSupabase = useCallback(async () => {
    setLoading(true)
    try {
      let query = api
        .from('student_records')
        .select('*')
        .order('student_name')

      // Filter by school year if not 'All Years'
      if (selectedYear !== 'All Years') {
        query = query.eq('school_year', selectedYear)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching records:', error)
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        const formattedRecords: StudentRecord[] = data.map((row: any) => ({
          id: row.id,
          lrn: row.lrn || '',
          grade_level: row.grade_level || 'Kindergarten',
          student_name: row.student_name || '',
          birth_date: row.birth_date || '',
          age: calculateAge(row.birth_date),
          gender: row.gender || '',
          mother_contact: row.mother_contact || '',
          mothers_maiden_name: row.mothers_maiden_name || '',
          father_contact: row.father_contact || '',
          father: row.father || '',
          phil_address: row.phil_address || '',
          uae_address: row.uae_address || '',
          previous_school: row.previous_school || '',
          school_year: row.school_year || '2025-2026',
          status: (row.status as 'Active' | 'Inactive') || 'Active',
          avatar_url: row.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(row.student_name || 'default')}&backgroundColor=transparent`,
          enrolled_at: row.enrolled_at,
        }))
        setRecords(formattedRecords)
      } else {
        setRecords([])
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setLoading(false)
  }, [selectedYear])

  // Initial load
  useEffect(() => {
    loadAcademicYears()
  }, [])

  // Load records when selected year changes
  useEffect(() => {
    if (selectedYear) {
      loadRecordsFromSupabase()
    }
  }, [loadRecordsFromSupabase, selectedYear])

  // Real-time subscription for live updates
  useRealtimeSubscription(
    { table: 'student_records' },
    loadRecordsFromSupabase,
    [selectedYear]
  )

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.lrn.toLowerCase().includes(searchTerm.toLowerCase())
    // Proper grade level matching - exact match
    const matchesGrade = selectedGrade === 'All' || r.grade_level === selectedGrade
    const matchesYear = selectedYear === 'All' || r.school_year === selectedYear
    return matchesSearch && matchesGrade && matchesYear
  })

  const getGradeDisplay = (grade: string) => {
    return grade // Display original level from CSV
  }

  const getGradeColor = (grade: string) => {
    return gradeColors[grade] || 'linear-gradient(135deg, #5B8C51 0%, #7CAE72 50%, #5B8C51 100%)'
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Store the file and show year selection modal
    setPendingFile(file)
    setImportTargetYear('')
    setShowYearSelectModal(true)
  }

  function processFileWithYear() {
    if (!pendingFile || !importTargetYear) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text, importTargetYear)
    }
    reader.readAsText(pendingFile)
    setShowYearSelectModal(false)
  }

  function parseCSV(text: string, targetYear: string) {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) return

    // Helper to split CSV line correctly handling quotes
    const splitLine = (line: string) => {
      const result = []
      let current = ''
      let inQuotes = false
      
      // Determine delimiter (comma or tab) based on the first line if not already known
      // For simplicity, we'll check if the line has tabs, if so use tab, otherwise comma
      const delimiter = line.includes('\t') ? '\t' : ','

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    // Parse header
    const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/[#."]/g, '').trim())
    
    // Find column indices
    const lrnIdx = headers.findIndex(h => h === 'lrn')
    const levelIdx = headers.findIndex(h => h === 'grade level' || h === 'level')
    const nameIdx = headers.findIndex(h => h === 'student name' || h.includes('student_name') || h.includes('name'))
    const birthIdx = headers.findIndex(h => h === 'birth date' || h.includes('birth'))
    const ageIdx = headers.findIndex(h => h === 'age')
    const genderIdx = headers.findIndex(h => h === 'gender')
    const motherContactIdx = headers.findIndex(h => h === 'mother contact' || h.includes('mother contact'))
    const motherNameIdx = headers.findIndex(h => h === 'mothers maiden name' || (h.includes('mother') && h.includes('maiden')))
    const fatherContactIdx = headers.findIndex(h => h === 'father contact' || h.includes('father contact'))
    const fatherNameIdx = headers.findIndex(h => h === 'father' && !h.includes('contact'))
    const philAddressIdx = headers.findIndex(h => h === 'phil address' || h.includes('phil'))
    const uaeAddressIdx = headers.findIndex(h => h === 'uae address' || h.includes('uae'))
    const prevSchoolIdx = headers.findIndex(h => h === 'previous school' || h.includes('previous'))

    // Parse data rows
    const imported: StudentRecord[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i])
      if (cols.length < 3) continue

      const lrn = cols[lrnIdx] || ''
      const gradeLevel = cols[levelIdx] || 'Kindergarten'
      const fullName = cols[nameIdx] || ''
      const birthDate = cols[birthIdx] || ''
      const ageStr = cols[ageIdx] || ''
      // const ageVal = ageStr !== '' ? (parseInt(ageStr) || null) : null
      const gender = cols[genderIdx] || ''
      const motherContact = cols[motherContactIdx] || ''
      const mothersMaidenName = cols[motherNameIdx] || ''
      const fatherContact = cols[fatherContactIdx] || ''
      const fatherName = cols[fatherNameIdx] || ''
      const philAddress = cols[philAddressIdx] || ''
      const uaeAddress = cols[uaeAddressIdx] || ''
      const previousSchool = cols[prevSchoolIdx] || ''

      if (!fullName) continue

      imported.push({
        id: `import-${i}`,
        lrn: lrn,
        grade_level: gradeLevel,
        student_name: fullName,
        birth_date: birthDate,
        age: calculateAge(birthDate),
        gender: gender,
        mother_contact: motherContact,
        mothers_maiden_name: mothersMaidenName,
        father_contact: fatherContact,
        father: fatherName,
        phil_address: philAddress,
        uae_address: uaeAddress,
        previous_school: previousSchool,
        school_year: targetYear,
        status: 'Active',
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=transparent`,
        enrolled_at: '2025-07-01',
      })
    }

    setImportPreview(imported)
    setShowImportModal(true)
  }

  async function confirmImport() {
    setImporting(true)
    
    try {
      // Persist each record to the database
      for (const record of importPreview) {
        const { error } = await api.from('student_records').insert({
          lrn: record.lrn,
          grade_level: record.grade_level,
          student_name: record.student_name,
          birth_date: record.birth_date || null,
          age: record.age,
          gender: record.gender,
          mother_contact: record.mother_contact,
          mothers_maiden_name: record.mothers_maiden_name,
          father_contact: record.father_contact,
          father: record.father,
          phil_address: record.phil_address,
          uae_address: record.uae_address,
          previous_school: record.previous_school,
          school_year: record.school_year,
          status: record.status,
          photo_url: record.avatar_url,
          enrolled_at: record.enrolled_at,
        })
        
        if (error) {
          console.error('Error inserting record:', error)
        }
      }
      
      // Reload records from database
      await loadRecordsFromSupabase()
    } catch (err) {
      console.error('Import error:', err)
    }
    
    setImporting(false)
    setShowImportModal(false)
    setImportPreview([])
    setImportTargetYear('')
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSaveStudent() {
    if (!studentForm.student_name.trim()) {
      alert('Student name is required')
      return
    }
    if (!selectedYear) {
      alert('Please select an academic year first')
      return
    }

    setSaving(true)
    try {
      const studentData = {
        lrn: studentForm.lrn || `LRN-${Date.now()}`,
        student_name: studentForm.student_name,
        birth_date: studentForm.birth_date || null,
        age: calculateAge(studentForm.birth_date),
        grade_level: studentForm.grade_level,
        gender: studentForm.gender,
        mother_contact: studentForm.mother_contact,
        mothers_maiden_name: studentForm.mothers_maiden_name,
        father_contact: studentForm.father_contact,
        father: studentForm.father,
        phil_address: studentForm.phil_address,
        uae_address: studentForm.uae_address,
        previous_school: studentForm.previous_school,
        school_year: selectedYear,
        status: 'Active',
        enrolled_at: '2025-07-01',
      }

      if (editingStudent) {
        // Update existing student
        const { error } = await api
          .from('student_records')
          .update(studentData)
          .eq('id', editingStudent.id)
        
        if (error) throw error
        alert('Student updated successfully!')
      } else {
        // Create new student
        const { error } = await api
          .from('student_records')
          .insert(studentData)
        
        if (error) throw error
        alert('Student added successfully!')
      }

      setShowAddModal(false)
      setEditingStudent(null)
      await loadRecordsFromSupabase()
    } catch (err: any) {
      console.error('Error saving student:', err)
      alert(err.message || 'Failed to save student')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📋 Student Records</h1>
          <p className="text-gray-500">Manage student records by school year</p>
        </div>
        <div className="flex gap-2">
          <label
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium cursor-pointer"
            style={{ backgroundColor: '#3B82F6' }}
          >
            ⬆️ Import CSV
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              setEditingStudent(null)
              setStudentForm({
                lrn: '',
                student_name: '',
                birth_date: '',
                grade_level: 'Kindergarten',
                gender: '',
                mother_contact: '',
                mothers_maiden_name: '',
                father_contact: '',
                father: '',
                phil_address: '',
                uae_address: '',
                previous_school: '',
              })
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#5B8C51' }}
          >
            + Add Student
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* School Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-gray-800 text-white font-medium"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            <option value="All">📅 ALL YEARS</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.name}>
                📅 {year.name} {year.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name or LRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
            />
          </div>

          {/* Grade Level Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200"
          >
            {gradeLevels.map(grade => (
              <option key={grade} value={grade}>Level: {grade}</option>
            ))}
          </select>

          {/* More & Export */}
          <button className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            🔽 More
          </button>
          <button className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            ⬇️ Export
          </button>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg ${viewMode === 'card' ? 'bg-green-600 text-white' : 'text-gray-600'}`}
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-green-600 text-white' : 'text-gray-600'}`}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="mb-4 text-gray-600">
        {loading ? 'Loading...' : `Showing ${filteredRecords.length} of ${records.length} students`}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-gray-500">Loading student records from database...</div>
      )}

      {/* Card View */}
      {!loading && viewMode === 'card' && (
        <div className="grid grid-cols-6 gap-4">
          {filteredRecords.map((record) => {
            const bgGradient = getGradeColor(record.grade_level)
            return (
              <div
                key={record.id}
                className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                style={{ background: bgGradient }}
              >
                {/* Status Badge */}
                <div className="p-3">
                  <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#22c55e' }}>
                    {record.status}
                  </span>
                </div>

                {/* Avatar */}
                <div className="flex justify-center pb-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/50 bg-white/30">
                      {record.avatar_url ? (
                        <img src={record.avatar_url} alt={record.student_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-700">
                          {record.student_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                  </div>
                </div>

                {/* Name & Grade */}
                <div className="text-center px-2 pb-2">
                  <h3 className="text-gray-800 font-bold text-sm truncate">{record.student_name}</h3>
                  <p className="text-sm text-gray-600">{getGradeDisplay(record.grade_level)}</p>
                </div>

                {/* LRN & Age */}
                <div className="px-3 pb-3 flex justify-between text-xs text-gray-600">
                  <div>
                    <div>LRN</div>
                    <div className="text-gray-800 font-medium truncate" style={{ maxWidth: '80px' }}>{record.lrn}</div>
                  </div>
                  <div className="text-right">
                    <div>Age</div>
                    <div className="text-gray-800 font-medium">{record.age}</div>
                  </div>
                </div>

                {/* View Button */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingStudent(record)
                      setStudentForm({
                        lrn: record.lrn,
                        student_name: record.student_name,
                        birth_date: record.birth_date,
                        grade_level: record.grade_level,
                        gender: record.gender,
                        mother_contact: record.mother_contact,
                        mothers_maiden_name: record.mothers_maiden_name,
                        father_contact: record.father_contact,
                        father: record.father,
                        phil_address: record.phil_address,
                        uae_address: record.uae_address,
                        previous_school: record.previous_school,
                      })
                      setShowAddModal(true)
                    }}
                    className="flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 bg-white/50 hover:bg-white/70 text-gray-700 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => setSelectedStudent(record)}
                    className="flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 bg-white/50 hover:bg-white/70 text-gray-700 transition-colors"
                  >
                    👁️ View
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#1a1a2e' }}>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Student</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">LRN</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Grade Level</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Age</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">School Year</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#22c55e' }}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden" style={{ background: getGradeColor(record.grade_level) }}>
                          {record.avatar_url ? (
                            <img src={record.avatar_url} alt={record.student_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-700">
                              {record.student_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-gray-800">{record.student_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{record.lrn}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{record.grade_level}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{record.age ?? ''}</td>
                    <td className="px-4 py-3 text-gray-600">{record.school_year}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingStudent(record)
                            setStudentForm({
                              lrn: record.lrn,
                              student_name: record.student_name,
                              birth_date: record.birth_date,
                              grade_level: record.grade_level,
                              gender: record.gender,
                              mother_contact: record.mother_contact,
                              mothers_maiden_name: record.mothers_maiden_name,
                              father_contact: record.father_contact,
                              father: record.father,
                              phil_address: record.phil_address,
                              uae_address: record.uae_address,
                              previous_school: record.previous_school,
                            })
                            setShowAddModal(true)
                          }}
                          className="px-3 py-1 rounded-lg text-sm hover:bg-gray-100" 
                          style={{ color: '#5B8C51' }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => setSelectedStudent(record)}
                          className="px-3 py-1 rounded-lg text-sm hover:bg-gray-100" 
                          style={{ color: '#5B8C51' }}
                        >
                          👁️ View
                        </button>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">⬆️ Import Preview</h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            
            <div className="mb-4 p-4 bg-green-50 rounded-xl">
              <p className="text-green-800 font-medium">✅ Found {importPreview.length} students ready to import</p>
              <p className="text-green-600 text-sm">Target Academic Year: <strong>{importTargetYear}</strong></p>
            </div>

            {/* Preview Table */}
            <div className="overflow-auto max-h-[400px] mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">LRN</th>
                    <th className="text-left px-3 py-2">GRADE LEVEL</th>
                    <th className="text-left px-3 py-2">STUDENT NAME</th>
                    <th className="text-left px-3 py-2">BIRTH DATE</th>
                    <th className="text-left px-3 py-2">AGE</th>
                    <th className="text-left px-3 py-2">GENDER</th>
                    <th className="text-left px-3 py-2">MOTHER CONTACT #</th>
                    <th className="text-left px-3 py-2">MOTHERS MAIDEN NAME</th>
                    <th className="text-left px-3 py-2">FATHER CONTACT #</th>
                    <th className="text-left px-3 py-2">FATHER</th>
                    <th className="text-left px-3 py-2">PHIL. ADDRESS</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 50).map((record, idx) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{record.lrn}</td>
                      <td className="px-3 py-2">{record.grade_level}</td>
                      <td className="px-3 py-2 font-medium">{record.student_name}</td>
                      <td className="px-3 py-2">{record.birth_date}</td>
                      <td className="px-3 py-2">{record.age ?? ''}</td>
                      <td className="px-3 py-2">{record.gender}</td>
                      <td className="px-3 py-2 text-xs">{record.mother_contact}</td>
                      <td className="px-3 py-2 text-xs">{record.mothers_maiden_name}</td>
                      <td className="px-3 py-2 text-xs">{record.father_contact}</td>
                      <td className="px-3 py-2 text-xs">{record.father}</td>
                      <td className="px-3 py-2 text-xs truncate" style={{ maxWidth: '150px' }}>{record.phil_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 50 && (
                <p className="text-center text-gray-500 py-2">... and {importPreview.length - 50} more students</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="flex-1 px-4 py-3 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#5B8C51' }}
              >
                {importing ? 'Importing...' : `Import ${importPreview.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Year Selection Modal for Import */}
      {showYearSelectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">📅 Select Academic Year</h2>
              <button 
                onClick={() => { setShowYearSelectModal(false); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Please select the academic year to associate with the imported student records.
                This ensures proper data segregation by academic year.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 text-sm">
                  ⚠️ <strong>Important:</strong> All imported records will be linked to the selected academic year.
                  Make sure you select the correct year before proceeding.
                </p>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
              <select
                value={importTargetYear}
                onChange={(e) => setImportTargetYear(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none text-lg"
              >
                <option value="">-- Select Academic Year --</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.name}>
                    {year.name} {year.is_active ? '(Current Active)' : ''}
                  </option>
                ))}
              </select>

              {importTargetYear && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl">
                  <p className="text-green-800">
                    ✅ Records will be imported to: <strong>{importTargetYear}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowYearSelectModal(false); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={processFileWithYear}
                disabled={!importTargetYear}
                className="flex-1 px-4 py-3 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#5B8C51' }}
              >
                Continue Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          gradeColor={getGradeColor(selectedStudent.grade_level)}
        />
      )}

      {/* Add/Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingStudent ? '✏️ Edit Student Record' : '➕ Add New Student'}
              </h2>
              <button 
                onClick={() => { setShowAddModal(false); setEditingStudent(null) }}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* LRN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LRN (Learner Reference Number)</label>
                <input
                  type="text"
                  value={studentForm.lrn}
                  onChange={(e) => setStudentForm({ ...studentForm, lrn: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Leave empty to auto-generate"
                />
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  value={studentForm.student_name}
                  onChange={(e) => setStudentForm({ ...studentForm, student_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Full Name"
                  required
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={studentForm.birth_date}
                  onChange={(e) => setStudentForm({ ...studentForm, birth_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                />
                {studentForm.birth_date && (
                  <p className="text-xs text-gray-500 mt-1">Age: {calculateAge(studentForm.birth_date)} years</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={studentForm.gender}
                  onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Grade Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                <select
                  value={studentForm.grade_level}
                  onChange={(e) => setStudentForm({ ...studentForm, grade_level: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                >
                  {gradeLevels.filter(g => g !== 'All').map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              {/* Mother Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mother Contact #</label>
                <input
                  type="text"
                  value={studentForm.mother_contact}
                  onChange={(e) => setStudentForm({ ...studentForm, mother_contact: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Contact Number"
                />
              </div>

              {/* Mother's Maiden Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Maiden Name</label>
                <input
                  type="text"
                  value={studentForm.mothers_maiden_name}
                  onChange={(e) => setStudentForm({ ...studentForm, mothers_maiden_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Maiden Name"
                />
              </div>

              {/* Father Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father Contact #</label>
                <input
                  type="text"
                  value={studentForm.father_contact}
                  onChange={(e) => setStudentForm({ ...studentForm, father_contact: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Contact Number"
                />
              </div>

              {/* Father Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                <input
                  type="text"
                  value={studentForm.father}
                  onChange={(e) => setStudentForm({ ...studentForm, father: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Father's Full Name"
                />
              </div>

              {/* Phil Address */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Philippines Address</label>
                <input
                  type="text"
                  value={studentForm.phil_address}
                  onChange={(e) => setStudentForm({ ...studentForm, phil_address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Complete Address in Philippines"
                />
              </div>

              {/* UAE Address */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">UAE Address</label>
                <input
                  type="text"
                  value={studentForm.uae_address}
                  onChange={(e) => setStudentForm({ ...studentForm, uae_address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Complete Address in UAE"
                />
              </div>

              {/* Previous School */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Previous School</label>
                <input
                  type="text"
                  value={studentForm.previous_school}
                  onChange={(e) => setStudentForm({ ...studentForm, previous_school: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="Name of Previous School"
                />
              </div>
            </div>

            {/* Academic Year Info */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-blue-800 text-sm">
                📅 <strong>Academic Year:</strong> {selectedYear || 'No year selected'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setEditingStudent(null) }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStudent}
                disabled={saving || !studentForm.student_name.trim()}
                className="flex-1 px-4 py-3 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#5B8C51' }}
              >
                {saving ? 'Saving...' : editingStudent ? 'Update Student' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
