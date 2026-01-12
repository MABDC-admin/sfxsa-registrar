import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { AnnouncementsTab } from '../components/classroom/AnnouncementsTab'
import { ClassworkTab } from '../components/classroom/ClassworkTab'
import { PeopleTab } from '../components/classroom/PeopleTab'
import { AttendanceTab } from '../components/classroom/AttendanceTab'
import { GradesTab } from '../components/classroom/GradesTab'

type TabType = 'announcements' | 'classwork' | 'people' | 'attendance' | 'grades'

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

export function ClassroomPage() {
  const { subjectId } = useParams()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('announcements')
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState({
    id: subjectId || '',
    name: 'Subject',
    section: 'Section A',
    grade: 'Grade 1',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  })

  useEffect(() => {
    loadClassData()
  }, [subjectId])

  async function loadClassData() {
    setLoading(true)
    
    // Get from URL params first (passed from GradeDetailPage)
    const gradeParam = searchParams.get('grade')
    const subjectParam = searchParams.get('subject')
    const sectionParam = searchParams.get('section')

    if (gradeParam && subjectParam) {
      setSubject({
        id: subjectId || '',
        name: subjectParam,
        section: sectionParam || 'Section A',
        grade: gradeParam,
        color: subjectColors[subjectParam] || subjectColors['English']
      })
      setLoading(false)
      return
    }

    // Otherwise try to fetch from database
    const { data: classData } = await api
      .from('classes')
      .select(`
        id,
        subject_name,
        sections(
          name,
          grade_levels(name)
        )
      `)
      .eq('id', subjectId)
      .single()

    if (classData) {
      setSubject({
        id: classData.id,
        name: classData.subject_name,
        section: (classData.sections as any)?.name || 'Section A',
        grade: (classData.sections as any)?.grade_levels?.name || 'Grade 1',
        color: subjectColors[classData.subject_name] || subjectColors['English']
      })
    }

    setLoading(false)
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'announcements', label: 'Announcements', icon: '📢' },
    { id: 'classwork', label: 'Classwork', icon: '📚' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'grades', label: 'Grades', icon: '📊' },
    { id: 'people', label: 'People', icon: '👥' },
  ]

  const subjectIcon = subjectIcons[subject.name] || '📚'

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#F8FAF7' }}>
        <div className="text-gray-500">Loading class...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Header Banner */}
      <div 
        className="p-6 text-white relative overflow-hidden"
        style={{ background: subject.color, minHeight: '160px' }}
      >
        <Link to="/grade-levels" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
          ← Back to Grade Levels
        </Link>
        <h1 className="text-3xl font-bold mt-2">{subject.name}</h1>
        <p className="text-white/80">{subject.section} • {subject.grade}</p>
        
        {/* Decorative */}
        <div className="absolute right-8 bottom-4 text-8xl opacity-20">{subjectIcon}</div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'announcements' && <AnnouncementsTab subjectId={subjectId || ''} />}
        {activeTab === 'classwork' && <ClassworkTab subjectId={subjectId || ''} />}
        {activeTab === 'attendance' && <AttendanceTab classId={subjectId || ''} />}
        {activeTab === 'grades' && <GradesTab classId={subjectId || ''} />}
        {activeTab === 'people' && <PeopleTab subjectId={subjectId || ''} gradeLevel={subject.grade} />}
      </div>
    </div>
  )
}
