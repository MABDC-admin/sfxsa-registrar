import { useState } from 'react'

interface Topic {
  id: string
  name: string
}

interface ClassworkItem {
  id: string
  type: 'lesson' | 'material' | 'assignment'
  title: string
  description: string
  topic_id: string
  files: { name: string; url: string }[]
  due_date?: string
  points?: number
  submissions?: { student: string; file: string; submitted_at: string; grade?: number }[]
}

interface Props {
  subjectId: string
}

export function ClassworkTab({ subjectId: _subjectId }: Props) {
  const [topics, setTopics] = useState<Topic[]>([
    { id: '1', name: 'Chapter 1: Introduction' },
    { id: '2', name: 'Chapter 2: Basic Operations' },
  ])
  const [classwork, setClasswork] = useState<ClassworkItem[]>([
    { id: '1', type: 'lesson', title: 'Introduction to Numbers', description: 'Learn about numbers 1-10', topic_id: '1', files: [] },
    { id: '2', type: 'material', title: 'Number Chart', description: 'Reference chart for numbers', topic_id: '1', files: [{ name: 'chart.pdf', url: '#' }] },
    { id: '3', type: 'assignment', title: 'Practice Worksheet', description: 'Complete exercises 1-5', topic_id: '1', files: [], due_date: '2026-01-10', points: 100, submissions: [] },
  ])

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'topic' | 'lesson' | 'material' | 'assignment'>('topic')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic_id: '',
    due_date: '',
    points: 100,
    files: [] as File[]
  })

  const [expandedTopic, setExpandedTopic] = useState<string | null>('1')
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null)

  function openModal(type: 'topic' | 'lesson' | 'material' | 'assignment', item?: any) {
    setModalType(type)
    setEditingItem(item || null)
    setFormData({
      title: item?.title || item?.name || '',
      description: item?.description || '',
      topic_id: item?.topic_id || topics[0]?.id || '',
      due_date: item?.due_date || '',
      points: item?.points || 100,
      files: []
    })
    setShowModal(true)
  }

  function handleSave() {
    if (!formData.title) return

    if (modalType === 'topic') {
      if (editingItem) {
        setTopics(topics.map(t => t.id === editingItem.id ? { ...t, name: formData.title } : t))
      } else {
        setTopics([...topics, { id: Date.now().toString(), name: formData.title }])
      }
    } else {
      const newItem: ClassworkItem = {
        id: editingItem?.id || Date.now().toString(),
        type: modalType,
        title: formData.title,
        description: formData.description,
        topic_id: formData.topic_id,
        files: formData.files.map(f => ({ name: f.name, url: URL.createObjectURL(f) })),
        due_date: modalType === 'assignment' ? formData.due_date : undefined,
        points: modalType === 'assignment' ? formData.points : undefined,
        submissions: editingItem?.submissions || []
      }

      if (editingItem) {
        setClasswork(classwork.map(c => c.id === editingItem.id ? { ...newItem, files: [...(editingItem.files || []), ...newItem.files] } : c))
      } else {
        setClasswork([...classwork, newItem])
      }
    }
    setShowModal(false)
  }

  function handleDelete(type: 'topic' | 'item', id: string) {
    if (!confirm('Delete this item?')) return
    if (type === 'topic') {
      setTopics(topics.filter(t => t.id !== id))
      setClasswork(classwork.filter(c => c.topic_id !== id))
    } else {
      setClasswork(classwork.filter(c => c.id !== id))
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'lesson': return '📖'
      case 'material': return '📎'
      case 'assignment': return '📝'
      default: return '📄'
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'lesson': return '#5B8C51'
      case 'material': return '#6B7280'
      case 'assignment': return '#3B82F6'
      default: return '#5B8C51'
    }
  }

  return (
    <div className="p-6">
      {/* Create Buttons */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => openModal('topic')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">
          📁 Create Topic
        </button>
        <button onClick={() => openModal('lesson')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">
          📖 Add Lesson
        </button>
        <button onClick={() => openModal('material')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">
          📎 Add Material
        </button>
        <button onClick={() => openModal('assignment')} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-medium" style={{ backgroundColor: '#5B8C51' }}>
          📝 Create Assignment
        </button>
      </div>

      {/* Topics & Classwork */}
      <div className="space-y-4">
        {topics.map((topic) => (
          <div key={topic.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Topic Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{expandedTopic === topic.id ? '📂' : '📁'}</span>
                <span className="font-medium text-gray-800">{topic.name}</span>
                <span className="text-sm text-gray-500">
                  ({classwork.filter(c => c.topic_id === topic.id).length} items)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); openModal('topic', topic); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✏️</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete('topic', topic.id); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">🗑️</button>
              </div>
            </div>

            {/* Classwork Items */}
            {expandedTopic === topic.id && (
              <div className="border-t border-gray-100">
                {classwork.filter(c => c.topic_id === topic.id).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: getTypeColor(item.type) }}
                      >
                        {getTypeIcon(item.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.title}</p>
                        <p className="text-sm text-gray-500">
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          {item.due_date && ` • Due: ${new Date(item.due_date).toLocaleDateString()}`}
                          {item.points && ` • ${item.points} pts`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type === 'assignment' && (
                        <button 
                          onClick={() => setViewingSubmissions(item.id)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          {item.submissions?.length || 0} Submissions
                        </button>
                      )}
                      {item.files.length > 0 && (
                        <span className="text-sm text-gray-500">📎 {item.files.length}</span>
                      )}
                      <button onClick={() => openModal(item.type, item)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✏️</button>
                      <button onClick={() => handleDelete('item', item.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">🗑️</button>
                    </div>
                  </div>
                ))}
                {classwork.filter(c => c.topic_id === topic.id).length === 0 && (
                  <div className="p-8 text-center text-gray-500">No items in this topic</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingItem ? 'Edit' : 'Create'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modalType === 'topic' ? 'Topic Name' : 'Title'}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder={modalType === 'topic' ? 'e.g., Chapter 1' : 'Enter title...'}
                />
              </div>

              {modalType !== 'topic' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                    <select
                      value={formData.topic_id}
                      onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                    >
                      {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none resize-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attach Files</label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setFormData({ ...formData, files: Array.from(e.target.files || []) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200"
                    />
                  </div>

                  {modalType === 'assignment' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                          <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                          <input
                            type="number"
                            value={formData.points}
                            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600">
                Cancel
              </button>
              <button onClick={handleSave} className="flex-1 px-4 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: '#5B8C51' }}>
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {viewingSubmissions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Submissions</h2>
              <button onClick={() => setViewingSubmissions(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="space-y-3">
              {classwork.find(c => c.id === viewingSubmissions)?.submissions?.map((sub, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.student}`} alt="" className="w-full h-full" />
                    </div>
                    <div>
                      <p className="font-medium">{sub.student}</p>
                      <p className="text-sm text-gray-500">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={sub.file} className="text-blue-600 text-sm">📎 View File</a>
                    <input
                      type="number"
                      placeholder="Grade"
                      className="w-20 px-3 py-2 border rounded-lg text-center"
                      defaultValue={sub.grade}
                    />
                    <span className="text-gray-500">/ {classwork.find(c => c.id === viewingSubmissions)?.points}</span>
                  </div>
                </div>
              )) || <p className="text-center text-gray-500 py-8">No submissions yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
