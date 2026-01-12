import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/apiClient'
import { useRealtimeSubscription } from '../../hooks'
import { PageHeader, PageContainer, FilterBar } from '../../components/layout'
import {
  DataTable,
  Button,
  FormModal,
  Input,
  LoadingSpinner,
  EmptyState,
  ConfirmDialog,
  useToast,
  Badge,
  type Column
} from '../../components/ui'

interface Subject {
  id: string
  name: string
  code: string
  description: string
  color: string
  icon: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const subjectIcons = ['📗', '🔢', '🔬', '🇵🇭', '🌍', '🎨', '🔧', '💝', '📚', '🎯', '💻', '🎭', '⚽', '🎵']
const subjectColors = ['#667eea', '#f5576c', '#00f2fe', '#38f9d7', '#fee140', '#fed6e3', '#fef9d7', '#66a6ff', '#5B8C51', '#f093fb', '#43e97b', '#fa709a', '#a8edea', '#89f7fe']

export function SubjectsListPage() {
  const toast = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; subject: Subject | null }>({ 
    open: false, 
    subject: null 
  })
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#5B8C51',
    icon: '📚',
    is_active: true
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const loadSubjects = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await api
        .from('subjects')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setSubjects(data || [])
    } catch (error: any) {
      console.error('Error loading subjects:', error)
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  useRealtimeSubscription({ table: 'subjects' }, loadSubjects, [])

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = !searchTerm ||
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = !filters.status || filters.status === '' ||
      (filters.status === 'active' && subject.is_active) ||
      (filters.status === 'inactive' && !subject.is_active)
    
    return matchesSearch && matchesStatus
  })

  function openCreateModal() {
    setEditingSubject(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      color: subjectColors[Math.floor(Math.random() * subjectColors.length)],
      icon: subjectIcons[Math.floor(Math.random() * subjectIcons.length)],
      is_active: true
    })
    setFormErrors({})
    setShowModal(true)
  }

  function openEditModal(subject: Subject) {
    setEditingSubject(subject)
    setFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      color: subject.color,
      icon: subject.icon,
      is_active: subject.is_active
    })
    setFormErrors({})
    setShowModal(true)
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Subject name is required'
    }
    
    if (!formData.code.trim()) {
      errors.code = 'Subject code is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    
    setSaving(true)
    try {
      if (editingSubject) {
        const { error } = await api
          .from('subjects')
          .update({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            color: formData.color,
            icon: formData.icon,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSubject.id)

        if (error) throw error
        toast.success('Subject updated successfully')
      } else {
        const { error } = await api
          .from('subjects')
          .insert({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            color: formData.color,
            icon: formData.icon,
            is_active: formData.is_active
          })

        if (error) throw error
        toast.success('Subject created successfully')
      }

      setShowModal(false)
      loadSubjects()
    } catch (error: any) {
      console.error('Error saving subject:', error)
      toast.error(error.message || 'Failed to save subject')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.subject) return
    
    setDeleting(true)
    try {
      const { error } = await api
        .from('subjects')
        .delete()
        .eq('id', deleteConfirm.subject.id)

      if (error) throw error
      
      toast.success('Subject deleted successfully')
      setDeleteConfirm({ open: false, subject: null })
      loadSubjects()
    } catch (error: any) {
      console.error('Error deleting subject:', error)
      toast.error(error.message || 'Failed to delete subject')
    } finally {
      setDeleting(false)
    }
  }

  async function toggleStatus(subject: Subject) {
    try {
      const { error } = await api
        .from('subjects')
        .update({ 
          is_active: !subject.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', subject.id)

      if (error) throw error
      
      toast.success(`Subject ${subject.is_active ? 'deactivated' : 'activated'}`)
      loadSubjects()
    } catch (error: any) {
      console.error('Error toggling subject status:', error)
      toast.error('Failed to update subject status')
    }
  }

  const columns: Column<Subject>[] = [
    {
      key: 'icon',
      header: '',
      render: (subject: Subject) => (
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: subject.color + '20' }}
        >
          {subject.icon}
        </div>
      )
    },
    {
      key: 'name',
      header: 'Subject Name',
      sortable: true,
      render: (subject: Subject) => (
        <div>
          <div className="font-semibold text-gray-900">{subject.name}</div>
          <div className="text-sm text-gray-500">{subject.code}</div>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (subject: Subject) => (
        <div className="text-sm text-gray-600 max-w-md truncate">
          {subject.description || '—'}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (subject: Subject) => (
        <Badge variant={subject.is_active ? 'success' : 'default'}>
          {subject.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (subject: Subject) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => openEditModal(subject)}
          >
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => toggleStatus(subject)}
          >
            {subject.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500"
            onClick={() => setDeleteConfirm({ open: true, subject })}
          >
            Delete
          </Button>
        </div>
      )
    }
  ]

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Subjects"
        subtitle="Manage all academic subjects"
        icon="📚"
        actions={<Button onClick={openCreateModal} icon="➕">Add Subject</Button>}
      />

      <FilterBar
        filters={[
          { 
            key: 'status', 
            label: 'Status', 
            type: 'select', 
            options: statusOptions, 
            placeholder: 'All Status' 
          }
        ]}
        values={filters}
        onChange={(key, value) => setFilters({ ...filters, [key]: value })}
        onClear={() => setFilters({})}
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Search subjects..."
        className="mb-6"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No subjects found"
          description={searchTerm ? "No subjects match your search." : "Add your first subject to get started."}
          action={!searchTerm && <Button onClick={openCreateModal}>Add Subject</Button>}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filteredSubjects}
            rowKey="id"
          />
          
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredSubjects.length} of {subjects.length} subjects
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
        submitText={editingSubject ? 'Update' : 'Add Subject'}
        submitLoading={saving}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Subject Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            placeholder="e.g., English, Mathematics, Science"
            required
          />
          
          <Input
            label="Subject Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            error={formErrors.code}
            placeholder="e.g., ENG, MATH, SCI"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 outline-none transition-colors resize-none"
              rows={3}
              placeholder="Brief description of the subject"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Icon
              </label>
              <div className="grid grid-cols-7 gap-2">
                {subjectIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                      formData.icon === icon 
                        ? 'bg-primary-500 scale-110' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Color
              </label>
              <div className="grid grid-cols-7 gap-2">
                {subjectColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      formData.color === color 
                        ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active Subject
            </label>
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, subject: null })}
        title="Delete Subject?"
        message={`Are you sure you want to delete "${deleteConfirm.subject?.name}"? This action cannot be undone and may affect associated classes.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}
