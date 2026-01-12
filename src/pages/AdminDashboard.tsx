import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../lib/apiClient'
import type { AcademicYear } from '../types'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useSchoolYear } from '../contexts/SchoolYearContext'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { RegistrarDashboard } from './RegistrarDashboard'
import { PrincipalDashboard } from './PrincipalDashboard'
import { TeacherDashboard } from './TeacherDashboard'
import { AccountingDashboard } from './AccountingDashboard'
import { FinanceDashboard } from './FinanceDashboard'
import { StudentDashboard } from './StudentDashboard'

// Counting animation hook
function useCountAnimation(endValue: number, duration: number = 1500) {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (endValue === 0) {
      setCount(0)
      return
    }
    countRef.current = 0
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const progress = timestamp - startTimeRef.current
      const percentage = Math.min(progress / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4)
      const currentCount = Math.floor(easeOutQuart * endValue)
      setCount(currentCount)
      countRef.current = currentCount
      if (percentage < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(endValue)
      }
    }
    requestAnimationFrame(animate)
  }, [endValue, duration])

  return count
}

export function AdminDashboard() {
  const { profile } = useAuth()
  const { selectedYear, setSelectedYear, schoolYears } = useSchoolYear()
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const currentUser = profile
  
  const [_years, _setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [studentCount, setStudentCount] = useState(0)
  const [maleCount, setMaleCount] = useState(0)
  const [femaleCount, setFemaleCount] = useState(0)
  const [classesCount, setClassesCount] = useState(0)
  const [teachersCount, setTeachersCount] = useState(0)
  const [roomsCount, setRoomsCount] = useState(0)
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [recentBirthdays, setRecentBirthdays] = useState<any[]>([])

  // Module Permissions State
  const [rolePermissions, setRolePermissions] = useState<any[]>([])
  const [activeRoleTab, setActiveRoleTab] = useState('admin')
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])

  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'academic-years', label: 'Academic Years' },
    { key: 'grade-levels', label: 'Grade Levels' },
    { key: 'students', label: 'Students' },
    { key: 'records', label: 'Records' },
    { key: 'teachers', label: 'Teachers' },
    { key: 'admins', label: 'Admins' },
    { key: 'principals', label: 'Principals' },
    { key: 'registrars', label: 'Registrars' },
    { key: 'accounting-users', label: 'Accounting' },
    { key: 'classes', label: 'Classes' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'finance', label: 'Finance' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'chat', label: 'Chat' },
    { key: 'reports', label: 'Reports' },
    { key: 'inbox', label: 'Suggestions' },
    { key: 'settings', label: 'Settings' }
  ]

  const animatedStudentCount = useCountAnimation(studentCount)
  const animatedMalePercent = useCountAnimation(maleCount > 0 ? Math.round(maleCount / (maleCount + femaleCount) * 100) : 0)
  const animatedFemalePercent = useCountAnimation(femaleCount > 0 ? Math.round(femaleCount / (maleCount + femaleCount) * 100) : 0)
  const animatedClassesCount = useCountAnimation(classesCount)
  const animatedTeachersCount = useCountAnimation(teachersCount)
  const animatedRoomsCount = useCountAnimation(roomsCount)

  // Track if initial load is done
  const initialLoadDone = useRef(false)

  // Load Permissions
  const loadPermissions = async () => {
    try {
      const [{ data: perms }, { data: rolesData }] = await Promise.all([
        api.from('role_module_permissions').select('*'),
        api.from('user_roles').select('name')
      ])
      if (perms) setRolePermissions(perms)
      if (rolesData) setAvailableRoles(rolesData.map((r: any) => r.name))
      else setAvailableRoles(['admin', 'registrar', 'principal', 'teacher', 'finance', 'accounting', 'student'])
    } catch (err) {
      console.error('Error loading permissions:', err)
    }
  }

  const togglePermission = async (role: string, module: string, currentStatus: boolean) => {
    setSavingPermissions(true)
    try {
      const { error } = await api.from('role_module_permissions')
        .upsert({
          role,
          module_key: module,
          is_enabled: !currentStatus,
          updated_at: new Date().toISOString()
        })
      
      if (!error) {
        await loadPermissions()
      }
    } catch (err) {
      console.error('Error toggling permission:', err)
    }
    setSavingPermissions(false)
  }

  const loadData = useCallback(async (isRealtime = false) => {
    // Only show loading on initial load, not on real-time updates
    if (!isRealtime && !initialLoadDone.current) {
      setLoading(true)
    }

    try {
      // Fetch consolidated stats from our new endpoint
      const { data: stats, error } = await api.dashboard.getStats(selectedYear, 'admin');
      
      if (error) throw error;

      if (stats) {
        setStudentCount(stats.students || 0)
        setTeachersCount(stats.teachers || 0)
        setClassesCount(stats.classes || 0)
        setRoomsCount(Math.ceil(stats.classes * 1.1) || 15) // Approximate rooms if not tracked separately
        
        // Process gender ratio
        const males = stats.genderRatio?.find((r: any) => 
          r.gender?.toLowerCase() === 'male' || r.gender?.toLowerCase() === 'm'
        )?.count || 0;
        const females = stats.genderRatio?.find((r: any) => 
          r.gender?.toLowerCase() === 'female' || r.gender?.toLowerCase() === 'f'
        )?.count || 0;
        
        setMaleCount(parseInt(males));
        setFemaleCount(parseInt(females));
        
        setUpcomingEvents(stats.events || []);
        setRecentBirthdays(stats.birthdays || []);
      }
      
      // Still need to load permissions separately as they are admin-only config
      await loadPermissions();
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [selectedYear])

  // Initial load
  useEffect(() => {
    // Reset initial load flag when selectedYear changes
    initialLoadDone.current = false
    loadData()
  }, [loadData])

  // Real-time subscriptions for live updates (pass true to skip loading state)
  const realtimeCallback = useCallback(() => loadData(true), [loadData])
  
  useRealtimeSubscription(
    [
      { table: 'student_records' },
      { table: 'profiles' },
      { table: 'academic_years' }
    ],
    realtimeCallback,
    [selectedYear]
  )

  const totalGenderCount = maleCount + femaleCount || 331
  const yearName = selectedYear || '2025-2026'

  const performanceData = [
    { name: 'High Performers', value: 62, color: '#5B8C51' },
    { name: 'Average', value: 23, color: '#C4A642' },
    { name: 'At Risk', value: 10, color: '#D4763A' },
  ]

  return (
    <div className="flex-1 relative min-h-screen overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-flyInDown" style={{ animationDelay: '0s' }}>
          <h1 className="text-3xl font-bold text-gray-800">Welcome {currentUser?.full_name || 'Dennis Sotto'}!</h1>
          <button className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: '#5B8C51' }}>
            Load Report <span>→</span>
          </button>
        </div>

        {/* Role-Based Module Permissions (Admin Only) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-8 animate-flyInDown" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                🛡️ Module Access Control
              </h2>
              <p className="text-gray-500 text-sm">Configure which modules each user role can access</p>
            </div>
            {savingPermissions && (
              <span className="text-xs text-green-600 font-medium animate-pulse">Saving changes...</span>
            )}
          </div>

          {/* Role Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-100 pb-4 overflow-x-auto no-scrollbar">
            {availableRoles.map(role => (
              <button
                key={role}
                onClick={() => setActiveRoleTab(role)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeRoleTab === role
                    ? 'bg-green-600 text-white shadow-md scale-105'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)} View
              </button>
            ))}
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {modules.map(module => {
              const permission = rolePermissions.find(p => p.role === activeRoleTab && p.module_key === module.key)
              const isEnabled = permission ? permission.is_enabled : true
              
              return (
                <div 
                  key={module.key}
                  onClick={() => togglePermission(activeRoleTab, module.key, isEnabled)}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
                    isEnabled 
                      ? 'border-green-100 bg-green-50/30' 
                      : 'border-red-50 bg-red-50/20 opacity-60'
                  } hover:scale-[1.02] active:scale-95`}
                >
                  <span className={`text-xs font-bold ${isEnabled ? 'text-green-800' : 'text-red-800'}`}>
                    {module.label}
                  </span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="animate-flyInUp" style={{ animationDelay: '0.2s' }}>
          {activeRoleTab === 'admin' && (
            <div className="grid grid-cols-12 gap-4">
              {/* Left Column - Stats Cards */}
              <div className="col-span-3 space-y-3">
                {/* Total Enrolled Students */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <p className="text-gray-500 text-sm mb-1">Total Enrolled Students</p>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-bold text-gray-800">{loading ? '...' : animatedStudentCount}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: '#5B8C51' }}>
                      Rank Increase
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">New Admissions</p>
                </div>

                {/* Male/Female Ratio */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-500 text-sm">Male/Female Ratio</p>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <span>{totalGenderCount}</span>
                      <span>👤👤</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-bold" style={{ color: '#4A90D9' }}>{loading ? '...' : `${animatedMalePercent}%`}</span>
                      <span className="text-xl">👨</span>
                      <span className="text-xs text-gray-500">Male</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-bold" style={{ color: '#E8A838' }}>{loading ? '...' : `${animatedFemalePercent}%`}</span>
                      <span className="text-xl">😊</span>
                      <span className="text-xs text-gray-500">Female</span>
                    </div>
                  </div>
                </div>

                {/* Active Classes */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📚</span>
                    <span className="text-gray-600 text-sm font-medium">Active Classes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-gray-800">{loading ? '...' : animatedClassesCount}</span>
                    <span className="text-gray-400">›</span>
                  </div>
                </div>

                {/* Active Teachers */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👨‍🏫</span>
                    <span className="text-gray-600 text-sm font-medium">Active Teachers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-gray-800">{loading ? '...' : animatedTeachersCount}</span>
                    <span className="text-gray-400">›</span>
                  </div>
                </div>

                {/* Available Rooms */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚪</span>
                    <span className="text-gray-600 text-sm font-medium">Available Rooms</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-gray-800">{loading ? '...' : animatedRoomsCount}</span>
                    <span className="text-gray-400">›</span>
                  </div>
                </div>
              </div>

              {/* Center Column - Performance Overview */}
              <div className="col-span-5">
                <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 h-full">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Student Performance</h2>
                      <p className="text-gray-500 text-sm">Overview</p>
                    </div>
                    {/* Academic Year Dropdown */}
                    <div className="text-right relative">
                      <p className="text-xs text-gray-400">Academic Year</p>
                      <button
                        onClick={() => setShowYearDropdown(!showYearDropdown)}
                        className="text-xl font-bold flex items-center gap-1"
                        style={{ color: '#5B8C51' }}
                      >
                        {yearName} <span className="text-sm">🌿 ▼</span>
                      </button>
                      {showYearDropdown && (
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 min-w-[130px]">
                          {schoolYears.map((year) => (
                            <button
                              key={year}
                              onClick={() => { setSelectedYear(year); setShowYearDropdown(false); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                selectedYear === year ? 'text-green-600 font-medium bg-green-50' : 'text-gray-700'
                              }`}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Donut Chart */}
                  <div className="relative h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={performanceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {performanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold" style={{ color: '#5B8C51' }}>62%</p>
                        <p className="text-xs text-gray-500">High Performers</p>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C4A642' }}></div>
                      <span className="text-xs text-gray-600">23% Average</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D4763A' }}></div>
                      <span className="text-xs text-gray-600">10% At Risk</span>
                    </div>
                  </div>

                  {/* Bottom Cards Row */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {/* Tasks Today */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <h3 className="font-bold text-gray-800 text-sm mb-2">Tasks Today</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">📋</span>
                            <span className="text-xs text-gray-600">Check Behavior<br/>Incidents</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">5</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">📚</span>
                            <span className="text-xs text-gray-600">Review Late<br/>Homework</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">18</span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-800 text-sm">Attendance</h3>
                        <span className="text-lg">📊</span>
                      </div>
                      <div className="flex gap-1 mb-2">
                        <span className="text-xl">😊</span>
                        <span className="text-xl">😄</span>
                        <span className="text-xl">😢</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600">5 New</span>
                        <span className="text-gray-400">▼</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-span-4 space-y-3">
                {/* Completion Rate */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-3">
                  <span className="text-4xl">🦉</span>
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs">Completion Rate</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full animate-progressBar" style={{ width: '72%', backgroundColor: '#5B8C51' }}></div>
                      </div>
                      <span className="text-lg font-bold" style={{ color: '#5B8C51' }}>72%</span>
                    </div>
                  </div>
                </div>

                {/* Course Progress */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-3">
                  <span className="text-4xl">🐧</span>
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs">Course Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full animate-progressBar" style={{ width: '72%', backgroundColor: '#5B8C51' }}></div>
                      </div>
                      <span className="text-lg font-bold" style={{ color: '#5B8C51' }}>72%</span>
                    </div>
                  </div>
                </div>

                {/* Upcoming Events */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">Upcoming Events</h3>
                    <div className="flex gap-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      <span className="w-2 h-2 rounded-full bg-green-300"></span>
                      <span className="w-2 h-2 rounded-full bg-green-200"></span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {upcomingEvents.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No upcoming events</p>
                    ) : (
                      upcomingEvents.map((event: any) => (
                        <div key={event.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
                          <span className="text-xl">
                            {event.type === 'holiday' ? '🎉' : event.type === 'exam' ? '📝' : '🔬'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{event.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <h3 className="font-bold text-gray-800 text-sm mb-3">Messages</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
                      <span className="text-lg">✉️</span>
                      <span className="text-sm text-gray-700">Meeting at 3 PM</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
                      <span className="text-lg">👨‍💼</span>
                      <span className="text-sm text-gray-700">Grades Updated</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRoleTab === 'registrar' && <RegistrarDashboard />}
          {activeRoleTab === 'principal' && <PrincipalDashboard />}
          {activeRoleTab === 'teacher' && <TeacherDashboard />}
          {activeRoleTab === 'accounting' && <AccountingDashboard />}
          {activeRoleTab === 'finance' && <FinanceDashboard />}
          {activeRoleTab === 'student' && <StudentDashboard />}
        </div>

        {/* Bottom Row - Only show for Admin View */}
        {activeRoleTab === 'admin' && (
          <div className="grid grid-cols-3 gap-4 mt-4 animate-flyInUp" style={{ animationDelay: '0.4s' }}>
            {/* Birthday Widget */}
            <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">🎂 Birthdays This Week</h3>
                <span className="text-xs text-gray-400 hover:text-green-500 cursor-pointer">View All</span>
              </div>
              <div className="space-y-3">
                {recentBirthdays.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No birthdays this week</p>
                ) : (
                  recentBirthdays.map((student: any, index: number) => {
                    const colors = ['orange', 'yellow', 'blue', 'green', 'purple'];
                    const color = colors[index % colors.length];
                    const isToday = new Date(student.birth_date).getDate() === new Date().getDate();
                    
                    return (
                      <div key={index} className={`flex items-center gap-3 p-2 bg-${color}-50 rounded-xl border-l-4 border-${color}-400 hover:shadow-sm transition-shadow`}>
                        <span className={`text-3xl ${isToday ? 'animate-bounce' : ''}`} style={{ animationDuration: '2s' }}>
                          {isToday ? '🎉' : index % 2 === 0 ? '🎈' : '🎁'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{student.student_name}</p>
                          <p className="text-xs text-gray-500">Student • {student.grade_level}</p>
                        </div>
                        {isToday && <span className={`text-xs font-bold text-${color}-500 animate-pulse`}>Today!</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Announcements Widget */}
            <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">📢 Announcements</h3>
                <button className="text-xs px-2 py-1 rounded-full text-white hover:opacity-80 transition-opacity" style={{ backgroundColor: '#5B8C51' }}>+ New</button>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-xl border-l-4 border-red-500 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">Urgent</span>
                    <span className="text-xs text-gray-400">2 hours ago</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">Early Dismissal on Friday</p>
                  <p className="text-xs text-gray-500">All students will be dismissed at 12:00 PM</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border-l-4 border-blue-500 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">Info</span>
                    <span className="text-xs text-gray-400">Yesterday</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">Parent-Teacher Conference</p>
                  <p className="text-xs text-gray-500">Schedule available on portal</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl border-l-4 border-green-500 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">New</span>
                    <span className="text-xs text-gray-400">3 days ago</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">Library Hours Extended</p>
                  <p className="text-xs text-gray-500">Now open until 6:00 PM</p>
                </div>
              </div>
            </div>

            {/* School Activity Widget */}
            <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">🏫 School Activities</h3>
                <span className="text-xs text-gray-400">This Month</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: '#E1BEE7' }}>🎭</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Drama Club Performance</p>
                    <p className="text-xs text-gray-500">Jan 15 • Auditorium</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-600">Ongoing</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-cyan-50 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: '#B2EBF2' }}>🏀</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Basketball Tournament</p>
                    <p className="text-xs text-gray-500">Jan 20 • Sports Complex</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-cyan-100 text-cyan-600">Upcoming</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: '#FFE082' }}>🎨</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Art Exhibition</p>
                    <p className="text-xs text-gray-500">Jan 25 • Main Hall</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-600">Upcoming</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes flyInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes flyInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes flyInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes flyInDown {
          from {
            opacity: 0;
            transform: translateY(-40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes progressBar {
          from {
            width: 0%;
          }
        }
        
        .animate-flyInLeft {
          animation: flyInLeft 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0;
        }
        
        .animate-flyInRight {
          animation: flyInRight 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0;
        }
        
        .animate-flyInUp {
          animation: flyInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0;
        }
        
        .animate-flyInDown {
          animation: flyInDown 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0;
        }
        
        .animate-slideUp {
          animation: slideUp 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-progressBar {
          animation: progressBar 1s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
