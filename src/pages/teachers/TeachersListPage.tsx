import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../../lib/apiClient'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { PageHeader, PageContainer, FilterBar } from '../../components/layout'
import { 
  Button, FormModal, Input, useToast, Badge, Avatar, 
  Card, ConfirmDialog, LoadingSpinner, EmptyState 
} from '../../components/ui'
import { createUser, updateUser, validateUserForm } from '../../lib/userManagement'

interface Teacher {
  id: string
  full_name: string
  email: string
  password: string
  avatar_url: string
  assigned_levels: string[]
  assigned_subjects: string[]
}

const gradeColors: Record<string, string> = {
  'Kindergarten 1': '#E8D5B7',
  'Kindergarten 2': '#F5E1C8',
  'Grade 1': '#F4D03F',
  'Grade 2': '#F8A5C2',
  'Grade 3': '#A8E6CF',
  'Grade 4': '#F4D03F',
  'Grade 5': '#87CEEB',
  'Grade 6': '#F8A5C2',
  'Grade 7': '#DDA0DD',
  'Grade 8': '#DDA0DD',
  'Grade 9': '#87CEEB',
  'Grade 10': '#F8A5C2',
  'Grade 11': '#98D8C8',
  'Grade 12': '#B8A9C9',
}

const gradeLevels = ['Kindergarten 1', 'Kindergarten 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

// Demo teachers data (for reference only)
// const demoTeachers: Teacher[] = [
//   { id: '1', full_name: 'Sarah Mitchell', email: 'sarah.mitchell@school.com', password: 'teacher123', assigned_levels: ['Kindergarten 1'], assigned_subjects: ['English', 'Mathematics'], avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah&backgroundColor=transparent' },
//   { id: '2', full_name: 'Michael Thompson', email: 'michael.thompson@school.com', password: 'teacher123', assigned_levels: ['Kindergarten 2'], assigned_subjects: ['English', 'Science'], avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Michael&backgroundColor=transparent' },
//   { id: '3', full_name: 'Jennifer Garcia', email: 'jennifer.garcia@school.com', password: 'teacher123', assigned_levels: ['Grade 1'], assigned_subjects: ['Mathematics', 'Filipino'], avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jennifer&backgroundColor=transparent' },
//   { id: '4', full_name: 'David Martinez', email: 'david.martinez@school.com', password: 'teacher123', assigned_levels: ['Grade 2'], assigned_subjects: ['Science', 'Social Studies'], avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=David&backgroundColor=transparent' },
// ]

export function TeachersListPage() {
  const toast = useToast()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; teacher: Teacher | null }>({ open: false, teacher: null })
  const [deleting, setDeleting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    assigned_levels: [] as string[],
    assigned_subjects: [] as string[],
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [availableSubjects, setAvailableSubjects] = useState<Array<{id: string, name: string, icon: string, color: string}>>([])
  const [availableGradeLevels, setAvailableGradeLevels] = useState<Array<{id: string, name: string}>>([])

  const loadTeachers = useCallback(async () => {
    setLoading(true)
    try {
      // Load available subjects and grade levels
      const [subjectsRes, gradeLevelsRes] = await Promise.all([
        api.from('subjects').select('id, name, icon, color').eq('is_active', true),
        api.from('grade_levels').select('id, name').eq('is_active', true).order('order_index')
      ])
      
      setAvailableSubjects(subjectsRes.data || [])
      setAvailableGradeLevels(gradeLevelsRes.data || [])

      // Load teachers with their assignments (include inactive for soft-delete visibility)
      const { data, error } = await api
        .from('profiles')
        .select('id, full_name, email, avatar_url, is_active')
        .eq('role', 'teacher')
        .order('full_name')

      if (error) {
        console.error('Error loading teachers from database:', error)
        setTeachers([])
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        // Load teacher assignments
        const teacherIds = data.map((t: any) => t.id)
        const [subjectAssignments, gradeLevelAssignments] = await Promise.all([
          api.from('teacher_subjects').select('teacher_id, subject_id, subjects(name, icon, color)').in('teacher_id', teacherIds),
          api.from('teacher_grade_levels').select('teacher_id, grade_level_id, grade_levels(name)').in('teacher_id', teacherIds)
        ])

        const formattedTeachers = data
          .filter((item: any) => item.is_active !== false) // Only show active teachers
          .map((item: any) => {
            const teacherSubjects = (subjectAssignments.data || []).filter((s: any) => s.teacher_id === item.id)
            const teacherGrades = (gradeLevelAssignments.data || []).filter((g: any) => g.teacher_id === item.id)
            
            return {
              id: item.id,
              full_name: item.full_name,
              email: item.email,
              password: '********',
              avatar_url: item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(item.full_name)}&backgroundColor=transparent`,
              assigned_levels: teacherGrades.map((g: any) => g.grade_levels?.name || '').filter(Boolean),
              assigned_subjects: teacherSubjects.map((s: any) => s.subjects?.name || '').filter(Boolean),
            }
          })
        setTeachers(formattedTeachers)
      } else {
        // No teachers found
        setTeachers([])
      }
    } catch (error) {
      console.error('Error loading teachers:', error)
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTeachers()
  }, [loadTeachers])

  useRealtimeSubscription({ table: 'profiles', filter: 'role=eq.teacher' }, loadTeachers, [])

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = !searchTerm ||
      t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = !filters.grade_level || filters.grade_level === '' ||
      t.assigned_levels.includes(filters.grade_level)
    return matchesSearch && matchesLevel
  })

  function openCreateModal() {
    setEditingTeacher(null)
    setFormData({ full_name: '', email: '', password: '', assigned_levels: [], assigned_subjects: [] })
    setAvatarFile(null)
    setAvatarPreview(null)
    setFormErrors({})
    setShowModal(true)
  }

  function openEditModal(teacher: Teacher) {
    setEditingTeacher(teacher)
    setFormData({
      full_name: teacher.full_name,
      email: teacher.email,
      password: '',
      assigned_levels: teacher.assigned_levels,
      assigned_subjects: teacher.assigned_subjects,
    })
    setAvatarFile(null)
    setAvatarPreview(teacher.avatar_url)
    setFormErrors({})
    setShowModal(true)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  function toggleLevel(levelName: string) {
    const levels = formData.assigned_levels.includes(levelName)
      ? formData.assigned_levels.filter(l => l !== levelName)
      : [...formData.assigned_levels, levelName]
    setFormData({ ...formData, assigned_levels: levels })
  }

  function toggleSubject(subjectName: string) {
    const subs = formData.assigned_subjects.includes(subjectName)
      ? formData.assigned_subjects.filter(s => s !== subjectName)
      : [...formData.assigned_subjects, subjectName]
    setFormData({ ...formData, assigned_subjects: subs })
  }

  function validateForm(): boolean {
    const errors = validateUserForm(formData, !!editingTeacher)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)

    try {
      if (editingTeacher) {
        // Update existing teacher using centralized utility
        await updateUser(
          {
            full_name: formData.full_name,
            email: formData.email,
          },
          {
            userId: editingTeacher.id,
            currentAvatarUrl: editingTeacher.avatar_url,
            avatarFile,
          }
        )

        // Update subject assignments
        await updateTeacherAssignments(editingTeacher.id)
        toast.success('Teacher updated successfully')
      } else {
        // Create new teacher using centralized utility
        const result = await createUser(
          {
            full_name: formData.full_name,
            email: formData.email,
            password: formData.password,
          },
          {
            role: 'teacher',
            avatarFile,
          }
        )

        // Add subject and grade level assignments
        await updateTeacherAssignments(result.user.id)
        toast.success('Teacher added successfully')
      }
      setShowModal(false)
      loadTeachers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save teacher')
    } finally {
      setSaving(false)
    }
  }

  // Helper function to update teacher assignments
  async function updateTeacherAssignments(teacherId: string) {
    // Update subject assignments
    await api.from('teacher_subjects').delete().eq('teacher_id', teacherId)
    if (formData.assigned_subjects.length > 0) {
      const subjectAssignments = await Promise.all(
        formData.assigned_subjects.map(async (subjectName) => {
          const subject = availableSubjects.find(s => s.name === subjectName)
          if (subject) {
            return { teacher_id: teacherId, subject_id: subject.id }
          }
          return null
        })
      )
      const validAssignments = subjectAssignments.filter(Boolean)
      if (validAssignments.length > 0) {
        await api.from('teacher_subjects').insert(validAssignments)
      }
    }

    // Update grade level assignments
    await api.from('teacher_grade_levels').delete().eq('teacher_id', teacherId)
    if (formData.assigned_levels.length > 0) {
      const gradeLevelAssignments = await Promise.all(
        formData.assigned_levels.map(async (levelName) => {
          const gradeLevel = availableGradeLevels.find(g => g.name === levelName)
          if (gradeLevel) {
            return { teacher_id: teacherId, grade_level_id: gradeLevel.id }
          }
          return null
        })
      )
      const validAssignments = gradeLevelAssignments.filter(Boolean)
      if (validAssignments.length > 0) {
        await api.from('teacher_grade_levels').insert(validAssignments)
      }
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.teacher) return
    setDeleting(true)
    try {
      const { error } = await api.from('profiles').update({ is_active: false }).eq('id', deleteConfirm.teacher.id)
      if (error) throw error
      toast.success('Teacher deleted successfully')
      setDeleteConfirm({ open: false, teacher: null })
      loadTeachers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete teacher')
    } finally {
      setDeleting(false)
    }
  }

  const gradeLevelOptions = gradeLevels.map(g => ({ value: g, label: g }))

  return (
    <PageContainer>
      <PageHeader
        title="Teachers"
        subtitle="Manage all teaching staff"
        icon="👨‍🏫"
        actions={<Button onClick={openCreateModal} icon="➕">Add Teacher</Button>}
      />

      <FilterBar
        filters={[{ key: 'grade_level', label: 'Grade Level', type: 'select', options: gradeLevelOptions, placeholder: 'All Levels' }]}
        values={filters}
        onChange={(key, value) => setFilters({ ...filters, [key]: value })}
        onClear={() => setFilters({})}
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Search teachers..."
        className="mb-6"
      />

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : filteredTeachers.length === 0 ? (
        <EmptyState
          icon="👨‍🏫"
          title="No teachers found"
          description="Add your first teacher to get started."
          action={<Button onClick={openCreateModal}>Add Teacher</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTeachers.map((teacher) => {
            const primaryLevel = teacher.assigned_levels[0] || 'Grade 1'
            const bgColor = gradeColors[primaryLevel] || '#E8D5B7'
            return (
              <Card key={teacher.id} hover className="overflow-hidden">
                <div className="h-3 -mx-4 -mt-4 mb-4" style={{ backgroundColor: bgColor }} />
                <div className="flex items-center gap-3 mb-4">
                  <Avatar src={teacher.avatar_url} name={teacher.full_name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{teacher.full_name}</h3>
                    <p className="text-sm text-gray-500 truncate">{teacher.email}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex flex-wrap gap-1">
                    {teacher.assigned_levels.map(lvl => (
                      <Badge key={lvl} size="sm" variant="primary">{lvl}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teacher.assigned_subjects.map(sub => (
                      <Badge key={sub} size="sm" variant="default">{sub}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="ghost" size="sm" fullWidth onClick={() => openEditModal(teacher)}>Edit</Button>
                  <Button variant="ghost" size="sm" fullWidth className="text-red-500" onClick={() => setDeleteConfirm({ open: true, teacher })}>Delete</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        Showing {filteredTeachers.length} of {teachers.length} teachers
      </div>

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        submitText={editingTeacher ? 'Update' : 'Add Teacher'}
        submitLoading={saving}
        size="lg"
      >
        <div className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">📷</div>
              )}
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview ? 'Change Photo' : 'Upload Photo'}
              </Button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 2MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            error={formErrors.full_name}
            placeholder="Enter teacher's full name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
            placeholder="teacher@school.com"
            required
          />
          <Input
            label={editingTeacher ? 'Password (leave blank to keep current)' : 'Password'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={formErrors.password}
            placeholder="••••••••"
            required={!editingTeacher}
          />

          {/* Grade Levels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Grade Levels</label>
            <div className="flex flex-wrap gap-2">
              {availableGradeLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => toggleLevel(level.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.assigned_levels.includes(level.name)
                      ? 'text-white'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={formData.assigned_levels.includes(level.name) ? { backgroundColor: '#5B8C51' } : {}}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Subjects</label>
            <div className="flex flex-wrap gap-2">
              {availableSubjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggleSubject(subject.name)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.assigned_subjects.includes(subject.name)
                      ? 'text-white'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={formData.assigned_subjects.includes(subject.name) ? { backgroundColor: subject.color } : {}}
                >
                  <span>{subject.icon}</span>
                  {subject.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, teacher: null })}
        title="Delete Teacher?"
        message={`Are you sure you want to delete ${deleteConfirm.teacher?.full_name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}
