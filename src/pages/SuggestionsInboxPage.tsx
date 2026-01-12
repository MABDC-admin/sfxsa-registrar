import { useState, useEffect } from 'react'
import { api } from '../lib/apiClient'

interface Suggestion {
  id: string
  type: 'suggestion' | 'review' | 'complaint' | 'feedback'
  subject: string
  message: string
  submitter_name: string | null
  submitter_email: string | null
  rating: number | null
  status: 'pending' | 'reviewed' | 'resolved' | 'archived'
  admin_notes: string | null
  created_at: string
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  reviewed: { bg: '#DBEAFE', text: '#1E40AF' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
  archived: { bg: '#F3F4F6', text: '#6B7280' },
}

const typeIcons: Record<string, string> = {
  suggestion: '💡',
  review: '⭐',
  complaint: '📢',
  feedback: '📝',
}

export function SuggestionsInboxPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Suggestion | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    fetchSuggestions()
  }, [filterStatus, filterType])

  const fetchSuggestions = async () => {
    setLoading(true)
    let query = api
      .from('suggestions_reviews')
      .select('*')
      .order('created_at', { ascending: false })

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }
    if (filterType !== 'all') {
      query = query.eq('type', filterType)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching suggestions:', error)
    } else {
      setSuggestions(data || [])
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await api
      .from('suggestions_reviews')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus as Suggestion['status'] } : s))
      )
      if (selectedItem?.id === id) {
        setSelectedItem({ ...selectedItem, status: newStatus as Suggestion['status'] })
      }
    }
  }

  const saveNotes = async (id: string, notes: string) => {
    const { error } = await api
      .from('suggestions_reviews')
      .update({ admin_notes: notes })
      .eq('id', id)

    if (!error && selectedItem) {
      setSelectedItem({ ...selectedItem, admin_notes: notes })
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, admin_notes: notes } : s))
      )
    }
  }

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            💬 Suggestions & Reviews
            {pendingCount > 0 && (
              <span
                className="px-2 py-0.5 text-xs font-semibold rounded-full text-white"
                style={{ backgroundColor: '#EF4444' }}
              >
                {pendingCount} new
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review and respond to community feedback</p>
        </div>
        <a
          href="/suggestions"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          🔗 Public Form Link
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
          >
            <option value="all">All</option>
            <option value="suggestion">Suggestions</option>
            <option value="review">Reviews</option>
            <option value="complaint">Complaints</option>
            <option value="feedback">Feedback</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : suggestions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No submissions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedItem?.id === item.id ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{typeIcons[item.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-800 truncate">{item.subject}</h3>
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: statusColors[item.status].bg,
                            color: statusColors[item.status].text,
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{item.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        {item.submitter_name && <span>by {item.submitter_name}</span>}
                        {item.rating && <span>{'⭐'.repeat(item.rating)}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedItem && (
          <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{typeIcons[selectedItem.type]}</span>
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-full capitalize"
                style={{
                  backgroundColor: statusColors[selectedItem.status].bg,
                  color: statusColors[selectedItem.status].text,
                }}
              >
                {selectedItem.status}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-gray-800 mb-2">{selectedItem.subject}</h2>

            {selectedItem.rating && (
              <div className="mb-3">{'⭐'.repeat(selectedItem.rating)}</div>
            )}

            <p className="text-gray-600 text-sm mb-4 whitespace-pre-wrap">{selectedItem.message}</p>

            <div className="border-t border-gray-100 pt-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">From:</span>
                  <p className="text-gray-700">{selectedItem.submitter_name || 'Anonymous'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>
                  <p className="text-gray-700">{selectedItem.submitter_email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Date:</span>
                  <p className="text-gray-700">
                    {new Date(selectedItem.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <p className="text-gray-700 capitalize">{selectedItem.type}</p>
                </div>
              </div>
            </div>

            {/* Status Actions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
              <div className="flex flex-wrap gap-2">
                {['pending', 'reviewed', 'resolved', 'archived'].map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(selectedItem.id, status)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      selectedItem.status === status
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={selectedItem.status === status ? { backgroundColor: '#5B8C51' } : {}}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
              <textarea
                defaultValue={selectedItem.admin_notes || ''}
                onBlur={(e) => saveNotes(selectedItem.id, e.target.value)}
                placeholder="Add internal notes..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
