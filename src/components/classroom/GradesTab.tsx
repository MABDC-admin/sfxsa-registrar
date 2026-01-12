import { useState, useEffect } from 'react'
import { api } from '../../lib/apiClient'
import { useAuth } from '../../contexts/AuthContext'

interface GradesTabProps {
  classId: string
}

export function GradesTab({ classId }: GradesTabProps) {
  const { profile } = useAuth()
  const canEdit = ['teacher', 'admin', 'principal'].includes(profile?.role || '')
  const [students, setStudents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [grades, setGrades] = useState<{ [key: string]: { [key: string]: number } }>({})
  const [loading, setLoading] = useState(true)
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [newAssignment, setNewAssignment] = useState({ title: '', points_possible: 100 })

  useEffect(() => {
    loadData()
  }, [classId])

  async function loadData() {
    setLoading(true)
    try {
      const { data: classData } = await api.from('classes').select('grade_level').eq('id', classId).single()
      
      if (classData) {
        // 1. Get students
        const { data: studentsData } = await api
          .from('student_records')
          .select('id, student_name')
          .eq('grade_level', (classData as any).grade_level)
          .order('student_name', { ascending: true })
        
        setStudents(studentsData || [])

        // 2. Get assignments for this class
        const { data: assignmentsData } = await api
          .from('assignments')
          .select('*')
          .eq('class_id', classId)
          .order('created_at', { ascending: true })
        
        setAssignments(assignmentsData || [])

        // 3. Get all submissions (grades)
        const { data: submissionsData } = await api
          .from('submissions')
          .select('student_id, assignment_id, grade')
          .in('assignment_id', (assignmentsData || []).map((a: any) => a.id))

        const gradesMap: { [key: string]: { [key: string]: number } } = {}
        submissionsData?.forEach((sub: any) => {
          if (!gradesMap[sub.student_id]) gradesMap[sub.student_id] = {}
          gradesMap[sub.student_id][sub.assignment_id] = sub.grade
        })
        setGrades(gradesMap)
      }
    } catch (error) {
      console.error('Error loading grades:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addAssignment() {
    try {
      const { data, error } = await api.from('assignments').insert({
        ...newAssignment,
        class_id: classId,
        teacher_id: (await api.auth.getUser()).data.user?.id
      }).select().single()

      if (error) throw error
      
      setAssignments([...assignments, data])
      setShowAddAssignment(false)
      setNewAssignment({ title: '', points_possible: 100 })
    } catch (error) {
      console.error('Error adding assignment:', error)
      alert('Failed to add assignment')
    }
  }

  async function updateGrade(studentId: string, assignmentId: string, grade: string) {
    const numericGrade = parseFloat(grade)
    if (isNaN(numericGrade)) return

    try {
      // Upsert grade in submissions table
      const { error } = await api.from('submissions').upsert({
        student_id: studentId,
        assignment_id: assignmentId,
        grade: numericGrade,
        status: 'graded',
        graded_at: new Date().toISOString()
      }, { onConflict: 'student_id, assignment_id' })

      if (error) throw error

      setGrades(prev => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [assignmentId]: numericGrade
        }
      }))
    } catch (error) {
      console.error('Error updating grade:', error)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading gradebook...</div>

  return (
    <div className="p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gradebook</h2>
          <p className="text-sm text-gray-500">Manage student scores and assignments</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddAssignment(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            + Add Assignment
          </button>
        )}
      </div>

      {showAddAssignment && (
        <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-slideUp">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">New Assignment</h3>
          <div className="flex gap-4">
            <input
              placeholder="Assignment Title"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={newAssignment.title}
              onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
            />
            <input
              type="number"
              placeholder="Max Points"
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={newAssignment.points_possible}
              onChange={e => setNewAssignment({...newAssignment, points_possible: parseInt(e.target.value)})}
            />
            <button onClick={addAssignment} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Add</button>
            <button onClick={() => setShowAddAssignment(false)} className="text-gray-500 text-sm font-bold">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Student Name</th>
              {assignments.map(assignment => (
                <th key={assignment.id} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase text-center min-w-[120px]">
                  {assignment.title}
                  <div className="text-[10px] text-gray-400 font-normal">/{assignment.points_possible}</div>
                </th>
              ))}
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.map((student) => {
              const studentGrades = grades[student.id] || {}
              const totalPossible = assignments.reduce((sum, a) => sum + (a.points_possible || 0), 0)
              const totalScored = assignments.reduce((sum, a) => sum + (studentGrades[a.id] || 0), 0)
              const average = totalPossible > 0 ? (totalScored / totalPossible) * 100 : 0

              return (
                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800 sticky left-0 bg-white z-10">{student.student_name}</td>
                  {assignments.map(assignment => (
                    <td key={assignment.id} className="px-4 py-4 text-center">
                      <input
                        type="number"
                        className={`w-16 text-center border-b border-transparent focus:border-green-500 outline-none transition-colors text-sm ${!canEdit ? 'cursor-default' : ''}`}
                        defaultValue={studentGrades[assignment.id] || ''}
                        readOnly={!canEdit}
                        onBlur={(e) => canEdit && updateGrade(student.id, assignment.id, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center font-bold text-green-600">
                    {average.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
