import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'
import type { StudentKpis as _StudentKpis } from '../types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getDemoUser } from '../lib/demoUser'

export function StudentDashboard() {
  const { profile } = useAuth()
  
  // Check for demo user
  const demoUser = getDemoUser()
  const currentUser = profile || demoUser

  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data, error } = await api.dashboard.getStats('2025-2026', 'student');
      if (data && !error) {
        setKpis(data.student)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const gradeData = [
    { name: 'Sno', value: 45 }, { name: 'Me', value: 38 }, { name: 'Abo', value: 42 },
    { name: 'Mop', value: 35 }, { name: 'Nat', value: 48 }, { name: 'Jart', value: 40 },
    { name: 'Nap', value: 52 }, { name: 'Nep', value: 45 }, { name: 'Q3%', value: 50 },
  ]

  const deadlineStudents = [
    { name: 'Emily Clark', subtitle: 'Math Assignment', date: 'Apr 23', days: '2 days' },
    { name: 'John Smith', subtitle: 'Science Project', date: 'Apr 23', days: '3 days' },
    { name: 'Sarah Lee', subtitle: 'History Essay', date: 'Apr 23', days: '5 days' },
  ]

  const deadlineAssignments = [
    { title: 'History Essay', subtitle: 'Due 1:22 AM' },
    { title: 'Math Homework', subtitle: 'Due 1:32 AM' },
    { title: 'Science Project', subtitle: 'Due 9:02 AM' },
  ]

  const assignmentsDue = [
    { title: 'English Essay', date: 'Apr 21', days: '2 days' },
    { title: 'Science Homework', date: 'Apr 07', days: '4 days' },
    { title: 'History Project', date: 'Apr 23', days: '9 days' },
  ]

  const announcements = [
    { title: 'Math Quiz', date: 'Apr 26', subtitle: 'Chapter 5 test', time: '2:10 PM' },
    { title: 'Field Trip', date: 'Apr 28', subtitle: 'Museum visit', time: '1:10 PM' },
  ]

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Welcome Back, {currentUser?.full_name || 'Student'}!</h1>
        <div className="flex items-center gap-4">
          <button className="p-2 border border-gray-300 rounded-lg text-gray-500">☐</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2" style={{ borderColor: '#5B8C51', color: '#5B8C51' }}>
            Load Report <span>→</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
            <span className="text-xl" style={{ color: '#5B8C51' }}>📚</span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Subjects Enrolled</p>
            <p className="text-xs text-gray-400">Active courses</p>
          </div>
          <p className="text-4xl font-bold text-gray-800 ml-auto">{loading ? '...' : (kpis?.enrolled_subjects || 7)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
            <span className="text-xl" style={{ color: '#5B8C51' }}>📅</span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-xs text-gray-400">Due today</p>
          </div>
          <p className="text-4xl font-bold text-gray-800 ml-auto">3</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
            <span className="text-xl" style={{ color: '#5B8C51' }}>✅</span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Assignments</p>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
          <p className="text-4xl font-bold ml-auto" style={{ color: '#5B8C51' }}>
            {loading ? '...' : (kpis?.assignments?.total > 0 ? Math.round((kpis.assignments.completed / kpis.assignments.total) * 100) : 0)}%
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
            <span className="text-xl" style={{ color: '#5B8C51' }}>👤</span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Attendance</p>
            <p className="text-xs text-gray-400">This month</p>
          </div>
          <p className="text-4xl font-bold ml-auto" style={{ color: '#5B8C51' }}>
            {loading ? '...' : (kpis?.attendance?.total > 0 ? Math.round((kpis.attendance.present / kpis.attendance.total) * 100) : 100)}%
          </p>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-5 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Grade Progress Per Subject</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={gradeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[20, 60]} ticks={[30, 50]} tickFormatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="value" stroke="#5B8C51" strokeWidth={2} dot={{ fill: '#5B8C51', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-4 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Upcoming Deadlines</h3>
          </div>
          <div className="space-y-4">
            {deadlineStudents.map((student, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{student.date}</p>
                  <p className="text-xs text-gray-500">{student.days}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Deadlines</h3>
          <div className="space-y-4">
            {deadlineAssignments.map((assignment, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
                  <span className="text-sm" style={{ color: '#5B8C51' }}>📝</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{assignment.title}</p>
                  <p className="text-xs text-gray-500">{assignment.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Assignments Due Soon</h3>
          <div className="space-y-3">
            {assignmentsDue.map((assignment, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F8FAF7' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5B8C51' }}>
                  <span className="text-white text-sm">✓</span>
                </div>
                <p className="text-sm font-medium text-gray-800 flex-1">{assignment.title}</p>
                <p className="text-sm text-gray-600">{assignment.date}</p>
                <p className="text-sm text-gray-500">{assignment.days}</p>
                <span className="text-gray-400">›</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-7 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Announcements</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {announcements.map((ann, index) => (
              <div key={index} className="p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E3' }}>
                    <span className="text-xs" style={{ color: '#5B8C51' }}>📢</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{ann.title}</p>
                  <p className="text-xs text-gray-500 ml-auto">{ann.date}</p>
                </div>
                <p className="text-xs text-gray-500 ml-8">{ann.subtitle}</p>
                <p className="text-xs text-gray-400 ml-8">{ann.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
