import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'
import type { TeacherKpis as _TeacherKpis, Submission as _Submission } from '../types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getDemoUser } from '../lib/demoUser'

export function TeacherDashboard() {
  const { profile } = useAuth()
  
  // Check for demo user
  const demoUser = getDemoUser()
  const currentUser = profile || demoUser

  const [kpis, setKpis] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const { data, error } = await api.dashboard.getStats('2025-2026', 'teacher');
      
      if (data && !error) {
        setKpis(data.teacher)
        setSubmissions(data.teacher.recentSubmissions || [])
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const attendanceBarData = [
    { day: 'Sep', value: 45 }, { day: 'Mon', value: 55 }, { day: 'Tue', value: 48 },
    { day: 'Wed', value: 62 }, { day: 'Thu', value: 58 }, { day: 'Fri', value: 72 },
    { day: 'Sat', value: 65 }, { day: 'Sun', value: 70 }, { day: 'Mon', value: 68 },
    { day: 'Tue', value: 75 }, { day: 'Wed', value: 78 }, { day: 'Thu', value: 72 },
    { day: 'Fri', value: 80 }, { day: 'Sat', value: 76 }, { day: 'Sep', value: 82 },
  ]

  const lineChartData = [
    { name: '2Mo', value: 65 }, { name: 'Map', value: 72 }, { name: 'Son', value: 68 },
    { name: 'Nat', value: 75 }, { name: 'Map', value: 70 }, { name: '3an', value: 78 }, { name: 'Q3%', value: 82 },
  ]

  const engagementData = [
    { name: 'Active', value: 70, color: '#5B8C51' },
    { name: 'Passive', value: 20, color: '#C4A642' },
    { name: 'Disengaged', value: 10, color: '#D4763A' },
  ]

  const displaySubmissions = submissions.length > 0 ? submissions : [
    { id: '1', student_name: 'Emily Clark', assignment_title: 'Math Assignment', submitted_at: new Date().toISOString() },
    { id: '2', student_name: 'John Smith', assignment_title: 'Science Project', submitted_at: new Date().toISOString() },
    { id: '3', student_name: 'Sarah Lee', assignment_title: 'History Essay', submitted_at: new Date().toISOString() },
  ]

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Welcome {currentUser?.full_name || 'Teacher'}!</h1>
        <div className="flex items-center gap-4">
          <button className="p-2 border border-gray-300 rounded-lg text-gray-500">☐</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#5B8C51' }}>
            Load Report <span>→</span>
          </button>
        </div>
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* My Active Classes Card */}
        <div className="col-span-4 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">My Active Classes</h3>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
              <span style={{ color: '#5B8C51' }}>📋</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8FAF7' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
                  <span className="text-xs" style={{ color: '#5B8C51' }}>📚</span>
                </div>
                <span className="text-xs text-gray-500">My Active Classes</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{loading ? '...' : (kpis?.my_classes || 6)}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8FAF7' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
                  <span className="text-xs" style={{ color: '#5B8C51' }}>📅</span>
                </div>
                <span className="text-xs text-gray-500">Today's Classes</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">4</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8FAF7' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
                  <span className="text-xs" style={{ color: '#5B8C51' }}>✅</span>
                </div>
                <span className="text-xs text-gray-500">Assignments to Check</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{loading ? '...' : (kpis?.submissions_to_check || 18)}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8FAF7' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
                  <span className="text-xs" style={{ color: '#5B8C51' }}>👥</span>
                </div>
                <span className="text-xs text-gray-500">Absent Students Today</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">7</p>
            </div>
          </div>
        </div>

        {/* Class Attendance Trend - Bar Chart */}
        <div className="col-span-8 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Class Attendance Trend</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Sep 16 - Sep 23</span>
              <span className="px-2 py-1 rounded" style={{ backgroundColor: '#E8F5E3', color: '#5B8C51' }}>📅</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[30, 60, 80]} tickFormatter={(v) => `${v}%`} />
              <Bar dataKey="value" fill="#5B8C51" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Class Attendance Trend - Line Chart */}
        <div className="col-span-4 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Class Attendance Trend</h3>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
              <span style={{ color: '#5B8C51' }}>📊</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[50, 100]} ticks={[50, 100]} tickFormatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="value" stroke="#5B8C51" strokeWidth={2} dot={{ fill: '#5B8C51', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Class Engagement - Donut */}
        <div className="col-span-4 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Class Engagement</h3>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
              <span style={{ color: '#5B8C51' }}>📈</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={engagementData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                    {engagementData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#5B8C51' }}>70%</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5B8C51' }}></div><span className="text-sm text-gray-600">Active</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C4A642' }}></div><span className="text-sm text-gray-600">Passive</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D4763A' }}></div><span className="text-sm text-gray-600">Disengaged</span></div>
            </div>
          </div>
        </div>

        {/* Latest Submissions */}
        <div className="col-span-4 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Latest Submissions</h3>
            <span className="text-gray-400">›</span>
          </div>
          <div className="space-y-4">
            {displaySubmissions.slice(0, 3).map((sub: any, index) => (
              <div key={sub.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.student_name || index}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{sub.student_name || 'Unknown Student'}</p>
                  <p className="text-xs text-gray-500">{sub.assignment_title || 'Assignment'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
