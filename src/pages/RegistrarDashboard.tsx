import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '../lib/apiClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface RegistrarKpis {
  total_students: number
  pending_enrollments: number
  active_classes: number
  total_sections: number
}

export function RegistrarDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [menuPermissions, setMenuPermissions] = useState<Array<{menu_key: string, is_enabled: boolean}>>([])
  const [kpis, setKpis] = useState<RegistrarKpis>({
    total_students: 0,
    pending_enrollments: 0,
    active_classes: 0,
    total_sections: 0
  })
  const [recentStudents, setRecentStudents] = useState<any[]>([])

  // Load module permissions for Registrar role
  useEffect(() => {
    async function loadPermissions() {
      if (!profile?.role) return
      try {
        const { data } = await api.from('role_module_permissions').select('*').eq('role', profile.role)
        if (data) {
          setMenuPermissions(data.map((p: any) => ({
            menu_key: p.module_key,
            is_enabled: p.is_enabled
          })))
        }
      } catch (err) {
        console.error('Error loading permissions:', err)
      }
    }
    loadPermissions()
  }, [profile?.role])

  // Check if a module is enabled
  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    const permission = menuPermissions.find(p => p.menu_key === moduleKey)
    return permission ? permission.is_enabled : true
  }, [menuPermissions])

  // Quick action links - only show enabled modules
  const quickActions = useMemo(() => {
    const allActions = [
      { key: 'records', icon: '➕', label: 'Add Student', description: 'Register new student', path: '/records', color: '#E8F5E3' },
      { key: 'students', icon: '👥', label: 'View Students', description: 'Manage student list', path: '/students', color: '#E0F2FE' },
      { key: 'records', icon: '📋', label: 'Student Records', description: 'View all records', path: '/records', color: '#FEF3C7' },
      { key: 'grade-levels', icon: '📚', label: 'Grade Levels', description: 'Manage grades', path: '/grade-levels', color: '#FCE7F3' },
    ]
    return allActions.filter(action => isModuleEnabled(action.key))
  }, [isModuleEnabled])

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
          {quickActions.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="p-4 rounded-xl text-left hover:shadow-md transition-shadow"
                  style={{ backgroundColor: action.color }}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <p className="font-medium text-gray-800 mt-2">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No quick actions available</p>
              <p className="text-xs mt-1">Modules may be disabled by admin</p>
            </div>
          )}
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
