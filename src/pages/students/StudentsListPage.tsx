import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/apiClient'
import { calculateAge, isNotFutureDate } from '../../utils/dateUtils'
import { useSchoolYear } from '../../contexts/SchoolYearContext'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { PageHeader, PageContainer, FilterBar } from '../../components/layout'
import { 
  Button, DataTable, FormModal, Input, Select, 
  useToast, Badge, Avatar, ConfirmDialog 
} from '../../components/ui'
import type { Column, BulkAction } from '../../components/ui'
import { downloadCSV, downloadExcel } from '../../utils/export'

interface Student {
  id: string
  student_id: string
  full_name: string
  birthdate: string
  email: string
  grade_level: string
  avatar_url: string
  gender?: string
  lrn?: string
  status?: string
  enrolled_at?: string
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

export function StudentsListPage() {
  const { selectedYear } = useSchoolYear()
  const toast = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null })
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [formData, setFormData] = useState({
    full_name: '',
    birthdate: '',
    email: '',
    password: '',
    grade_level: 'Kindergarten',
    gender: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Update age dynamically when birthdate changes in form
  useEffect(() => {
    if (formData.birthdate) {
      // const age = calculateAge(formData.birthdate)
      // Since age is not in formData, we might just display it or include it in submission
    }
  }, [formData.birthdate])

  const loadStudents = useCallback(async () => {
    setLoading(true)
    const { data: records } = await api
      .from('student_records')
      .select('*')
      .eq('school_year', selectedYear)
      .order('student_name')

    if (records && records.length > 0) {
      const formattedStudents: Student[] = records.map((row: any) => ({
        id: row.id,
        student_id: row.lrn || '',
        full_name: row.student_name || '',
        birthdate: row.birth_date || '',
        email: `${(row.student_name || 'student').toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)}@school.com`,
        grade_level: row.grade_level || row.level || 'Grade 1',
        avatar_url: row.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(row.student_name || 'default')}&backgroundColor=transparent`,
        gender: row.gender || '',
        lrn: row.lrn || '',
        status: row.status || 'Active',
        age: row.age,
        enrolled_at: row.enrolled_at,
      }))
      setStudents(formattedStudents)
    } else {
      setStudents([])
    }
    setLoading(false)
  }, [selectedYear])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useRealtimeSubscription({ table: 'student_records' }, loadStudents, [selectedYear])

  const filteredStudents = students.filter(s => {
    const matchesSearch = !searchTerm || 
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lrn?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGrade = !filters.grade_level || filters.grade_level === '' || s.grade_level === filters.grade_level
    const matchesGender = !filters.gender || filters.gender === '' || s.gender?.toLowerCase() === filters.gender.toLowerCase()
    return matchesSearch && matchesGrade && matchesGender
  })

  function openCreateModal() {
    setEditingStudent(null)
    setFormData({ full_name: '', birthdate: '', email: '', password: '', grade_level: 'Kinder 1', gender: '' })
    setFormErrors({})
    setShowModal(true)
  }

  function openEditModal(student: Student) {
    setEditingStudent(student)
    setFormData({
      full_name: student.full_name,
      birthdate: student.birthdate,
      email: student.email,
      password: '',
      grade_level: student.grade_level,
      gender: student.gender || '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!formData.full_name.trim()) errors.full_name = 'Name is required'
    if (!formData.birthdate) errors.birthdate = 'Birthdate is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    if (!editingStudent && !formData.password) errors.password = 'Password is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)

    try {
      const calculatedAge = calculateAge(formData.birthdate)
      
      if (editingStudent) {
        const { error } = await api
          .from('student_records')
          .update({
            student_name: formData.full_name,
            birth_date: formData.birthdate,
            age: calculatedAge,
            grade_level: formData.grade_level,
            gender: formData.gender,
          })
          .eq('id', editingStudent.id)

        if (error) throw error
        toast.success('Student updated successfully')
      } else {
        const { error } = await api
          .from('student_records')
          .insert({
            student_name: formData.full_name,
            birth_date: formData.birthdate,
            age: calculatedAge,
            grade_level: formData.grade_level,
            school_year: selectedYear,
            status: 'Active',
            gender: formData.gender,
            lrn: `NEW-${Date.now()}`,
            enrolled_at: '2025-07-01'
          })

        if (error) throw error
        toast.success('Student added successfully')
      }
      setShowModal(false)
      loadStudents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save student')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.student) return
    setDeleting(true)

    try {
      const { error } = await api
        .from('student_records')
        .delete()
        .eq('id', deleteConfirm.student.id)

      if (error) throw error
      toast.success('Student deleted successfully')
      setDeleteConfirm({ open: false, student: null })
      loadStudents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete student')
    } finally {
      setDeleting(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedStudents.length === 0) return
    setDeleting(true)

    try {
      const ids = selectedStudents.map(s => s.id)
      const { error } = await api
        .from('student_records')
        .delete()
        .in('id', ids)

      if (error) throw error
      toast.success(`${selectedStudents.length} students deleted successfully`)
      setBulkDeleteConfirm(false)
      setSelectedStudents([])
      loadStudents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete students')
    } finally {
      setDeleting(false)
    }
  }

  // Export columns configuration
  const exportColumns = [
    { key: 'full_name' as keyof Student, header: 'Full Name' },
    { key: 'lrn' as keyof Student, header: 'LRN' },
    { key: 'grade_level' as keyof Student, header: 'Grade Level' },
    { key: 'gender' as keyof Student, header: 'Gender' },
    { key: 'birthdate' as keyof Student, header: 'Birthdate' },
    { key: 'status' as keyof Student, header: 'Status' },
    { key: 'email' as keyof Student, header: 'Email' },
  ]

  // Bulk actions for DataTable
  const bulkActions: BulkAction<Student>[] = [
    {
      label: 'Export CSV',
      icon: '📄',
      onClick: (selected) => {
        downloadCSV(selected, `students_${selectedYear}`, exportColumns)
        toast.success(`Exported ${selected.length} students to CSV`)
      },
    },
    {
      label: 'Export Excel',
      icon: '📊',
      onClick: (selected) => {
        downloadExcel(selected, `students_${selectedYear}`, exportColumns)
        toast.success(`Exported ${selected.length} students to Excel`)
      },
    },
    {
      label: 'Delete Selected',
      icon: '🗑️',
      variant: 'danger',
      onClick: () => setBulkDeleteConfirm(true),
    },
  ]

  const columns: Column<Student>[] = [
    {
      key: 'full_name',
      header: 'Student',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.avatar_url} name={row.full_name} size="sm" />
          <div>
            <p className="font-medium text-gray-900">{row.full_name}</p>
            <p className="text-xs text-gray-500">{row.lrn || 'No LRN'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'grade_level',
      header: 'Grade',
      render: (row) => <Badge variant="primary">{row.grade_level}</Badge>,
    },
    {
      key: 'gender',
      header: 'Gender',
      render: (row) => row.gender || '-',
    },
    {
      key: 'birthdate',
      header: 'Age',
      render: (row) => row.birthdate ? `${calculateAge(row.birthdate)} yrs` : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'default'} dot>
          {row.status || 'Active'}
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
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, student: row }) }}
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
        title="Students"
        subtitle={`Manage enrolled students for ${selectedYear}`}
        icon="👥"
        actions={
          <Button onClick={openCreateModal} icon="➕">
            Add Student
          </Button>
        }
      />

      <FilterBar
        filters={[
          { key: 'grade_level', label: 'Grade', type: 'select', options: gradeLevelOptions, placeholder: 'All Grades' },
          { key: 'gender', label: 'Gender', type: 'select', options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }], placeholder: 'All Genders' },
        ]}
        values={filters}
        onChange={(key, value) => setFilters({ ...filters, [key]: value })}
        onClear={() => setFilters({})}
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Search by name or LRN..."
        className="mb-6"
      />

      <DataTable
        data={filteredStudents}
        columns={columns}
        loading={loading}
        pagination
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        selectable
        selectedRows={selectedStudents}
        onSelectionChange={setSelectedStudents}
        bulkActions={bulkActions}
        emptyIcon="👥"
        emptyTitle="No students found"
        emptyDescription="Add your first student to get started."
        emptyAction={<Button onClick={openCreateModal}>Add Student</Button>}
      />

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
        submitText={editingStudent ? 'Update' : 'Add Student'}
        submitLoading={saving}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            error={formErrors.full_name}
            placeholder="Enter student's full name"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Birthdate"
              type="date"
              value={formData.birthdate}
              onChange={(e) => {
                if (!isNotFutureDate(e.target.value)) {
                  toast.error('Birthdate cannot be in the future')
                  return
                }
                setFormData({ ...formData, birthdate: e.target.value })
              }}
              error={formErrors.birthdate}
              required
              hint={formData.birthdate ? `Calculated Age: ${calculateAge(formData.birthdate)} yrs` : ''}
            />
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(value) => setFormData({ ...formData, gender: value })}
              options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
              placeholder="Select gender"
            />
          </div>
          <Select
            label="Grade Level"
            value={formData.grade_level}
            onChange={(value) => setFormData({ ...formData, grade_level: value })}
            options={gradeLevelOptions}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
            placeholder="student@school.com"
            required
          />
          <Input
            label={editingStudent ? 'Password (leave blank to keep current)' : 'Password'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={formErrors.password}
            placeholder="••••••••"
            required={!editingStudent}
          />
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, student: null })}
        title="Delete Student?"
        message={`Are you sure you want to delete ${deleteConfirm.student?.full_name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
        title="Delete Selected Students?"
        message={`Are you sure you want to delete ${selectedStudents.length} selected students? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}
