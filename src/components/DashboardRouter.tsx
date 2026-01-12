import { useState } from 'react'
import { AdminDashboard } from '../pages/AdminDashboard'
import { TeacherDashboard } from '../pages/TeacherDashboard'
import { StudentDashboard } from '../pages/StudentDashboard'
import { FinanceDashboard } from '../pages/FinanceDashboard'

type DashboardType = 'admin' | 'teacher' | 'student' | 'finance'

export function DashboardRouter() {
  const [currentDashboard, setCurrentDashboard] = useState<DashboardType>('admin')

  return (
    <div>
      {/* Dashboard Switcher (for demo - subtle version) */}
      <div className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-2">
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentDashboard('admin')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              currentDashboard === 'admin'
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={currentDashboard === 'admin' ? { backgroundColor: '#5B8C51' } : {}}
          >
            Admin
          </button>
          <button
            onClick={() => setCurrentDashboard('teacher')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              currentDashboard === 'teacher'
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={currentDashboard === 'teacher' ? { backgroundColor: '#5B8C51' } : {}}
          >
            Teacher
          </button>
          <button
            onClick={() => setCurrentDashboard('student')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              currentDashboard === 'student'
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={currentDashboard === 'student' ? { backgroundColor: '#5B8C51' } : {}}
          >
            Student
          </button>
          <button
            onClick={() => setCurrentDashboard('finance')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              currentDashboard === 'finance'
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={currentDashboard === 'finance' ? { backgroundColor: '#5B8C51' } : {}}
          >
            Finance
          </button>
        </div>
      </div>

      {/* Render current dashboard */}
      {currentDashboard === 'admin' && <AdminDashboard />}
      {currentDashboard === 'teacher' && <TeacherDashboard />}
      {currentDashboard === 'student' && <StudentDashboard />}
      {currentDashboard === 'finance' && <FinanceDashboard />}
    </div>
  )
}
