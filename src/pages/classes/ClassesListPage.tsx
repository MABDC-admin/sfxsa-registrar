import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/apiClient'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { PageHeader, PageContainer, FilterBar } from '../../components/layout'
import { 
  Button, DataTable, FormModal, Input, Select, 
  useToast, Badge, ConfirmDialog, Card
} from '../../components/ui'
import type { Column } from '../../components/ui'

interface ClassItem {
  id: string
  name: string
  grade_level: string
  section: string
  teacher_name: string
  room: string
  schedule: string
  max_students: number
  student_count: number
  is_active: boolean
}

const gradeLevelOptions = [
  { value: 'Kindergarten', label: 'Kindergarten' },
  { value: 'Grade 1', label: 'Grade 1' },
  { value: 'Grade 2', label: 'Grade 2' },
  { value: 'Grade 3', label: 'Grade 3' },
  { value: 'Grade 4', label: 'Grade 4' },
  { value: 'Grade 5', label: 'Grade 5' },
  { value: 'Grade 6', label: 'Grade 6' },
  { value: 'Grade 7', label: 'Grade 7' },
  { value: 'Grade 8', label: 'Grade 8' },
  { value: 'Grade 9', label: 'Grade 9' },
  { value: 'Grade 10', label: 'Grade 10' },
  { value: 'Grade 11', label: 'Grade 11' },
  { value: 'Grade 12', label: 'Grade 12' },
]

export function ClassesListPage() {
  const toast = useToast()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; item: ClassItem | null }>({ open: false, item: null })
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [formData, setFormData] = useState({
    name: '',
    grade_level: 'Grade 1',
    section: '',
    room: '',
    schedule: '',
    max_students: 40,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const loadClasses = useCallback(async () => {
    setLoading(true)
    const { data } = await api
      .from('classes')
      .select('*')
      .order('name')

    if (data) {
      const formattedClasses: ClassItem[] = data.map((row: any) => ({
        id: row.id,
        name: row.name || '',
        grade_level: row.grade_level || 'Grade 1',
        section: row.section || '',
        teacher_name: row.teacher_name || 'Unassigned',
        room: row.room || '',
        schedule: row.schedule || '',
        max_students: row.max_students || 40,
        student_count: row.student_count || 0,
        is_active: row.is_active !== false,
      }))
      setClasses(formattedClasses)
    } else {
      setClasses([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useRealtimeSubscription({ table: 'classes' }, loadClasses, [])

  const filteredClasses = classes.filter(c => {
    const matchesSearch = !searchTerm || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGrade = !filters.grade_level || filters.grade_level === '' || c.grade_level === filters.grade_level
    return matchesSearch && matchesGrade
  })

  function openCreateModal() {
    setEditingClass(null)
    setFormData({ name: '', grade_level: 'Grade 1', section: '', room: '', schedule: '', max_students: 40 })
    setFormErrors({})
    setShowModal(true)
  }

  function openEditModal(cls: ClassItem) {
    setEditingClass(cls)
    setFormData({
      name: cls.name,
      grade_level: cls.grade_level,
      section: cls.section,
      room: cls.room,
      schedule: cls.schedule,
      max_students: cls.max_students,
    })
    setFormErrors({})
    setShowModal(true)
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Class name is required'
    if (!formData.grade_level) errors.grade_level = 'Grade level is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)

    try {
      if (editingClass) {
        const { error } = await api
          .from('classes')
          .update({
            name: formData.name,
            grade_level: formData.grade_level,
            section: formData.section,
            room: formData.room,
            schedule: formData.schedule,
            max_students: formData.max_students,
          })
          .eq('id', editingClass.id)

        if (error) throw error
        toast.success('Class updated successfully')
      } else {
        const { error } = await api
          .from('classes')
          .insert({
            name: formData.name,
            grade_level: formData.grade_level,
            section: formData.section,
            room: formData.room,
            schedule: formData.schedule,
            max_students: formData.max_students,
            school_year: '2025-2026',
            is_active: true,
          })

        if (error) throw error
        toast.success('Class added successfully')
      }
      setShowModal(false)
      loadClasses()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save class')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.item) return
    setDeleting(true)

    try {
      const { error } = await api
        .from('classes')
        .delete()
        .eq('id', deleteConfirm.item.id)

      if (error) throw error
      toast.success('Class deleted successfully')
      setDeleteConfirm({ open: false, item: null })
      loadClasses()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete class')
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<ClassItem>[] = [
    {
      key: 'name',
      header: 'Class Name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.section || 'No section'}</p>
        </div>
      ),
    },
    {
      key: 'grade_level',
      header: 'Grade',
      render: (row) => <Badge variant="primary">{row.grade_level}</Badge>,
    },
    {
      key: 'teacher_name',
      header: 'Teacher',
      render: (row) => row.teacher_name || '-',
    },
    {
      key: 'room',
      header: 'Room',
      render: (row) => row.room || '-',
    },
    {
      key: 'student_count',
      header: 'Students',
      render: (row) => `${row.student_count}/${row.max_students}`,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'default'} dot>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(row) }}
            className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 text-primary-600"
            style={{ color: '#5B8C51' }}
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, item: row }) }}
            className="px-3 py-1 text-sm rounded-lg hover:bg-red-50 text-red-500"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Classes"
        subtitle="Manage class sections and assignments"
        icon="📚"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'table' ? 'bg-gray-100' : ''}`}
              >
                📋
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                📦
              </button>
            </div>
            <Button onClick={openCreateModal} icon="➕">
              Add Class
            </Button>
          </div>
        }
      />

      <FilterBar
        filters={[
          { key: 'grade_level', label: 'Grade', type: 'select', options: gradeLevelOptions, placeholder: 'All Grades' },
        ]}
        values={filters}
        onChange={(key, value) => setFilters({ ...filters, [key]: value })}
        onClear={() => setFilters({})}
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Search classes..."
        className="mb-6"
      />

      {viewMode === 'table' ? (
        <DataTable
          data={filteredClasses}
          columns={columns}
          loading={loading}
          pagination
          pageSize={10}
          emptyIcon="📚"
          emptyTitle="No classes found"
          emptyDescription="Add your first class to get started."
          emptyAction={<Button onClick={openCreateModal}>Add Class</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClasses.map((cls) => (
            <Card key={cls.id} hover onClick={() => openEditModal(cls)}>
              <div className="h-2 rounded-t-xl -mx-4 -mt-4 mb-4" style={{ backgroundColor: '#5B8C51' }} />
              <h3 className="font-semibold text-gray-900">{cls.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{cls.section || 'No section'}</p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Grade:</span>
                  <Badge variant="primary" size="sm">{cls.grade_level}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Teacher:</span>
                  <span>{cls.teacher_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Students:</span>
                  <span>{cls.student_count}/{cls.max_students}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button variant="ghost" size="sm" fullWidth onClick={(e) => { e.stopPropagation(); openEditModal(cls) }}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" fullWidth onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, item: cls }) }} className="text-red-500">
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        title={editingClass ? 'Edit Class' : 'Add New Class'}
        submitText={editingClass ? 'Update' : 'Add Class'}
        submitLoading={saving}
      >
        <div className="space-y-4">
          <Input
            label="Class Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            placeholder="e.g., Mathematics 101"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Grade Level"
              value={formData.grade_level}
              onChange={(value) => setFormData({ ...formData, grade_level: value })}
              options={gradeLevelOptions}
              error={formErrors.grade_level}
            />
            <Input
              label="Section"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder="e.g., Section A"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Room"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              placeholder="e.g., Room 101"
            />
            <Input
              label="Max Students"
              type="number"
              value={String(formData.max_students)}
              onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 40 })}
            />
          </div>
          <Input
            label="Schedule"
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            placeholder="e.g., MWF 9:00-10:00 AM"
          />
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, item: null })}
        title="Delete Class?"
        message={`Are you sure you want to delete ${deleteConfirm.item?.name}? This will remove all associated data.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}
