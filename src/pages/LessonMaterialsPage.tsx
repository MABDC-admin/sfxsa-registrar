/**
 * Lesson Materials Management Page
 * Teachers can upload documents, videos, and resources
 * Students can view and access lesson materials
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/apiClient'
import { FileUpload } from '../components/FileUpload'
import { YouTubeInput, YouTubeEmbed } from '../components/YouTubeEmbed'
import { formatFileSize, getFileIcon } from '../lib/fileUpload'
import type { FileUploadResult } from '../lib/fileUpload'

interface LessonMaterial {
  id: string
  title: string
  description: string
  subject_id: string
  subject_name?: string
  grade_level: string
  teacher_id: string
  teacher_name?: string
  file_url: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  video_url: string | null
  youtube_embed_id: string | null
  content_type: 'document' | 'video' | 'image' | 'link'
  school_year: string
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
}

interface Subject {
  id: string
  name: string
  icon?: string
  color?: string
}

const GRADE_LEVELS = [
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
]

export default function LessonMaterialsPage() {
  const { profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'

  const [materials, setMaterials] = useState<LessonMaterial[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<LessonMaterial | null>(null)
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    grade_level: 'Grade 1',
    content_type: 'document' as 'document' | 'video' | 'image' | 'link',
    file_url: '',
    file_name: '',
    file_type: '',
    file_size: 0,
    youtube_embed_id: '',
    video_url: '',
    is_published: true,
  })

  const loadMaterials = useCallback(async () => {
    setLoading(true)
    try {
      console.log('🔄 Loading lesson materials...')
      
      // First, load all materials
      const { data: materialsData, error: materialsError } = await api
        .from('lesson_materials')
        .select('*')
        .order('created_at', { ascending: false })

      if (materialsError) {
        console.error('❌ Error loading lesson materials:', materialsError)
        throw materialsError
      }

      console.log('✅ Loaded lesson materials:', materialsData)

      if (!materialsData || materialsData.length === 0) {
        setMaterials([])
        return
      }

      // Load subjects and teachers separately
      const subjectIds = [...new Set(materialsData.map((m: any) => m.subject_id).filter(Boolean))]
      const teacherIds = [...new Set(materialsData.map((m: any) => m.teacher_id).filter(Boolean))]

      const [subjectsRes, teachersRes] = await Promise.all([
        subjectIds.length > 0 
          ? api.from('subjects').select('id, name, icon, color').in('id', subjectIds)
          : Promise.resolve({ data: [], error: null }),
        teacherIds.length > 0
          ? api.from('profiles').select('id, full_name').in('id', teacherIds)
          : Promise.resolve({ data: [], error: null })
      ])

      const subjectsMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s]))
      const teachersMap = new Map((teachersRes.data || []).map((t: any) => [t.id, t]))

      const formatted = materialsData.map((item: any) => {
        const subject: any = subjectsMap.get(item.subject_id)
        const teacher: any = teachersMap.get(item.teacher_id)
        
        return {
          ...item,
          subject_name: subject?.name || 'Unknown',
          subject_icon: subject?.icon,
          subject_color: subject?.color,
          teacher_name: teacher?.full_name || 'Unknown',
        }
      })

      console.log('📦 Formatted materials:', formatted)
      setMaterials(formatted)
    } catch (error) {
      console.error('💥 Failed to load lesson materials:', error)
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSubjects = useCallback(async () => {
    try {
      const { data, error } = await api
        .from('subjects')
        .select('id, name, icon, color')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error loading subjects:', error)
    }
  }, [])

  useEffect(() => {
    loadMaterials()
    loadSubjects()
  }, [loadMaterials, loadSubjects])

  const handleFileUploadComplete = (results: FileUploadResult[]) => {
    if (results.length > 0 && results[0].success) {
      setForm((prev) => ({
        ...prev,
        file_url: results[0].fileUrl || '',
        file_name: results[0].fileName || '',
        file_type: results[0].fileType || '',
        file_size: results[0].fileSize || 0,
      }))
    }
  }

  const handleYouTubeSelect = (videoId: string, url: string) => {
    setForm((prev) => ({
      ...prev,
      youtube_embed_id: videoId,
      video_url: url,
    }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('Title is required')
      return
    }

    if (!form.subject_id) {
      alert('Please select a subject')
      return
    }

    console.log('💾 Saving lesson material...', form)

    setSaving(true)
    try {
      const materialData = {
        title: form.title,
        description: form.description,
        subject_id: form.subject_id,
        grade_level: form.grade_level,
        teacher_id: profile?.id,
        content_type: form.content_type,
        file_url: form.file_url || null,
        file_name: form.file_name || null,
        file_type: form.file_type || null,
        file_size: form.file_size || null,
        video_url: form.video_url || null,
        youtube_embed_id: form.youtube_embed_id || null,
        is_published: form.is_published,
        school_year: '2025-2026',
      }

      console.log('📤 Material data to save:', materialData)

      if (editingMaterial) {
        const { data, error } = await api
          .from('lesson_materials')
          .update(materialData)
          .eq('id', editingMaterial.id)

        console.log('📝 Update result:', { data, error })
        if (error) throw error
        alert('Material updated successfully!')
      } else {
        const { data, error } = await api
          .from('lesson_materials')
          .insert(materialData)

        console.log('➕ Insert result:', { data, error })
        if (error) throw error
        alert('Material added successfully!')
      }

      setShowAddModal(false)
      setEditingMaterial(null)
      resetForm()
      await loadMaterials()
    } catch (error: any) {
      console.error('💥 Error saving material:', error)
      alert(error.message || 'Failed to save material')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (material: LessonMaterial) => {
    setEditingMaterial(material)
    setForm({
      title: material.title,
      description: material.description,
      subject_id: material.subject_id,
      grade_level: material.grade_level,
      content_type: material.content_type,
      file_url: material.file_url || '',
      file_name: material.file_name || '',
      file_type: material.file_type || '',
      file_size: material.file_size || 0,
      youtube_embed_id: material.youtube_embed_id || '',
      video_url: material.video_url || '',
      is_published: material.is_published,
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return

    try {
      const { error } = await api
        .from('lesson_materials')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('Material deleted successfully!')
      loadMaterials()
    } catch (error: any) {
      console.error('Error deleting material:', error)
      alert(error.message || 'Failed to delete material')
    }
  }

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      subject_id: '',
      grade_level: 'Grade 1',
      content_type: 'document',
      file_url: '',
      file_name: '',
      file_type: '',
      file_size: 0,
      youtube_embed_id: '',
      video_url: '',
      is_published: true,
    })
  }

  // Filtered materials
  const filteredMaterials = materials.filter((material) => {
    if (filterSubject !== 'all' && material.subject_id !== filterSubject) return false
    if (filterGrade !== 'all' && material.grade_level !== filterGrade) return false
    if (filterType !== 'all' && material.content_type !== filterType) return false
    if (!isTeacher && !material.is_published) return false
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 Lesson Materials</h1>
          <p className="text-gray-600 mt-1">
            {isTeacher ? 'Upload and manage educational resources' : 'Browse and access learning materials'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => {
              resetForm()
              setEditingMaterial(null)
              setShowAddModal(true)
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            ➕ Add Material
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.icon} {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">All Grades</option>
              {GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">All Types</option>
              <option value="document">📄 Documents</option>
              <option value="video">🎬 Videos</option>
              <option value="image">🖼️ Images</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading materials...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No materials found</h3>
          <p className="text-gray-600">
            {isTeacher ? 'Start by adding your first lesson material' : 'Check back later for new content'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              isTeacher={isTeacher}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMaterials.map((material) => (
            <MaterialListItem
              key={material.id}
              material={material}
              isTeacher={isTeacher}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
              </h2>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g., Introduction to Algebra"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Brief description of the material..."
                />
              </div>

              {/* Subject & Grade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <select
                    value={form.subject_id}
                    onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.icon} {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                  <select
                    value={form.grade_level}
                    onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {GRADE_LEVELS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['document', 'video', 'image'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, content_type: type })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        form.content_type === type
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">
                        {type === 'document' ? '📄' : type === 'video' ? '🎬' : '🖼️'}
                      </div>
                      <div className="text-sm font-medium capitalize">{type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload or YouTube */}
              {form.content_type === 'video' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm text-gray-600">Upload video file or paste YouTube link</span>
                  </div>
                  <YouTubeInput
                    onVideoSelect={handleYouTubeSelect}
                    initialUrl={form.video_url}
                  />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR</span>
                    </div>
                  </div>
                  <FileUpload
                    userId={profile?.id || ''}
                    folder="lessons"
                    category="video"
                    onUploadComplete={handleFileUploadComplete}
                  />
                </div>
              ) : (
                <FileUpload
                  userId={profile?.id || ''}
                  folder="lessons"
                  category={form.content_type === 'image' ? 'image' : 'document'}
                  onUploadComplete={handleFileUploadComplete}
                />
              )}

              {/* Published Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
                  Publish immediately (visible to students)
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingMaterial(null)
                  resetForm()
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingMaterial ? 'Update' : 'Add Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Material Card Component (Grid View)
function MaterialCard({
  material,
  isTeacher,
  onEdit,
  onDelete,
}: {
  material: LessonMaterial
  isTeacher: boolean
  onEdit: (material: LessonMaterial) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="h-40 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
        {material.youtube_embed_id ? (
          <YouTubeEmbed videoId={material.youtube_embed_id} className="h-full" />
        ) : (
          <div className="text-6xl">
            {material.content_type === 'document'
              ? getFileIcon(material.file_type || '')
              : material.content_type === 'video'
              ? '🎬'
              : '🖼️'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{material.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>

        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>📚 {material.subject_name}</span>
            <span>•</span>
            <span>{material.grade_level}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>👤 {material.teacher_name}</span>
          </div>
          {material.file_size && (
            <div className="flex items-center gap-2">
              <span>📦 {formatFileSize(material.file_size)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span>👁️ {material.view_count} views</span>
          </div>
        </div>

        {!material.is_published && (
          <div className="mt-3 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
            Draft
          </div>
        )}
      </div>

      {/* Actions */}
      {isTeacher && (
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => onEdit(material)}
            className="flex-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(material.id)}
            className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// Material List Item Component (List View)
function MaterialListItem({
  material,
  isTeacher,
  onEdit,
  onDelete,
}: {
  material: LessonMaterial
  isTeacher: boolean
  onEdit: (material: LessonMaterial) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="text-4xl">
          {material.content_type === 'document'
            ? getFileIcon(material.file_type || '')
            : material.content_type === 'video'
            ? '🎬'
            : '🖼️'}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">{material.title}</h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-1">{material.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>📚 {material.subject_name}</span>
            <span>{material.grade_level}</span>
            <span>👤 {material.teacher_name}</span>
            {material.file_size && <span>📦 {formatFileSize(material.file_size)}</span>}
            <span>👁️ {material.view_count} views</span>
            {!material.is_published && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">Draft</span>
            )}
          </div>
        </div>

        {isTeacher && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(material)}
              className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(material.id)}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
