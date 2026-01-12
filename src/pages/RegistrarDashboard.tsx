import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'
import { useNavigate } from 'react-router-dom'

interface RegistrarKpis {
  total_students: number
  pending_enrollments: number
  active_classes: number
  total_sections: number
}

export function RegistrarDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<RegistrarKpis>({
    total_students: 0,
    pending_enrollments: 0,
    active_classes: 0,
    total_sections: 0
  })
  const [recentStudents, setRecentStudents] = useState<any[]>([])

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      
      const { data, error } = await api.dashboard.getStats('2025-2026', 'registrar');
      
      if (data && !error) {
        setKpis({
          total_students: data.students,
          pending_enrollments: 0,
          active_classes: data.classes,
          total_sections: 0 // Still need to fetch sections count separately or add to stats
        });
      }

      // Load recent students from student_records instead of profiles
      const { data: students } = await api
        .from('student_records')
        .select('id, student_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      const transformedStudents = (students || []).map((s: any) => ({
        ...s,
        full_name: s.student_name,
        email: 'N/A'
      }))

      setRecentStudents(transformedStudents)
      setLoading(false)
    }

    loadDashboard()
  }, [])

  const kpiCards = [
    { icon: '👥', label: 'Total Students', value: kpis.total_students, color: '#0D9488' },
    { icon: '📋', label: 'Pending Enrollments', value: kpis.pending_enrollments, color: '#F59E0B' },
    { icon: '📚', label: 'Active Classes', value: kpis.active_classes, color: '#8B5CF6' },
    { icon: '🏫', label: 'Total Sections', value: kpis.total_sections, color: '#EF4444' }
  ]

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center" style={{ backgroundColor: '#F8FAF7' }}>
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📝 Registrar Dashboard</h1>
        <p className="text-gray-500">Student enrollment and records management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${kpi.color}20` }}
              >
                {kpi.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
                <p className="text-sm text-gray-500">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/records')}
              className="p-4 rounded-xl text-left hover:shadow-md transition-shadow"
              style={{ backgroundColor: '#E8F5E3' }}
            >
              <span className="text-2xl">➕</span>
              <p className="font-medium text-gray-800 mt-2">Add Student</p>
              <p className="text-xs text-gray-500">Register new student</p>
            </button>
            <button
              onClick={() => navigate('/students')}
              className="p-4 rounded-xl text-left hover:shadow-md transition-shadow"
              style={{ backgroundColor: '#E0F2FE' }}
            >
              <span className="text-2xl">👥</span>
              <p className="font-medium text-gray-800 mt-2">View Students</p>
              <p className="text-xs text-gray-500">Manage student list</p>
            </button>
            <button
              onClick={() => navigate('/records')}
              className="p-4 rounded-xl text-left hover:shadow-md transition-shadow"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <span className="text-2xl">📋</span>
              <p className="font-medium text-gray-800 mt-2">Student Records</p>
              <p className="text-xs text-gray-500">View all records</p>
            </button>
            <button
              onClick={() => navigate('/grade-levels')}
              className="p-4 rounded-xl text-left hover:shadow-md transition-shadow"
              style={{ backgroundColor: '#FCE7F3' }}
            >
              <span className="text-2xl">📚</span>
              <p className="font-medium text-gray-800 mt-2">Grade Levels</p>
              <p className="text-xs text-gray-500">Manage grades</p>
            </button>
          </div>
        </div>

        {/* Recent Students */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🆕 Recently Added Students</h2>
          {recentStudents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No students found</p>
          ) : (
            <div className="space-y-3">
              {recentStudents.map((student) => (
                <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-teal-600 font-bold">
                      {student.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{student.full_name}</p>
                    <p className="text-xs text-gray-500">{student.email || 'No email'}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(student.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
