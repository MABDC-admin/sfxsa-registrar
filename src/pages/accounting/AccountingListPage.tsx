import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../../lib/apiClient'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { PageHeader, PageContainer, FilterBar } from '../../components/layout'
import { Button, FormModal, Input, useToast, Badge, Avatar, Card, ConfirmDialog, LoadingSpinner, EmptyState } from '../../components/ui'
import { createUser, updateUser, validateUserForm } from '../../lib/userManagement'

interface AccountingUser {
  id: string
  full_name: string
  email: string
  phone: string
  avatar_url: string
  is_active: boolean
  created_at: string
}

export function AccountingListPage() {
  const toast = useToast()
  const [users, setUsers] = useState<AccountingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AccountingUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: AccountingUser | null }>({ open: false, user: null })
  const [deleting, setDeleting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await api.from('profiles').select('id, full_name, email, phone, avatar_url, is_active, created_at').eq('role', 'accounting').order('full_name')
    if (error) { setUsers([]) } else {
      setUsers(data?.map((item: any) => ({ ...item, avatar_url: item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.full_name}&backgroundColor=transparent` })) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])
  useRealtimeSubscription({ table: 'profiles', filter: 'role=eq.accounting' }, loadUsers, [])

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filters.status || filters.status === '' || (filters.status === 'active' && u.is_active) || (filters.status === 'inactive' && !u.is_active)
    return matchesSearch && matchesStatus
  })

  function openCreateModal() {
    setEditingUser(null); setFormData({ full_name: '', email: '', phone: '', password: '' }); setAvatarFile(null); setAvatarPreview(null); setFormErrors({}); setShowModal(true)
  }

  function openEditModal(user: AccountingUser) {
    setEditingUser(user); setFormData({ full_name: user.full_name, email: user.email || '', phone: user.phone || '', password: '' }); setAvatarFile(null); setAvatarPreview(user.avatar_url); setFormErrors({}); setShowModal(true)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) { setAvatarFile(file); const reader = new FileReader(); reader.onloadend = () => setAvatarPreview(reader.result as string); reader.readAsDataURL(file) }
  }

  function validateForm(): boolean {
    const errors = validateUserForm(formData, !!editingUser)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)
    try {
      if (editingUser) {
        await updateUser(
          {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
          },
          {
            userId: editingUser.id,
            currentAvatarUrl: editingUser.avatar_url,
            avatarFile,
          }
        )
        toast.success('Staff updated successfully')
      } else {
        await createUser(
          {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          },
          {
            role: 'accounting',
            avatarFile,
          }
        )
        toast.success('Staff added successfully')
      }
      setShowModal(false); loadUsers()
    } catch (error: any) { toast.error(error.message || 'Failed to save staff') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteConfirm.user) return; setDeleting(true)
    try {
      const { error } = await api.from('profiles').update({ is_active: false }).eq('id', deleteConfirm.user.id)
      if (error) throw error; toast.success('Staff deleted'); setDeleteConfirm({ open: false, user: null }); loadUsers()
    } catch (error: any) { toast.error(error.message || 'Failed to delete') } finally { setDeleting(false) }
  }

  async function handleToggleStatus(user: AccountingUser) {
    const { error } = await api.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    if (!error) { toast.success(user.is_active ? 'Staff disabled' : 'Staff enabled'); loadUsers() }
  }

  return (
    <PageContainer>
      <PageHeader title="Accounting" subtitle="Manage accounting staff accounts" icon="🧮" actions={<Button onClick={openCreateModal} icon="➕">Add Staff</Button>} />
      <FilterBar filters={[{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], placeholder: 'All Status' }]} values={filters} onChange={(key, value) => setFilters({ ...filters, [key]: value })} onClear={() => setFilters({})} onSearch={setSearchTerm} searchValue={searchTerm} searchPlaceholder="Search staff..." className="mb-6" />

      {loading ? (<div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>) : filteredUsers.length === 0 ? (<EmptyState icon="🧮" title="No accounting staff found" description="Add your first accounting staff to get started." action={<Button onClick={openCreateModal}>Add Staff</Button>} />) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className={`overflow-hidden ${!user.is_active ? 'opacity-60' : ''}`}>
              <div className="h-2 -mx-4 -mt-4 mb-4" style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }} />
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={user.avatar_url} name={user.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{user.full_name}</h3>
                  <Badge variant={user.is_active ? 'success' : 'default'} size="sm" dot>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2"><span>📧</span><span className="truncate">{user.email}</span></div>
                {user.phone && <div className="flex items-center gap-2"><span>📱</span><span>{user.phone}</span></div>}
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)}>{user.is_active ? 'Disable' : 'Enable'}</Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteConfirm({ open: true, user })}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">Total: {users.length} accounting staff</div>

      <FormModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleSave} title={editingUser ? 'Edit Staff' : 'Add New Staff'} submitText={editingUser ? 'Update' : 'Create'} submitLoading={saving}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">📷</div>}
            </div>
            <div><Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>{avatarPreview ? 'Change Photo' : 'Upload Photo'}</Button><p className="text-xs text-gray-500 mt-1">JPG, PNG up to 2MB</p></div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <Input label="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} error={formErrors.full_name} placeholder="Enter full name" required />
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} error={formErrors.email} placeholder="accounting@school.com" required disabled={!!editingUser} />
          <Input label="Phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
          {!editingUser && <Input label="Password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} error={formErrors.password} placeholder="Min 6 characters" required />}
        </div>
      </FormModal>

      <ConfirmDialog isOpen={deleteConfirm.open} onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ open: false, user: null })} title="Delete Staff?" message={`Are you sure you want to delete ${deleteConfirm.user?.full_name}?`} confirmText="Delete" variant="danger" loading={deleting} />
    </PageContainer>
  )
}
