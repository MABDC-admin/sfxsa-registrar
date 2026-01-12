import { useState, useEffect } from 'react'
import { api } from '../../lib/apiClient'
import { useAuth } from '../../contexts/AuthContext'

interface AttendanceTabProps {
  classId: string
}

export function AttendanceTab({ classId }: AttendanceTabProps) {
  const { profile } = useAuth()
  const canEdit = ['teacher', 'admin', 'principal'].includes(profile?.role || '')
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [classId, date])

  async function loadData() {
    setLoading(true)
    try {
      // 1. Get students in this class
      // For now, let's assume we fetch students based on grade level or a link table
      // Since our schema uses student_records.grade_level, let's fetch class grade level first
      const { data: classData } = await api.from('classes').select('grade_level').eq('id', classId).single()
      
      if (classData) {
        const { data: studentsData } = await api
          .from('student_records')
          .select('id, student_name, lrn')
          .eq('grade_level', (classData as any).grade_level)
          .order('student_name', { ascending: true })
        
        setStudents(studentsData || [])

        // 2. Get existing attendance for this date
        const { data: attendanceData } = await api
          .from('attendance')
          .select('student_id, status')
          .eq('class_id', classId)
          .eq('date', date)

        const attendanceMap: { [key: string]: string } = {}
        attendanceData?.forEach((record: any) => {
          attendanceMap[record.student_id] = record.status
        })
        setAttendance(attendanceMap)
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveAttendance() {
    setSaving(true)
    try {
      const records = students.map(student => ({
        student_id: student.id,
        class_id: classId,
        date: date,
        status: attendance[student.id] || 'present'
      }))

      // Use upsert or delete/insert
      // Our backend handles upsert if we provide ID, but we don't have IDs here easily
      // Let's delete existing for this date and class first
      await api.from('attendance').delete().eq('class_id', classId).eq('date', date)
      
      const { error } = await api.from('attendance').insert(records)
      
      if (error) throw error
      alert('Attendance saved successfully!')
    } catch (error) {
      console.error('Error saving attendance:', error)
      alert('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = (studentId: string) => {
    const statusOrder = ['present', 'absent', 'late', 'excused']
    const currentStatus = attendance[studentId] || 'present'
    const nextStatus = statusOrder[(statusOrder.indexOf(currentStatus) + 1) % statusOrder.length]
    
    setAttendance(prev => ({
      ...prev,
      [studentId]: nextStatus
    }))
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading attendance...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Daily Attendance</h2>
          <p className="text-sm text-gray-500">Mark attendance for your students</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
          {canEdit && (
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Student Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">LRN</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">No students found for this class grade level.</td>
              </tr>
            ) : (
              students.map((student) => {
                const status = attendance[student.id] || 'present'
                const statusColors: { [key: string]: string } = {
                  present: 'bg-green-100 text-green-700 border-green-200',
                  absent: 'bg-red-100 text-red-700 border-red-200',
                  late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                  excused: 'bg-blue-100 text-blue-700 border-blue-200'
                }

                return (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{student.student_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{student.lrn}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => canEdit && toggleStatus(student.id)}
                        disabled={!canEdit}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${statusColors[status]} ${!canEdit ? 'cursor-default' : ''}`}
                      >
                        {status.toUpperCase()}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
