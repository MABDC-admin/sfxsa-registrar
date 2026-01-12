import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../../lib/apiClient'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { PageHeader, PageContainer, FilterBar } from '../../components/layout'
import { 
  Button, FormModal, Input, useToast, Badge, Avatar, 
  Card, ConfirmDialog, LoadingSpinner, EmptyState 
} from '../../components/ui'
import { createUser, updateUser, validateUserForm } from '../../lib/userManagement'

interface Admin {
  id: string
  full_name: string
  email: string
  phone: string
  avatar_url: string
  is_active: boolean
  created_at: string
}

export function AdminsListPage() {
  const toast = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; admin: Admin | null }>({ open: false, admin: null })
  const [deleting, setDeleting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const loadAdmins = useCallback(async () => {
    setLoading(true)
    const { data, error } = await api
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url, is_active, created_at')
      .eq('role', 'admin')
      .order('full_name')

    if (error) {
      setAdmins([])
    } else {
      setAdmins(data?.map((item: any) => ({
        ...item,
        avatar_url: item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.full_name}&backgroundColor=transparent`,
      })) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  useRealtimeSubscription({ table: 'profiles', filter: 'role=eq.admin' }, loadAdmins, [])

  const filteredAdmins = admins.filter(a => {
    const matchesSearch = !searchTerm ||
      a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filters.status || filters.status === '' ||
      (filters.status === 'active' && a.is_active) ||
      (filters.status === 'inactive' && !a.is_active)
    return matchesSearch && matchesStatus
  })

  function openCreateModal() {
    setEditingAdmin(null)
    setFormData({ full_name: '', email: '', phone: '', password: '' })
    setAvatarFile(null)
    setAvatarPreview(null)
    setFormErrors({})
    setShowModal(true)
  }

  function openEditModal(admin: Admin) {
    setEditingAdmin(admin)
    setFormData({
      full_name: admin.full_name,
      email: admin.email || '',
      phone: admin.phone || '',
      password: '',
    })
    setAvatarFile(null)
    setAvatarPreview(admin.avatar_url)
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

  function validateForm(): boolean {
    const errors = validateUserForm(formData, !!editingAdmin)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)

    try {
      if (editingAdmin) {
        // Update existing admin
        await updateUser(
          {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
          },
          {
            userId: editingAdmin.id,
            currentAvatarUrl: editingAdmin.avatar_url,
            avatarFile,
          }
        )
        toast.success('Admin updated successfully')
      } else {
        // Create new admin
        await createUser(
          {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          },
          {
            role: 'admin',
            avatarFile,
          }
        )
        toast.success('Admin created successfully')
      }
      setShowModal(false)
      loadAdmins()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save admin')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.admin) return
    setDeleting(true)
    try {
      const { error } = await api.from('profiles').update({ is_active: false }).eq('id', deleteConfirm.admin.id)
      if (error) throw error
      toast.success('Admin deleted successfully')
      setDeleteConfirm({ open: false, admin: null })
      loadAdmins()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete admin')
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggleStatus(admin: Admin) {
    const { error } = await api.from('profiles').update({ is_active: !admin.is_active }).eq('id', admin.id)
    if (!error) {
      toast.success(admin.is_active ? 'Admin disabled' : 'Admin enabled')
      loadAdmins()
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Admins"
        subtitle="Manage system administrators"
        icon="🛡️"
        actions={<Button onClick={openCreateModal} icon="➕">Add Admin</Button>}
      />

      <FilterBar
        filters={[
          { key: 'status', label: 'Status', type: 'select', options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ], placeholder: 'All Status' },
        ]}
        values={filters}
        onChange={(key, value) => setFilters({ ...filters, [key]: value })}
        onClear={() => setFilters({})}
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Search admins..."
        className="mb-6"
      />

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : filteredAdmins.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="No admins found"
          description="Add your first admin to get started."
          action={<Button onClick={openCreateModal}>Add Admin</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdmins.map((admin) => (
            <Card key={admin.id} className={`overflow-hidden ${!admin.is_active ? 'opacity-60' : ''}`}>
              <div className="h-2 -mx-4 -mt-4 mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={admin.avatar_url} name={admin.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{admin.full_name}</h3>
                  <Badge variant={admin.is_active ? 'success' : 'default'} size="sm" dot>
                    {admin.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <span>📧</span>
                  <span className="truncate">{admin.email}</span>
                </div>
                {admin.phone && (
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span>{admin.phone}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={() => openEditModal(admin)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(admin)}>
                  {admin.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteConfirm({ open: true, admin })}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">Total: {admins.length} admin(s)</div>

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        title={editingAdmin ? 'Edit Admin' : 'Add New Admin'}
        submitText={editingAdmin ? 'Update' : 'Create Admin'}
        submitLoading={saving}
      >
        <div className="space-y-4">
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
            placeholder="Enter full name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
            placeholder="admin@school.com"
            required
            disabled={!!editingAdmin}
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
          {!editingAdmin && (
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={formErrors.password}
              placeholder="Min 6 characters"
              required
            />
          )}
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, admin: null })}
        title="Delete Admin?"
        message={`Are you sure you want to delete ${deleteConfirm.admin?.full_name}? This will disable the account.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}
