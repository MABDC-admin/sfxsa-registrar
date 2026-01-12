import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'

interface ClassData {
  id: string
  name: string
  subject_name: string
  description: string
  teacher_name: string
  teacher_email: string
  teacher_avatar: string
  class_code: string
  room: string
  schedule: string
  student_count: number
}

interface Topic {
  id: string
  title: string
  description: string
  order_index: number
}

interface Lesson {
  id: string
  topic_id: string
  title: string
  description: string
}

interface Material {
  id: string
  lesson_id?: string
  topic_id?: string
  title: string
  description: string
  type: string
  file_url: string
  creator_name: string
}

interface Assignment {
  id: string
  topic_id?: string
  title: string
  description: string
  due_date: string
  points_possible: number
  submission_count: number
}

interface Member {
  id: string
  user_id: string
  full_name: string
  email: string
  avatar_url: string
  role: string
  joined_at: string
}

interface Submission {
  id: string
  student_id: string
  student_name: string
  student_email: string
  grade?: number
  status: string
  submitted_at: string
}

export function ClassroomPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'classwork' | 'people' | 'grades'>('classwork')
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  
  // Modals
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  
  useEffect(() => {
    loadClassData()
    loadTopics()
    loadAssignments()
    loadMembers()
  }, [classId])
  
  async function loadClassData() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/api/classroom/classes/${classId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      setClassData(result.data)
    }
  }
  
  async function loadTopics() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/api/classroom/classes/${classId}/topics`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      setTopics(result.data)
      
      // Load lessons for each topic
      result.data.forEach((topic: Topic) => loadLessons(topic.id))
    }
    setLoading(false)
  }
  
  async function loadLessons(topicId: string) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/api/classroom/topics/${topicId}/lessons`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      setLessons(prev => ({ ...prev, [topicId]: result.data }))
    }
  }
  
  async function loadAssignments() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/api/classroom/classes/${classId}/assignments`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      setAssignments(result.data)
    }
  }
  
  async function loadMembers() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/api/classroom/classes/${classId}/members`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      setMembers(result.data)
    }
  }
  
  function toggleTopic(topicId: string) {
    setExpandedTopics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(topicId)) {
        newSet.delete(topicId)
      } else {
        newSet.add(topicId)
      }
      return newSet
    })
  }
  
  async function createTopic(title: string, description: string) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    await fetch(`${apiUrl}/api/classroom/classes/${classId}/topics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, description, order_index: topics.length })
    })
    loadTopics()
    setShowTopicModal(false)
  }
  
  async function createLesson(topicId: string, title: string, description: string) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    await fetch(`${apiUrl}/api/classroom/topics/${topicId}/lessons`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, description, class_id: classId })
    })
    loadLessons(topicId)
    setShowLessonModal(false)
  }
  
  if (loading || !classData) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button 
            onClick={() => navigate('/classes')}
            className="mb-4 text-white/80 hover:text-white flex items-center gap-2"
          >
            ← Back to Classes
          </button>
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          <p className="text-white/90 mt-1">{classData.subject_name}</p>
          <div className="flex items-center gap-6 mt-4 text-sm">
            <span>{classData.room}</span>
            <span>{classData.schedule}</span>
            <span>{classData.student_count} students</span>
            <span className="ml-auto font-mono bg-white/20 px-3 py-1 rounded">Code: {classData.class_code}</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 border-b border-white/20">
            <button
              onClick={() => setActiveTab('classwork')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'classwork' 
                  ? 'border-b-2 border-white text-white' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Classwork
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'people' 
                  ? 'border-b-2 border-white text-white' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              People
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'grades' 
                  ? 'border-b-2 border-white text-white' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Grades
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'classwork' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Classwork</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTopicModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  + Add Topic
                </button>
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Create Assignment
                </button>
              </div>
            </div>
            
            {topics.map(topic => (
              <div key={topic.id} className="bg-white rounded-lg shadow">
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`transform transition-transform ${expandedTopics.has(topic.id) ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{topic.title}</h3>
                      {topic.description && (
                        <p className="text-sm text-gray-600">{topic.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTopicId(topic.id)
                      setShowLessonModal(true)
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    + Add Lesson
                  </button>
                </button>
                
                {expandedTopics.has(topic.id) && (
                  <div className="px-6 pb-4 space-y-3">
                    {lessons[topic.id]?.map(lesson => (
                      <div key={lesson.id} className="ml-8 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium">{lesson.title}</h4>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                        )}
                      </div>
                    ))}
                    
                    {assignments.filter(a => a.topic_id === topic.id).map(assignment => (
                      <div key={assignment.id} className="ml-8 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">📝 {assignment.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                            <div className="flex gap-4 mt-2 text-sm text-gray-500">
                              <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                              <span>{assignment.points_possible} points</span>
                              <span>{assignment.submission_count} submissions</span>
                            </div>
                          </div>
                          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {topics.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No topics yet. Create one to get started!</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'people' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">People</h2>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-4">Teachers</h3>
              <div className="space-y-3">
                {members.filter(m => m.role === 'teacher').map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                    <img 
                      src={member.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.full_name}`}
                      alt={member.full_name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-4">Students ({members.filter(m => m.role === 'student').length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {members.filter(m => m.role === 'student').map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                    <img 
                      src={member.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.full_name}`}
                      alt={member.full_name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'grades' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Grades</h2>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Student</th>
                    {assignments.slice(0, 5).map(a => (
                      <th key={a.id} className="px-4 py-3 text-left text-sm font-semibold">
                        {a.title}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-sm font-semibold">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.filter(m => m.role === 'student').map(member => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={member.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.full_name}`}
                            alt={member.full_name}
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="font-medium">{member.full_name}</span>
                        </div>
                      </td>
                      {assignments.slice(0, 5).map(a => (
                        <td key={a.id} className="px-4 py-4 text-center">
                          <span className="text-gray-400">-</span>
                        </td>
                      ))}
                      <td className="px-6 py-4 text-center font-medium">
                        <span className="text-gray-400">-</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Topic Modal */}
      {showTopicModal && (
        <TopicModal
          onClose={() => setShowTopicModal(false)}
          onSave={(title, description) => createTopic(title, description)}
        />
      )}
      
      {/* Create Lesson Modal */}
      {showLessonModal && (
        <LessonModal
          topicId={selectedTopicId}
          onClose={() => setShowLessonModal(false)}
          onSave={(title, description) => createLesson(selectedTopicId, title, description)}
        />
      )}
    </div>
  )
}

function TopicModal({ onClose, onSave }: { onClose: () => void, onSave: (title: string, desc: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Create Topic</h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Topic title"
          className="w-full px-4 py-2 border rounded-lg mb-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-4 py-2 border rounded-lg mb-4 h-24"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button 
            onClick={() => onSave(title, description)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

function LessonModal({ topicId, onClose, onSave }: { topicId: string, onClose: () => void, onSave: (title: string, desc: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Create Lesson</h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title"
          className="w-full px-4 py-2 border rounded-lg mb-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-4 py-2 border rounded-lg mb-4 h-24"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button 
            onClick={() => onSave(title, description)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
