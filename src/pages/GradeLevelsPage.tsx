import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { useSchoolYear } from '../contexts/SchoolYearContext'

interface GradeLevel {
  id: string
  name: string
  ordinal: number
  subjects_count?: number
  students_count?: number
}

const gradeColors: { [key: string]: { bg: string, accent: string } } = {
  'Kindergarten': { bg: 'linear-gradient(135deg, #E8D5B7 0%, #F5E6D3 50%, #E8D5B7 100%)', accent: '#E8D5B7' },
  'Grade 1': { bg: 'linear-gradient(135deg, #FFB347 0%, #FFCC80 50%, #FFE0A0 100%)', accent: '#FFB347' },
  'Grade 2': { bg: 'linear-gradient(135deg, #7B68EE 0%, #9F8FEF 50%, #C4B8F0 100%)', accent: '#7B68EE' },
  'Grade 3': { bg: 'linear-gradient(135deg, #5DADE2 0%, #85C1E9 50%, #AED6F1 100%)', accent: '#5DADE2' },
  'Grade 4': { bg: 'linear-gradient(135deg, #F4D03F 0%, #F7DC6F 50%, #FDEBD0 100%)', accent: '#F4D03F' },
  'Grade 5': { bg: 'linear-gradient(135deg, #5DADE2 0%, #85C1E9 50%, #AED6F1 100%)', accent: '#5DADE2' },
  'Grade 6': { bg: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E72 50%, #FFB088 100%)', accent: '#FF6B6B' },
  'Grade 7': { bg: 'linear-gradient(135deg, #45B7D1 0%, #6EC8DB 50%, #98D9E6 100%)', accent: '#45B7D1' },
  'Grade 8': { bg: 'linear-gradient(135deg, #9B8CB7 0%, #B8A9D1 50%, #D5C6EB 100%)', accent: '#9B8CB7' },
  'Grade 9': { bg: 'linear-gradient(135deg, #FF69B4 0%, #FF85C1 50%, #FFA1D0 100%)', accent: '#FF69B4' },
  'Grade 10': { bg: 'linear-gradient(135deg, #1E3A5F 0%, #2E5077 50%, #3E6690 100%)', accent: '#1E3A5F' },
  'Grade 11': { bg: 'linear-gradient(135deg, #2ECC71 0%, #58D68D 50%, #82E0AA 100%)', accent: '#2ECC71' },
  'Grade 12': { bg: 'linear-gradient(135deg, #E74C3C 0%, #EC7063 50%, #F1948A 100%)', accent: '#E74C3C' },
}

const gradeIcons: { [key: string]: string } = {
  'Kindergarten': '🖍️',
  'Grade 1': '📁',
  'Grade 2': '📖',
  'Grade 3': '📝',
  'Grade 4': '⭐',
  'Grade 5': '🌐',
  'Grade 6': '⚡',
  'Grade 7': '🔬',
  'Grade 8': '📐',
  'Grade 9': '💡',
  'Grade 10': '🔭',
  'Grade 11': '🎯',
  'Grade 12': '🎓',
}

export function GradeLevelsPage() {
  const navigate = useNavigate()
  const { selectedYear } = useSchoolYear()
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGradeLevels()
  }, [selectedYear])

  async function loadGradeLevels() {
    setLoading(true)
    
    // Get student counts from student_records table
    const { data: studentRecords } = await api
      .from('student_records')
      .select('grade_level, level')
      .eq('school_year', selectedYear)

    // Create a map of level counts
    const levelCounts: { [key: string]: number } = {}
    if (studentRecords) {
      studentRecords.forEach((record: any) => {
        const level = record.grade_level || record.level || ''
        // Normalize level names for counting
        let normalizedLevel = level
        if (level === 'Kinder' || level.toLowerCase() === 'kindergarten' || level === 'Kinder 1' || level === 'Kinder 2') {
          normalizedLevel = 'Kindergarten'
        }
        
        levelCounts[normalizedLevel] = (levelCounts[normalizedLevel] || 0) + 1
      })
    }

    // Get sections with their subjects count from classes table
    const { data: sections } = await api
      .from('sections')
      .select(`
        id,
        name,
        grade_level_id,
        grade_levels(id, name, order_index)
      `)

    // Count classes per section
    const { data: classesData } = await api
      .from('classes')
      .select('section_id')

    const classCountBySection: { [key: string]: number } = {}
    if (classesData) {
      classesData.forEach((c: any) => {
        classCountBySection[c.section_id] = (classCountBySection[c.section_id] || 0) + 1
      })
    }

    // Build grade levels with subjects from sections
    const gradeSubjectsCount: { [key: string]: number } = {}
    if (sections) {
      sections.forEach((section: any) => {
        const gradeName = section.grade_levels?.name || ''
        const sectionClasses = classCountBySection[section.id] || 0
        gradeSubjectsCount[gradeName] = (gradeSubjectsCount[gradeName] || 0) + sectionClasses
      })
    }

    // Define all grade levels (these should match your curriculum)
    const allGrades = [
      { id: 'kinder', name: 'Kindergarten', ordinal: 0 },
      { id: 'g1', name: 'Grade 1', ordinal: 1 },
      { id: 'g2', name: 'Grade 2', ordinal: 2 },
      { id: 'g3', name: 'Grade 3', ordinal: 3 },
      { id: 'g4', name: 'Grade 4', ordinal: 4 },
      { id: 'g5', name: 'Grade 5', ordinal: 5 },
      { id: 'g6', name: 'Grade 6', ordinal: 6 },
      { id: 'g7', name: 'Grade 7', ordinal: 7 },
      { id: 'g8', name: 'Grade 8', ordinal: 8 },
      { id: 'g9', name: 'Grade 9', ordinal: 9 },
      { id: 'g10', name: 'Grade 10', ordinal: 10 },
      { id: 'g11', name: 'Grade 11', ordinal: 11 },
      { id: 'g12', name: 'Grade 12', ordinal: 12 },
    ]

    const gradesWithCounts = allGrades.map(grade => ({
      ...grade,
      subjects_count: gradeSubjectsCount[grade.name] || 0,
      students_count: levelCounts[grade.name] || 0
    }))

    setGradeLevels(gradesWithCounts)
    setLoading(false)
  }

  const getGradeStyle = (name: string) => {
    return gradeColors[name] || { bg: 'linear-gradient(135deg, #5B8C51 0%, #7CAE72 50%, #9DD094 100%)', accent: '#5B8C51' }
  }

  const getGradeIcon = (name: string) => {
    return gradeIcons[name] || '📚'
  }

  const isLightBackground = (name: string) => {
    const lightGrades = ['Kindergarten', 'Grade 1', 'Grade 4', 'Grade 5']
    return lightGrades.includes(name)
  }

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">🎓</span>
        <h1 className="text-3xl font-bold text-gray-800">Grade Levels</h1>
      </div>
      <p className="text-gray-500 mb-6">Manage classes and subjects for each grade level</p>

      {/* Grade Levels Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {gradeLevels.map((grade) => {
            const style = getGradeStyle(grade.name)
            const icon = getGradeIcon(grade.name)
            const isLight = isLightBackground(grade.name)
            const textColor = isLight ? 'text-gray-800' : 'text-white'
            const subTextColor = isLight ? 'text-gray-600' : 'text-white/80'

            return (
              <div
                key={grade.id}
                className="rounded-2xl overflow-hidden shadow-lg"
                style={{ background: style.bg }}
              >
                {/* Card Content */}
                <div className="p-5 relative min-h-[140px]">
                  {/* Icon */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{icon}</span>
                      <div>
                        <h3 className={`text-xl font-bold ${textColor}`}>{grade.name}</h3>
                        <p className={`text-sm ${subTextColor}`}>Academic Year {selectedYear}</p>
                      </div>
                    </div>
                  </div>

                  {/* Decorative shape */}
                  <div 
                    className="absolute right-0 top-0 w-32 h-32 opacity-20"
                    style={{
                      background: 'radial-gradient(circle, white 0%, transparent 70%)',
                      transform: 'translate(20%, -20%)'
                    }}
                  />

                  {/* Stats */}
                  <div className={`flex items-center gap-4 mt-6 ${subTextColor}`}>
                    <div className="flex items-center gap-1">
                      <span>📚</span>
                      <span className="text-sm">{grade.subjects_count} Subjects</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>👥</span>
                      <span className="text-sm">{grade.students_count} Students</span>
                    </div>
                  </div>
                </div>

                {/* View Subjects Button */}
                <button
                  onClick={() => navigate(`/grade-levels/${grade.id}`)}
                  className="w-full py-3 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.2)',
                    color: isLight ? '#333' : 'white'
                  }}
                >
                  View Subjects
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
