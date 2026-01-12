import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/apiClient'
import { calculateAge, isNotFutureDate } from '../utils/dateUtils'

interface StudentRecord {
  id: string
  lrn: string
  grade_level: string
  student_name: string
  birth_date: string
  age: number | null
  gender: string
  mother_contact: string
  mothers_maiden_name: string
  father_contact: string
  father: string
  phil_address: string
  uae_address: string
  previous_school: string
  school_year: string
  status: 'Active' | 'Inactive'
  avatar_url: string
  section?: string
  enrolled_at?: string
}

interface Document {
  id: string
  name: string
  file_path: string
  file_type: string
  uploaded_at: string
  uploaded_by: string
  preview_url?: string
}

interface Props {
  student: StudentRecord
  onClose: () => void
  onUpdate?: (updatedStudent: StudentRecord) => void
  gradeColor: string
}

const tabs = [
  { id: 'personal', label: 'Personal Information', icon: '👤' },
  { id: 'academic', label: 'Academic History', icon: '📚' },
  { id: 'subjects', label: 'Subjects', icon: '📖' },
  { id: 'grades', label: 'Grades', icon: '📋' },
  { id: 'documents', label: 'Documents', icon: '📁' },
  { id: 'anecdotal', label: 'Anecdotal/Behavior', icon: '📝' },
]

const gradeAccentColors: { [key: string]: { header: string, accent: string, cardBg: string } } = {
  'Kindergarten': { header: '#00CED1', accent: '#00CED1', cardBg: '#E0FFFF' },
  'Grade 1': { header: '#FFD700', accent: '#FFD700', cardBg: '#FFFACD' },
  'Grade 2': { header: '#FF69B4', accent: '#FF69B4', cardBg: '#FFE4E1' },
  'Grade 3': { header: '#98FB98', accent: '#98FB98', cardBg: '#F0FFF0' },
  'Grade 4': { header: '#FFD700', accent: '#FFD700', cardBg: '#FFFACD' },
  'Grade 5': { header: '#87CEEB', accent: '#87CEEB', cardBg: '#E6F3FF' },
  'Grade 6': { header: '#DDA0DD', accent: '#DDA0DD', cardBg: '#FFF0F5' },
  'Grade 7': { header: '#DDA0DD', accent: '#DDA0DD', cardBg: '#FFF0F5' },
  'Grade 8': { header: '#DDA0DD', accent: '#DDA0DD', cardBg: '#E6E6FA' },
  'Grade 9': { header: '#87CEEB', accent: '#87CEEB', cardBg: '#E6F3FF' },
  'Grade 10': { header: '#F8A5C2', accent: '#F8A5C2', cardBg: '#FFE4E1' },
  'Grade 11': { header: '#98D8C8', accent: '#98D8C8', cardBg: '#E0FFFF' },
  'Grade 12': { header: '#B8A9C9', accent: '#B8A9C9', cardBg: '#E6E6FA' },
}

export function StudentDetailModal({ student: initialStudent, onClose, onUpdate, gradeColor }: Props) {
  const [student, setStudent] = useState<StudentRecord>(initialStudent)
  const [activeTab, setActiveTab] = useState('personal')
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [docName, setDocName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ ...initialStudent })
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  // Update age dynamically when birth_date changes
  useEffect(() => {
    if (isEditing) {
      const newAge = calculateAge(editForm.birth_date)
      if (newAge !== editForm.age) {
        setEditForm(prev => ({ ...prev, age: newAge }))
      }
    }
  }, [editForm.birth_date, isEditing])

  // Load student documents from database
  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/student-documents/student/${student.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            // Transform to match Document interface
            const docs: Document[] = result.data.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              file_path: doc.file_path,
              file_type: doc.file_type,
              uploaded_at: doc.created_at,
              uploaded_by: doc.uploaded_by_name || 'Admin',
              preview_url: `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/storage/v1/${doc.file_path}`
            }))
            setDocuments(docs)
          }
        }
      } catch (err) {
        console.error('Error loading documents:', err)
      }
    }
    
    loadDocuments()
  }, [student.id])

  const colors = gradeAccentColors[student.grade_level] || { header: '#00CED1', accent: '#00CED1', cardBg: '#E0FFFF' }

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Check if file is an image
  const isImage = (fileType: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileType.toLowerCase())
  }

  // Get document preview URL
  const getPreviewUrl = (doc: Document) => {
    if (doc.file_path.startsWith('db/')) {
      const blobId = doc.file_path.split('/')[1]
      return `${api.storage.from('db').getPublicUrl(blobId).data.publicUrl}`
    }
    const { data } = api.storage.from('avatars').getPublicUrl(doc.file_path)
    return data.publicUrl
  }

  // Handle avatar file selection and upload
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setAvatarUploading(true)
    try {
      // Upload to database-backed storage
      const { data: uploadData, error: uploadError } = await api.storage
        .from('db')
        .upload(file.name, file)

      if (uploadError) {
        alert('Avatar upload failed: ' + uploadError.message)
        setAvatarUploading(false)
        return
      }

      // Get the persistent URL from our backend
      const { data: urlData } = api.storage.from('db').getPublicUrl(uploadData.path)
      const newAvatarUrl = urlData.publicUrl

      // Update in database student_records table (photo_url column)
      const { error: updateError } = await api
        .from('student_records')
        .update({ photo_url: newAvatarUrl })
        .eq('id', student.id)

      if (!updateError) {
        setStudent({ ...student, avatar_url: newAvatarUrl })
        setEditForm({ ...editForm, avatar_url: newAvatarUrl })
        onUpdate?.({ ...student, avatar_url: newAvatarUrl })
      } else {
        alert('Failed to update student record: ' + updateError.message)
      }
    } catch (err) {
      console.error('Avatar upload error:', err)
    }
    setAvatarUploading(false)
  }

  // Handle file selection for documents
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setDocName(file.name.split('.')[0])
    }
  }

  // Upload document
  const handleUploadDocument = async () => {
    if (!selectedFile || !docName) return

    setUploading(true)
    try {
      const fileExt = selectedFile.name.split('.').pop() || 'unknown'
      
      // Upload to database-backed storage
      const { data: uploadData, error: uploadError } = await api.storage
        .from('db')
        .upload(selectedFile.name, selectedFile)

      if (uploadError) {
        alert('Upload failed: ' + uploadError.message)
        setUploading(false)
        return
      }

      const blobId = uploadData.path
      const { data: urlData } = api.storage.from('db').getPublicUrl(blobId)

      // Save document metadata to student_documents table
      const docData = {
        name: docName,
        category: 'general',
        file_path: `db/${blobId}`,
        file_type: fileExt,
        file_size: selectedFile.size,
        blob_id: blobId
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/student-documents/student/${student.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(docData)
      })

      if (!response.ok) {
        throw new Error('Failed to save document metadata')
      }

      const result = await response.json()
      
      const newDoc: Document = {
        id: result.data.id,
        name: docName,
        file_path: `db/${blobId}`,
        file_type: fileExt,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'Admin',
        preview_url: urlData.publicUrl
      }
      
      setDocuments([...documents, newDoc])
      setShowUploadModal(false)
      setSelectedFile(null)
      setDocName('')
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload error: ' + (err as Error).message)
    }
    setUploading(false)
  }

  // Delete document
  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return

    try {
      // Delete from database first
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/student-documents/${doc.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      // Remove from local state
      setDocuments(documents.filter(d => d.id !== doc.id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete document: ' + (err as Error).message)
    }
  }

  // Save edited student info
  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const { error } = await api
        .from('student_records')
        .update({
          student_name: editForm.student_name,
          gender: editForm.gender,
          birth_date: editForm.birth_date,
          age: editForm.age,
          mother_contact: editForm.mother_contact,
          mothers_maiden_name: editForm.mothers_maiden_name,
          father_contact: editForm.father_contact,
          father: editForm.father,
          uae_address: editForm.uae_address,
          phil_address: editForm.phil_address,
        })
        .eq('id', student.id)

      if (error) {
        alert('Failed to save: ' + error.message)
      } else {
        setStudent({ ...student, ...editForm })
        onUpdate?.({ ...student, ...editForm })
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Save error:', err)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 overflow-y-auto py-6">
      <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-5xl mx-4 shadow-2xl animate-fadeIn">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            ← Back to Students
          </button>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
              🖨️ Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
              📤 Export
            </button>
          </div>
        </div>

        {/* Student Header with Grade Color */}
        <div className="p-6 relative" style={{ background: gradeColor }}>
          <div className="flex items-center gap-6">
            {/* Avatar with upload */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 bg-white/20 transition-transform group-hover:scale-105">
                {avatarUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
                    <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <img src={student.avatar_url} alt={student.student_name} className="w-full h-full object-cover" />
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-all hover:scale-110"
              >
                📷
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{student.student_name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                  {student.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-700">
                <span>{student.lrn}</span>
                <span>•</span>
                <span>{student.grade_level}</span>
                <span>•</span>
                <span>{student.section || 'MABDC'}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-700 mt-1">
                <span className="flex items-center gap-1">📞 {student.mother_contact || 'N/A'}</span>
                <span className="flex items-center gap-1">📅 Enrolled: {formatDate(student.enrolled_at || '2025-12-17')}</span>
              </div>
            </div>

            {/* Current Average */}
            <div className="text-right">
              <div className="text-sm text-gray-700">Current Average</div>
              <div className="text-3xl font-bold text-gray-900">--</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <div className="flex gap-1 px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'personal' && (
            <div className="animate-fadeIn">
              {/* Edit Button */}
              <div className="flex justify-end mb-4 gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => { setIsEditing(false); setEditForm({ ...student }); }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                    >
                      ✖️ Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#5B8C51' }}
                    >
                      {saving ? '💾 Saving...' : '💾 Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {/* Basic Information */}
              <div className="rounded-xl p-5 mb-6 relative overflow-hidden transition-all" style={{ backgroundColor: colors.accent }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">👤</span>
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-700/70">Full Name</div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.student_name}
                        onChange={(e) => setEditForm({ ...editForm, student_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/50 border border-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    ) : (
                      <div className="font-medium text-gray-900">{student.student_name}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-700/70">LRN</div>
                    <div className="font-medium text-gray-900">{student.lrn}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700/70">Gender</div>
                    {isEditing ? (
                      <select
                        value={editForm.gender || ''}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/50 border border-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="">Select</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    ) : (
                      <div className="font-medium text-gray-900">{student.gender || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-700/70">Age</div>
                    <div className="font-medium text-gray-900">{student.age ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700/70">Birth Date</div>
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="date"
                          value={editForm.birth_date || ''}
                          onChange={(e) => {
                            if (!isNotFutureDate(e.target.value)) {
                              alert('Birthdate cannot be in the future')
                              return
                            }
                            setEditForm({ ...editForm, birth_date: e.target.value })
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/50 border border-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        {editForm.birth_date && (
                          <div className="text-xs text-cyan-700 font-medium">
                            Calculated Age: {calculateAge(editForm.birth_date)} yrs
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="font-medium text-gray-900">{formatDate(student.birth_date)}</div>
                    )}
                  </div>
                </div>
                <div className="absolute right-4 top-4 opacity-30">
                  <img src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${student.student_name}1&backgroundColor=transparent`} className="w-16 h-16" alt="" />
                </div>
              </div>

              {/* Parents/Guardian */}
              <div className="rounded-xl p-5 mb-6 relative overflow-hidden transition-all" style={{ backgroundColor: '#DA70D6' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">👨‍👩‍👧</span>
                  <h3 className="text-lg font-semibold text-white">Parents/Guardian</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-purple-200">Father's Name</div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.father || ''}
                        onChange={(e) => setEditForm({ ...editForm, father: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/20 border border-purple-300 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
                      />
                    ) : (
                      <div className="font-medium text-white">{student.father || 'N/A'}</div>
                    )}
                    <div className="text-sm text-purple-200 mt-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.father_contact || ''}
                          onChange={(e) => setEditForm({ ...editForm, father_contact: e.target.value })}
                          placeholder="📞 Contact"
                          className="w-full px-3 py-2 rounded-lg bg-white/20 border border-purple-300 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
                        />
                      ) : (
                        <span>📞 {student.father_contact || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-purple-200">Mother's Name</div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.mothers_maiden_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, mothers_maiden_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/20 border border-purple-300 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
                      />
                    ) : (
                      <div className="font-medium text-white">{student.mothers_maiden_name || 'N/A'}</div>
                    )}
                    <div className="text-sm text-purple-200 mt-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.mother_contact || ''}
                          onChange={(e) => setEditForm({ ...editForm, mother_contact: e.target.value })}
                          placeholder="📞 Contact"
                          className="w-full px-3 py-2 rounded-lg bg-white/20 border border-purple-300 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white"
                        />
                      ) : (
                        <span>📞 {student.mother_contact || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute right-4 top-4 opacity-30">
                  <img src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${student.student_name}2&backgroundColor=transparent`} className="w-16 h-16" alt="" />
                </div>
              </div>

              {/* Address Information */}
              <div className="rounded-xl p-5 relative overflow-hidden transition-all" style={{ backgroundColor: '#FFD700' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📍</span>
                  <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-yellow-700">UAE Address</div>
                    {isEditing ? (
                      <textarea
                        value={editForm.uae_address || ''}
                        onChange={(e) => setEditForm({ ...editForm, uae_address: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/50 border border-yellow-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-600 resize-none"
                        rows={2}
                      />
                    ) : (
                      <div className="font-medium text-gray-900">{student.uae_address || 'N/A'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-yellow-700">Philippine Address</div>
                    {isEditing ? (
                      <textarea
                        value={editForm.phil_address || ''}
                        onChange={(e) => setEditForm({ ...editForm, phil_address: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/50 border border-yellow-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-600 resize-none"
                        rows={2}
                      />
                    ) : (
                      <div className="font-medium text-gray-900">{student.phil_address || 'N/A'}</div>
                    )}
                  </div>
                </div>
                <div className="absolute right-4 top-4 opacity-30">
                  <img src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${student.student_name}3&backgroundColor=transparent`} className="w-16 h-16" alt="" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="text-center py-12 text-gray-400 animate-fadeIn">
              <div className="text-5xl mb-4">📚</div>
              <p>Academic History will be shown here</p>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="text-center py-12 text-gray-400 animate-fadeIn">
              <div className="text-5xl mb-4">📖</div>
              <p>Enrolled subjects will be shown here</p>
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="text-center py-12 text-gray-400 animate-fadeIn">
              <div className="text-5xl mb-4">📋</div>
              <p>Student grades will be shown here</p>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="animate-fadeIn">
              {/* Upload Button */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Student Documents</h3>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-all hover:scale-105"
                  style={{ backgroundColor: '#5B8C51' }}
                >
                  + Upload Document
                </button>
              </div>

              {/* Documents Grid with Preview */}
              {documents.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {documents.map((doc, index) => (
                    <div
                      key={doc.id}
                      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Preview */}
                      <div
                        className="h-32 bg-gray-700 flex items-center justify-center overflow-hidden relative"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        {isImage(doc.file_type) ? (
                          <img
                            src={getPreviewUrl(doc)}
                            alt={doc.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                            {doc.file_type === 'pdf' ? '📄' : '📎'}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full transition-opacity">
                            👁️ Preview
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="font-medium text-white truncate text-sm">{doc.name}</p>
                        <p className="text-xs text-gray-400 mb-2">{doc.file_type.toUpperCase()} • {formatDate(doc.uploaded_at)}</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => window.open(getPreviewUrl(doc), '_blank')}
                            className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs transition-colors"
                          >
                            📥
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc)}
                            className="px-2 py-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-400 text-xs transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-600">
                  <div className="text-6xl mb-4 animate-bounce">📁</div>
                  <p className="text-gray-400 mb-4">No documents uploaded yet</p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-6 py-3 rounded-xl text-white font-medium transition-all hover:scale-105"
                    style={{ backgroundColor: '#5B8C51' }}
                  >
                    Upload First Document
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'anecdotal' && (
            <div className="text-center py-12 text-gray-400 animate-fadeIn">
              <div className="text-5xl mb-4">📝</div>
              <p>Anecdotal records and behavior notes will be shown here</p>
            </div>
          )}
        </div>

        {/* Upload Document Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-gray-700 animate-scaleIn">
              <h2 className="text-xl font-bold text-white mb-4">📤 Upload Document</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Document Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white focus:border-cyan-500 outline-none transition-colors"
                    placeholder="e.g., Birth Certificate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Select File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-6 rounded-xl bg-gray-800 border-2 border-gray-600 border-dashed text-gray-400 hover:bg-gray-700 hover:border-cyan-500 transition-all"
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">📎</span>
                        <span className="text-white">{selectedFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl mb-2">📁</div>
                        <div>Click to select file</div>
                      </div>
                    )}
                  </button>
                </div>

                {/* Preview for images */}
                {selectedFile && selectedFile.type.startsWith('image/') && (
                  <div className="rounded-xl overflow-hidden h-32 bg-gray-800">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); setDocName(''); }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadDocument}
                  disabled={uploading || !selectedFile || !docName}
                  className="flex-1 px-4 py-3 rounded-xl text-white font-medium disabled:opacity-50 transition-all hover:scale-105"
                  style={{ backgroundColor: '#5B8C51' }}
                >
                  {uploading ? '⏳ Uploading...' : '📤 Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        {previewDoc && (
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-fadeIn"
            onClick={() => setPreviewDoc(null)}
          >
            <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewDoc(null)}
                className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
              {isImage(previewDoc.file_type) ? (
                <img
                  src={getPreviewUrl(previewDoc)}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[85vh] rounded-xl shadow-2xl animate-scaleIn"
                />
              ) : (
                <div className="bg-gray-800 rounded-xl p-12 text-center animate-scaleIn">
                  <div className="text-8xl mb-4">{previewDoc.file_type === 'pdf' ? '📄' : '📎'}</div>
                  <p className="text-white text-xl font-medium mb-2">{previewDoc.name}</p>
                  <p className="text-gray-400 mb-6">{previewDoc.file_type.toUpperCase()} file</p>
                  <button
                    onClick={() => window.open(getPreviewUrl(previewDoc), '_blank')}
                    className="px-6 py-3 rounded-xl text-white font-medium"
                    style={{ backgroundColor: '#5B8C51' }}
                  >
                    📥 Download to View
                  </button>
                </div>
              )}
              <p className="text-center text-white mt-4 font-medium">{previewDoc.name}</p>
            </div>
          </div>
        )}

        {/* CSS Animations */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
          .animate-scaleIn {
            animation: scaleIn 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  )
}
