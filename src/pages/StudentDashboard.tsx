import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StudentKpis as _StudentKpis } from '../types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getDemoUser } from '../lib/demoUser'

interface ClassItem {
  id: string
  name: string
  subject_name: string
  grade_level: string
  section: string
  teacher_name: string
  teacher_avatar: string
  class_code: string
  room: string
}

export function StudentDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  
  // Check for demo user
  const demoUser = getDemoUser()
  const currentUser = profile || demoUser

  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    loadData()
    loadClasses()
  }, [])

  async function loadData() {
    setLoading(true)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const token = localStorage.getItem('access_token')
    try {
      const response = await fetch(`${apiUrl}/api/dashboard/stats?year=2025-2026&role=student`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const result = await response.json()
        setKpis(result.data?.student)
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    }
    setLoading(false)
  }

  async function loadClasses() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const token = localStorage.getItem('access_token')
    try {
      const response = await fetch(`${apiUrl}/api/classroom/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const result = await response.json()
        setClasses(result.data || [])
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    }
  }

  async function handleJoinClass() {
    if (!joinCode.trim()) return
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const token = localStorage.getItem('access_token')
    try {
      const response = await fetch(`${apiUrl}/api/classroom/classes/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ class_code: joinCode })
      })
      
      if (response.ok) {
        setShowJoinModal(false)
        setJoinCode('')
        loadClasses()
      } else {
        alert('Invalid class code')
      }
    } catch (error) {
      console.error('Error joining class:', error)
      alert('Failed to join class')
    }
  }

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
        {/* My Classes Section */}
        <div className="col-span-5 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">My Classes</h3>
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#5B8C51', color: '#5B8C51' }}
            >
              + Join Class
            </button>
          </div>
          <div className="space-y-3 max-h-[240px] overflow-y-auto">
            {classes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No classes yet</p>
                <p className="text-xs mt-1">Join a class using a class code</p>
              </div>
            ) : (
              classes.slice(0, 4).map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => navigate(`/classroom/${cls.id}`)}
                  className="p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: '#5B8C51' }}>
                      📖
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{cls.name}</p>
                      <p className="text-xs text-gray-500 truncate">{cls.teacher_name} • {cls.room || 'No room'}</p>
                    </div>
                    <span className="text-gray-400 text-sm">›</span>
                  </div>
                </div>
              ))
            )}
            {classes.length > 4 && (
              <button
                onClick={() => navigate('/classes')}
                className="w-full py-2 text-sm text-center rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: '#5B8C51' }}
              >
                View All {classes.length} Classes →
              </button>
            )}
          </div>
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

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Join Class</h2>
            <p className="text-gray-600 mb-4">Enter the class code provided by your teacher</p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CLASS CODE"
              className="w-full px-4 py-3 border rounded-lg font-mono text-center text-lg mb-4 uppercase"
              maxLength={8}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false)
                  setJoinCode('')
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinClass}
                disabled={joinCode.length < 6}
                className="flex-1 px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#5B8C51' }}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
