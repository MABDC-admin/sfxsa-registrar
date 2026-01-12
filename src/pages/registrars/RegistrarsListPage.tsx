import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../../lib/apiClient'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { PageHeader, PageContainer, FilterBar } from '../../components/layout'
import { Button, FormModal, Input, useToast, Badge, Avatar, Card, ConfirmDialog, LoadingSpinner, EmptyState } from '../../components/ui'
import { createUser, updateUser, validateUserForm } from '../../lib/userManagement'

interface Registrar {
  id: string
  full_name: string
  email: string
  phone: string
  avatar_url: string
  is_active: boolean
  created_at: string
}

export function RegistrarsListPage() {
  const toast = useToast()
  const [registrars, setRegistrars] = useState<Registrar[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingRegistrar, setEditingRegistrar] = useState<Registrar | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; registrar: Registrar | null }>({ open: false, registrar: null })
  const [deleting, setDeleting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const loadRegistrars = useCallback(async () => {
    setLoading(true)
    const { data, error } = await api.from('profiles').select('id, full_name, email, phone, avatar_url, is_active, created_at').eq('role', 'registrar').order('full_name')
    if (error) { setRegistrars([]) } else {
      setRegistrars(data?.map((item: any) => ({ ...item, avatar_url: item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.full_name}&backgroundColor=transparent` })) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadRegistrars() }, [loadRegistrars])
  useRealtimeSubscription({ table: 'profiles', filter: 'role=eq.registrar' }, loadRegistrars, [])

  const filteredRegistrars = registrars.filter(r => {
    const matchesSearch = !searchTerm || r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || r.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filters.status || filters.status === '' || (filters.status === 'active' && r.is_active) || (filters.status === 'inactive' && !r.is_active)
    return matchesSearch && matchesStatus
  })

  function openCreateModal() {
    setEditingRegistrar(null); setFormData({ full_name: '', email: '', phone: '', password: '' }); setAvatarFile(null); setAvatarPreview(null); setFormErrors({}); setShowModal(true)
  }

  function openEditModal(registrar: Registrar) {
    setEditingRegistrar(registrar); setFormData({ full_name: registrar.full_name, email: registrar.email || '', phone: registrar.phone || '', password: '' }); setAvatarFile(null); setAvatarPreview(registrar.avatar_url); setFormErrors({}); setShowModal(true)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) { setAvatarFile(file); const reader = new FileReader(); reader.onloadend = () => setAvatarPreview(reader.result as string); reader.readAsDataURL(file) }
  }

  function validateForm(): boolean {
    const errors = validateUserForm(formData, !!editingRegistrar)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)
    try {
      if (editingRegistrar) {
        await updateUser(
          {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
          },
          {
            userId: editingRegistrar.id,
            currentAvatarUrl: editingRegistrar.avatar_url,
            avatarFile,
          }
        )
        toast.success('Registrar updated successfully')
      } else {
        await createUser(
          {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          },
          {
            role: 'registrar',
            avatarFile,
          }
        )
        toast.success('Registrar added successfully')
      }
      setShowModal(false); loadRegistrars()
    } catch (error: any) { toast.error(error.message || 'Failed to save registrar') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteConfirm.registrar) return; setDeleting(true)
    try {
      const { error } = await api.from('profiles').update({ is_active: false }).eq('id', deleteConfirm.registrar.id)
      if (error) throw error; toast.success('Registrar deleted'); setDeleteConfirm({ open: false, registrar: null }); loadRegistrars()
    } catch (error: any) { toast.error(error.message || 'Failed to delete') } finally { setDeleting(false) }
  }

  async function handleToggleStatus(registrar: Registrar) {
    const { error } = await api.from('profiles').update({ is_active: !registrar.is_active }).eq('id', registrar.id)
    if (!error) { toast.success(registrar.is_active ? 'Registrar disabled' : 'Registrar enabled'); loadRegistrars() }
  }

  return (
    <PageContainer>
      <PageHeader title="Registrars" subtitle="Manage registrar accounts" icon="📝" actions={<Button onClick={openCreateModal} icon="➕">Add Registrar</Button>} />
      <FilterBar filters={[{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], placeholder: 'All Status' }]} values={filters} onChange={(key, value) => setFilters({ ...filters, [key]: value })} onClear={() => setFilters({})} onSearch={setSearchTerm} searchValue={searchTerm} searchPlaceholder="Search registrars..." className="mb-6" />

      {loading ? (<div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>) : filteredRegistrars.length === 0 ? (<EmptyState icon="📝" title="No registrars found" description="Add your first registrar to get started." action={<Button onClick={openCreateModal}>Add Registrar</Button>} />) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegistrars.map((registrar) => (
            <Card key={registrar.id} className={`overflow-hidden ${!registrar.is_active ? 'opacity-60' : ''}`}>
              <div className="h-2 -mx-4 -mt-4 mb-4" style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' }} />
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={registrar.avatar_url} name={registrar.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{registrar.full_name}</h3>
                  <Badge variant={registrar.is_active ? 'success' : 'default'} size="sm" dot>{registrar.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2"><span>📧</span><span className="truncate">{registrar.email}</span></div>
                {registrar.phone && <div className="flex items-center gap-2"><span>📱</span><span>{registrar.phone}</span></div>}
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={() => openEditModal(registrar)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(registrar)}>{registrar.is_active ? 'Disable' : 'Enable'}</Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteConfirm({ open: true, registrar })}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">Total: {registrars.length} registrar(s)</div>

      <FormModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleSave} title={editingRegistrar ? 'Edit Registrar' : 'Add New Registrar'} submitText={editingRegistrar ? 'Update' : 'Create'} submitLoading={saving}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">📷</div>}
            </div>
            <div><Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>{avatarPreview ? 'Change Photo' : 'Upload Photo'}</Button><p className="text-xs text-gray-500 mt-1">JPG, PNG up to 2MB</p></div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <Input label="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} error={formErrors.full_name} placeholder="Enter full name" required />
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} error={formErrors.email} placeholder="registrar@school.com" required disabled={!!editingRegistrar} />
          <Input label="Phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
          {!editingRegistrar && <Input label="Password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} error={formErrors.password} placeholder="Min 6 characters" required />}
        </div>
      </FormModal>

      <ConfirmDialog isOpen={deleteConfirm.open} onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ open: false, registrar: null })} title="Delete Registrar?" message={`Are you sure you want to delete ${deleteConfirm.registrar?.full_name}?`} confirmText="Delete" variant="danger" loading={deleting} />
    </PageContainer>
  )
}
