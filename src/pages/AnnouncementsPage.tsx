import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { PageHeader, PageContainer, FilterBar, type FilterOption } from '../components/layout'
import { 
  Button, DataTable, FormModal, Input, Select, 
  useToast, Badge, ConfirmDialog, Card, Textarea
} from '../components/ui'
import type { Column, BulkAction } from '../components/ui'

interface Announcement {
  id: string
  title: string
  content: string
  author_id: string
  author_name: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_pinned: boolean
  target_audience: string
  created_at: string
  updated_at: string
}

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const audienceOptions = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students Only' },
  { value: 'teachers', label: 'Teachers Only' },
  { value: 'parents', label: 'Parents Only' },
  { value: 'staff', label: 'Staff Only' },
]

const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-700' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700' },
}

export function AnnouncementsPage() {
  const { profile, user } = useAuth()
  const toast = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; item: Announcement | null }>({ open: false, item: null })
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<Announcement[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    is_pinned: false,
    target_audience: 'all',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const canManage = profile?.role === 'admin' || profile?.role === 'principal'

  const loadAnnouncements = useCallback(async () => {
    setLoading(true)
    const { data } = await api
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) {
      setAnnouncements(data as Announcement[])
    } else {
      setAnnouncements([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  useRealtimeSubscription({ table: 'announcements' }, loadAnnouncements, [])

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = !searchTerm || 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.author_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = !filters.priority || filters.priority === '' || a.priority === filters.priority
    const matchesAudience = !filters.target_audience || filters.target_audience === '' || a.target_audience === filters.target_audience
    return matchesSearch && matchesPriority && matchesAudience
  })

  function openCreateModal() {
    setEditingAnnouncement(null)
    setFormData({ title: '', content: '', priority: 'normal', is_pinned: false, target_audience: 'all' })
    setFormErrors({})
    setShowModal(true)
  }

  function openEditModal(announcement: Announcement) {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      is_pinned: announcement.is_pinned,
      target_audience: announcement.target_audience,
    })
    setFormErrors({})
    setShowModal(true)
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!formData.title.trim()) errors.title = 'Title is required'
    if (!formData.content.trim()) errors.content = 'Content is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)

    try {
      if (editingAnnouncement) {
        const { error } = await api
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content,
            priority: formData.priority,
            is_pinned: formData.is_pinned,
            target_audience: formData.target_audience,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAnnouncement.id)

        if (error) throw error
        toast.success('Announcement updated successfully')
      } else {
        const { error } = await api
          .from('announcements')
          .insert({
            title: formData.title,
            content: formData.content,
            priority: formData.priority,
            is_pinned: formData.is_pinned,
            target_audience: formData.target_audience,
            author_id: user?.id,
            author_name: profile?.full_name || 'Unknown',
          })

        if (error) throw error
        toast.success('Announcement created successfully')
      }
      setShowModal(false)
      loadAnnouncements()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.item) return
    setDeleting(true)

    try {
      const { error } = await api
        .from('announcements')
        .delete()
        .eq('id', deleteConfirm.item.id)

      if (error) throw error
      toast.success('Announcement deleted successfully')
      setDeleteConfirm({ open: false, item: null })
      loadAnnouncements()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement')
    } finally {
      setDeleting(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedAnnouncements.length === 0) return
    setDeleting(true)

    try {
      const ids = selectedAnnouncements.map(a => a.id)
      for (const id of ids) {
        await api.from('announcements').delete().eq('id', id)
      }
      toast.success(`Deleted ${ids.length} announcements`)
      setBulkDeleteConfirm(false)
      setSelectedAnnouncements([])
      loadAnnouncements()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcements')
    } finally {
      setDeleting(false)
    }
  }

  async function togglePin(announcement: Announcement) {
    try {
      const { error } = await api
        .from('announcements')
        .update({ is_pinned: !announcement.is_pinned })
        .eq('id', announcement.id)

      if (error) throw error
      toast.success(announcement.is_pinned ? 'Unpinned announcement' : 'Pinned announcement')
      loadAnnouncements()
    } catch (error: any) {
      toast.error('Failed to update announcement')
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const columns: Column<Announcement>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.is_pinned && <span className="text-amber-500">📌</span>}
          <span className="font-medium">{item.title}</span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (item) => {
        const colors = priorityColors[item.priority] || priorityColors.normal
        return (
          <Badge className={`${colors.bg} ${colors.text}`}>
            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
          </Badge>
        )
      },
    },
    {
      key: 'target_audience',
      header: 'Audience',
      sortable: true,
      render: (item) => (
        <span className="text-gray-600 capitalize">{item.target_audience}</span>
      ),
    },
    {
      key: 'author_name',
      header: 'Author',
      sortable: true,
    },
    {
      key: 'created_at',
      header: 'Posted',
      sortable: true,
      render: (item) => (
        <span className="text-gray-500 text-sm">{formatDate(item.created_at)}</span>
      ),
    },
  ]

  const bulkActions: BulkAction<Announcement>[] = canManage ? [
    {
      label: 'Delete Selected',
      icon: '🗑️',
      variant: 'danger',
      onClick: () => setBulkDeleteConfirm(true),
    },
  ] : []

  const filterOptions: FilterOption[] = [
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: priorityOptions,
    },
    {
      key: 'target_audience',
      label: 'Audience',
      type: 'select',
      options: audienceOptions,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Announcements"
        icon="📢"
        subtitle="School announcements and important notices"
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
                {viewMode === 'table' ? '📊 Grid View' : '📋 Table View'}
              </Button>
              <Button onClick={openCreateModal}>
                ➕ New Announcement
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
              {viewMode === 'table' ? '📊 Grid View' : '📋 Table View'}
            </Button>
          )
        }
      />

      <FilterBar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Search announcements..."
        filters={filterOptions}
        values={filters}
        onChange={(key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }))}
        onClear={() => setFilters({})}
      />

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-2/3"></div>
              </div>
            ))
          ) : filteredAnnouncements.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <span className="text-5xl block mb-3">📢</span>
              <p className="text-lg font-medium">No announcements found</p>
              <p className="text-sm">Check back later for updates</p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => {
              const colors = priorityColors[announcement.priority] || priorityColors.normal
              return (
                <Card
                  key={announcement.id}
                  className={`relative overflow-hidden ${announcement.is_pinned ? 'ring-2 ring-amber-400' : ''}`}
                >
                  {announcement.is_pinned && (
                    <div className="absolute top-2 right-2">
                      <span className="text-amber-500 text-lg">📌</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800 line-clamp-2 pr-6">{announcement.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-3 mb-3">{announcement.content}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge className={`${colors.bg} ${colors.text}`}>
                          {announcement.priority}
                        </Badge>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 capitalize">{announcement.target_audience}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">{announcement.author_name}</span>
                        <span className="mx-1">•</span>
                        {formatDate(announcement.created_at)}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePin(announcement)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors text-sm"
                            title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                          >
                            {announcement.is_pinned ? '📌' : '📍'}
                          </button>
                          <button
                            onClick={() => openEditModal(announcement)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors text-sm"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, item: announcement })}
                            className="p-1 rounded hover:bg-red-50 text-red-600 transition-colors text-sm"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      ) : (
        <DataTable
          data={filteredAnnouncements}
          columns={columns}
          loading={loading}
          selectable={canManage}
          selectedRows={selectedAnnouncements}
          onSelectionChange={setSelectedAnnouncements}
          bulkActions={bulkActions}
          emptyIcon="📢"
          emptyTitle="No announcements found"
          emptyDescription="Create an announcement to get started"
        />
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            error={formErrors.title}
            placeholder="Enter announcement title"
            required
          />

          <Textarea
            label="Content"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            error={formErrors.content}
            placeholder="Write your announcement content..."
            rows={5}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              options={priorityOptions}
            />

            <Select
              label="Target Audience"
              value={formData.target_audience}
              onChange={(value) => setFormData(prev => ({ ...prev, target_audience: value }))}
              options={audienceOptions}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_pinned}
              onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">📌 Pin this announcement</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingAnnouncement ? 'Update' : 'Create'} Announcement
            </Button>
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onCancel={() => setDeleteConfirm({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message={`Are you sure you want to delete "${deleteConfirm.item?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onCancel={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Multiple Announcements"
        message={`Are you sure you want to delete ${selectedAnnouncements.length} announcements? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  )
}
