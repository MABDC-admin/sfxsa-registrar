import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useSchoolYear } from '../contexts/SchoolYearContext'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

// Counting animation hook
function useCountAnimation(endValue: number, duration: number = 1500) {
  const [count, setCount] = useState(0)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (endValue === 0) {
      setCount(0)
      return
    }
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const progress = timestamp - startTimeRef.current
      const percentage = Math.min(progress / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4)
      const currentCount = Math.floor(easeOutQuart * endValue)
      setCount(currentCount)
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

export function PrincipalDashboard() {
  const { profile } = useAuth()
  const { selectedYear, setSelectedYear, schoolYears } = useSchoolYear()
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  // KPI States
  const [studentCount, setStudentCount] = useState(0)
  const [teacherCount, setTeacherCount] = useState(0)
  const [adminCount, setAdminCount] = useState(0)
  const [classCount, setClassCount] = useState(0)
  const [maleCount, setMaleCount] = useState(0)
  const [femaleCount, setFemaleCount] = useState(0)
  const [pendingSuggestions, setPendingSuggestions] = useState(0)
  const [recentPayments, setRecentPayments] = useState(0)

  // Animated counts
  const animatedStudents = useCountAnimation(studentCount)
  const animatedTeachers = useCountAnimation(teacherCount)
  const animatedAdmins = useCountAnimation(adminCount)
  const animatedClasses = useCountAnimation(classCount)
  const animatedSuggestions = useCountAnimation(pendingSuggestions)

  const initialLoadDone = useRef(false)

  const loadData = useCallback(async (isRealtime = false) => {
    if (!isRealtime && !initialLoadDone.current) {
      setLoading(true)
    }

    try {
      const { data, error } = await api.dashboard.getStats(selectedYear, 'principal');
      
      if (data && !error) {
        setStudentCount(data.students || 0)
        setTeacherCount(data.teachers || 0)
        setClassCount(data.classes || 0)
        
        // Admin count still needs separate query or add to dashboard stats
        const { count: adCount } = await api.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true)
        setAdminCount(adCount || 0)

        // Process gender ratio
        const males = data.genderRatio?.find((r: any) => 
          r.gender?.toLowerCase() === 'male' || r.gender?.toLowerCase() === 'm'
        )?.count || 0;
        const females = data.genderRatio?.find((r: any) => 
          r.gender?.toLowerCase() === 'female' || r.gender?.toLowerCase() === 'f'
        )?.count || 0;
        
        setMaleCount(parseInt(males));
        setFemaleCount(parseInt(females));
        
        setRecentPayments(data.finance.totalCollected || 0);
      }
      
      // Suggestions still separate
      const suggestionsResult = await api.from('suggestions_reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setPendingSuggestions(suggestionsResult.count || 0)

    } catch (err) {
      console.error('Error loading principal dashboard:', err);
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [selectedYear])

  useEffect(() => {
    initialLoadDone.current = false
    loadData()
  }, [loadData])

  const realtimeCallback = useCallback(() => loadData(true), [loadData])

  useRealtimeSubscription(
    [
      { table: 'student_records' },
      { table: 'profiles' },
      { table: 'suggestions_reviews' },
      { table: 'payments' }
    ],
    realtimeCallback,
    [selectedYear]
  )

  const genderData = [
    { name: 'Male', value: maleCount || 50, color: '#4A90D9' },
    { name: 'Female', value: femaleCount || 50, color: '#E8A838' },
  ]

  const staffDistribution = [
    { name: 'Teachers', count: teacherCount, color: '#5B8C51' },
    { name: 'Admins', count: adminCount, color: '#667eea' },
  ]

  const enrollmentTrend = [
    { month: 'Jun', students: 120 },
    { month: 'Jul', students: 280 },
    { month: 'Aug', students: 420 },
    { month: 'Sep', students: studentCount || 500 },
  ]

  return (
    <div className="flex-1 relative min-h-screen overflow-hidden">
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              🎓 Principal Dashboard
            </h1>
            <p className="text-gray-500">Welcome back, {profile?.full_name || 'Principal'}</p>
          </div>
          
          {/* Year Selector */}
          <div className="relative">
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <span className="font-medium text-gray-700">{selectedYear}</span>
              <span className="text-gray-400">▼</span>
            </button>
            {showYearDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border z-50 min-w-[150px]">
                {schoolYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setShowYearDropdown(false) }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
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

        {/* Main KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Total Students */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Total Students</p>
                <p className="text-4xl font-bold mt-1">{loading ? '...' : animatedStudents}</p>
                <p className="text-white/70 text-xs mt-2">Enrolled this year</p>
              </div>
              <div className="text-5xl opacity-80">👥</div>
            </div>
          </div>

          {/* Teachers */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Active Teachers</p>
                <p className="text-4xl font-bold mt-1">{loading ? '...' : animatedTeachers}</p>
                <p className="text-white/70 text-xs mt-2">Teaching staff</p>
              </div>
              <div className="text-5xl opacity-80">👨‍🏫</div>
            </div>
          </div>

          {/* Admins */}
          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">System Admins</p>
                <p className="text-4xl font-bold mt-1">{loading ? '...' : animatedAdmins}</p>
                <p className="text-white/70 text-xs mt-2">Administrative staff</p>
              </div>
              <div className="text-5xl opacity-80">🛡️</div>
            </div>
          </div>

          {/* Classes */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Grade Levels</p>
                <p className="text-4xl font-bold mt-1">{loading ? '...' : animatedClasses}</p>
                <p className="text-white/70 text-xs mt-2">Active classes</p>
              </div>
              <div className="text-5xl opacity-80">📚</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-12 gap-4 mb-6">
          {/* Enrollment Trend */}
          <div className="col-span-5 bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Enrollment Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={enrollmentTrend}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="students" 
                    stroke="#5B8C51" 
                    strokeWidth={3}
                    dot={{ fill: '#5B8C51', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">👤 Gender Ratio</h3>
            <div className="h-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-700">
                  {maleCount + femaleCount}
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4A90D9' }}></div>
                <span className="text-xs text-gray-600">Male ({maleCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E8A838' }}></div>
                <span className="text-xs text-gray-600">Female ({femaleCount})</span>
              </div>
            </div>
          </div>

          {/* Staff Distribution */}
          <div className="col-span-4 bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">👥 Staff Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffDistribution} layout="vertical">
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {staffDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Pending Suggestions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">💬 Pending Suggestions</h3>
              <span className="px-3 py-1 rounded-full text-sm font-bold text-white" style={{ backgroundColor: pendingSuggestions > 0 ? '#EF4444' : '#5B8C51' }}>
                {animatedSuggestions}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              {pendingSuggestions > 0 
                ? `You have ${pendingSuggestions} suggestion(s) awaiting review`
                : 'All suggestions have been reviewed'}
            </p>
            <a 
              href="/inbox" 
              className="inline-block mt-3 text-sm font-medium hover:underline"
              style={{ color: '#5B8C51' }}
            >
              View Inbox →
            </a>
          </div>

          {/* Monthly Collections */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">💰 Monthly Collections</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#5B8C51' }}>
              ₱{recentPayments.toLocaleString()}
            </p>
            <p className="text-gray-500 text-sm mt-1">Payments received this month</p>
            <a 
              href="/finance" 
              className="inline-block mt-3 text-sm font-medium hover:underline"
              style={{ color: '#5B8C51' }}
            >
              View Finance →
            </a>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <a 
                href="/students"
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>👤</span>
                <span className="text-sm text-gray-700">Students</span>
              </a>
              <a 
                href="/teachers"
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>👨‍🏫</span>
                <span className="text-sm text-gray-700">Teachers</span>
              </a>
              <a 
                href="/admins"
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>🛡️</span>
                <span className="text-sm text-gray-700">Admins</span>
              </a>
              <a 
                href="/reports"
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>📊</span>
                <span className="text-sm text-gray-700">Reports</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
