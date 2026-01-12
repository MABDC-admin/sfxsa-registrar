import { useState, useEffect } from 'react'
import { api } from '../lib/apiClient'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newYear, setNewYear] = useState({ name: '', start_date: '', end_date: '' })

  async function loadAcademicYears() {
    setLoading(true)
    try {
      const { data, error } = await api
        .from('academic_years')
        .select('*')
        .order('name', { ascending: false })

      if (error) {
        console.error('Error loading academic years:', error)
      } else {
        setAcademicYears(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAcademicYears()
  }, [])

  useRealtimeSubscription(
    { table: 'academic_years' },
    loadAcademicYears,
    []
  )

  async function toggleActive(year: AcademicYear) {
    setUpdating(year.id)
    try {
      if (!year.is_active) {
        // First, deactivate all other years
        await api
          .from('academic_years')
          .update({ is_active: false })
          .neq('id', year.id)
      }

      // Toggle the selected year
      const { error } = await api
        .from('academic_years')
        .update({ is_active: !year.is_active })
        .eq('id', year.id)

      if (error) {
        console.error('Error updating academic year:', error)
      } else {
        await loadAcademicYears()
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setUpdating(null)
  }

  async function handleAddYear() {
    if (!newYear.name || !newYear.start_date || !newYear.end_date) return

    try {
      const { error } = await api.from('academic_years').insert({
        name: newYear.name,
        start_date: newYear.start_date,
        end_date: newYear.end_date,
        is_active: false
      })

      if (error) {
        console.error('Error adding academic year:', error)
      } else {
        setShowAddModal(false)
        setNewYear({ name: '', start_date: '', end_date: '' })
        await loadAcademicYears()
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function deleteYear(id: string) {
    if (!confirm('Are you sure you want to delete this academic year?')) return

    try {
      const { error } = await api.from('academic_years').delete().eq('id', id)
      if (error) {
        console.error('Error deleting academic year:', error)
      } else {
        await loadAcademicYears()
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const activeYear = academicYears.find(y => y.is_active)

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📅 Academic Years</h1>
          <p className="text-gray-500">Manage school academic years and set the active year</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
          style={{ backgroundColor: '#5B8C51' }}
        >
          + Add Academic Year
        </button>
      </div>

      {/* Active Year Banner */}
      {activeYear && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white text-xl">
            ✓
          </div>
          <div>
            <p className="text-green-800 font-medium">Current Active Academic Year</p>
            <p className="text-green-600 text-2xl font-bold">{activeYear.name}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-gray-500">Loading academic years...</div>
      )}

      {/* Academic Years Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {academicYears.map((year) => (
            <div
              key={year.id}
              className={`bg-white rounded-2xl shadow-sm p-5 border-2 transition-all ${
                year.is_active 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              {/* Year Name */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-800">{year.name}</h3>
                {year.is_active && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Dates */}
              <div className="text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>📆</span>
                  <span>Start: {new Date(year.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🏁</span>
                  <span>End: {new Date(year.end_date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(year)}
                  disabled={updating === year.id}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    year.is_active
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {updating === year.id ? '...' : year.is_active ? 'Deactivate' : 'Set Active'}
                </button>
                <button
                  onClick={() => deleteYear(year.id)}
                  className="px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && academicYears.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Academic Years</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first academic year</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#5B8C51' }}
          >
            + Add Academic Year
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Add Academic Year</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year Name</label>
                <input
                  type="text"
                  value={newYear.name}
                  onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                  placeholder="e.g., 2040-2041"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newYear.start_date}
                  onChange={(e) => setNewYear({ ...newYear, start_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={newYear.end_date}
                  onChange={(e) => setNewYear({ ...newYear, end_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddYear}
                className="flex-1 px-4 py-3 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#5B8C51' }}
              >
                Add Year
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
