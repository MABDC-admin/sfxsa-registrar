import { useState } from 'react'

interface Announcement {
  id: string
  content: string
  author: string
  avatar: string
  created_at: string
  comments: { id: string; author: string; content: string; created_at: string }[]
}

interface Props {
  subjectId: string
}

export function AnnouncementsTab({ subjectId: _subjectId }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      content: 'Welcome to Mathematics class! Please make sure to bring your textbooks and notebooks every session.',
      author: 'Mrs. Anderson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anderson',
      created_at: new Date().toISOString(),
      comments: []
    }
  ])
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})

  function handlePost() {
    if (!newAnnouncement.trim()) return
    
    const announcement: Announcement = {
      id: Date.now().toString(),
      content: newAnnouncement,
      author: 'Demo Teacher',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher',
      created_at: new Date().toISOString(),
      comments: []
    }
    setAnnouncements([announcement, ...announcements])
    setNewAnnouncement('')
    setShowInput(false)
  }

  function handleEdit(id: string) {
    const announcement = announcements.find(a => a.id === id)
    if (announcement) {
      setEditingId(id)
      setEditContent(announcement.content)
    }
  }

  function handleSaveEdit() {
    setAnnouncements(announcements.map(a => 
      a.id === editingId ? { ...a, content: editContent } : a
    ))
    setEditingId(null)
  }

  function handleDelete(id: string) {
    if (confirm('Delete this announcement?')) {
      setAnnouncements(announcements.filter(a => a.id !== id))
    }
  }

  function handleAddComment(announcementId: string) {
    const comment = commentInputs[announcementId]
    if (!comment?.trim()) return

    setAnnouncements(announcements.map(a => 
      a.id === announcementId 
        ? { 
            ...a, 
            comments: [...a.comments, { 
              id: Date.now().toString(), 
              author: 'Demo User', 
              content: comment,
              created_at: new Date().toISOString()
            }] 
          }
        : a
    ))
    setCommentInputs({ ...commentInputs, [announcementId]: '' })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Create Announcement */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        {!showInput ? (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-3 w-full text-left text-gray-500 hover:text-gray-700"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher" alt="" className="w-full h-full" />
            </div>
            <span>Announce something to your class...</span>
          </button>
        ) : (
          <div>
            <textarea
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:border-green-500 outline-none resize-none"
              rows={4}
              placeholder="Share an announcement with your class..."
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => { setShowInput(false); setNewAnnouncement(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: '#5B8C51' }}
              >
                Post
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src={announcement.avatar} alt="" className="w-full h-full" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{announcement.author}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(announcement.created_at).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(announcement.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✏️</button>
                  <button onClick={() => handleDelete(announcement.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">🗑️</button>
                </div>
              </div>

              {editingId === announcement.id ? (
                <div className="mt-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:border-green-500 outline-none resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-gray-600">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-3 py-1 rounded-lg text-white" style={{ backgroundColor: '#5B8C51' }}>Save</button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-gray-700">{announcement.content}</p>
              )}
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-100 p-4">
              {announcement.comments.length > 0 && (
                <div className="space-y-3 mb-4">
                  {announcement.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author}`} alt="" className="w-full h-full" />
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-2">
                        <p className="text-sm font-medium">{comment.author}</p>
                        <p className="text-sm text-gray-600">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" alt="" className="w-full h-full" />
                </div>
                <input
                  type="text"
                  value={commentInputs[announcement.id] || ''}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [announcement.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(announcement.id)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:border-green-500 outline-none"
                  placeholder="Add a comment..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
