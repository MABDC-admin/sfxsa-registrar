import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '../lib/apiClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface AccountingKpis {
  total_collected: number
  total_expenses: number
  outstanding: number
  net_balance: number
}

export function AccountingDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [menuPermissions, setMenuPermissions] = useState<Array<{menu_key: string, is_enabled: boolean}>>([])
  const [kpis, setKpis] = useState<AccountingKpis>({
    total_collected: 0,
    total_expenses: 0,
    outstanding: 0,
    net_balance: 0
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])

  // Load module permissions for Accounting role
  useEffect(() => {
    async function loadPermissions() {
      if (!profile?.role) return
      try {
        const { data } = await api.from('role_module_permissions').select('*').eq('role', profile.role)
        if (data) {
          setMenuPermissions(data.map((p: any) => ({
            menu_key: p.module_key,
            is_enabled: p.is_enabled
          })))
        }
      } catch (err) {
        console.error('Error loading permissions:', err)
      }
    }
    loadPermissions()
  }, [profile?.role])

  // Check if a module is enabled
  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    const permission = menuPermissions.find(p => p.menu_key === moduleKey)
    return permission ? permission.is_enabled : true
  }, [menuPermissions])

  // Quick action links - only show enabled modules
  const quickActions = useMemo(() => {
    const allActions = [
      { key: 'finance', icon: '💵', label: 'Record Payment', description: 'Add new payment', path: '/finance', color: '#DCFCE7' },
      { key: 'finance', icon: '💸', label: 'Add Expense', description: 'Record expense', path: '/finance', color: '#FEE2E2' },
      { key: 'reports', icon: '📊', label: 'View Reports', description: 'Financial reports', path: '/reports', color: '#E0F2FE' },
      { key: 'settings', icon: '💰', label: 'Fee Structure', description: 'Manage fees', path: '/settings', color: '#FEF3C7' },
    ]
    return allActions.filter(action => isModuleEnabled(action.key))
  }, [isModuleEnabled])

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      
      const { data, error } = await api.dashboard.getStats('2025-2026', 'accounting');
      
      if (data && !error) {
        setKpis({
          total_collected: data.finance.totalCollected,
          total_expenses: data.finance.totalExpenses,
          outstanding: 0,
          net_balance: data.finance.totalCollected - data.finance.totalExpenses
        });
      }

      // Still fetch recent transactions separately for now as they are detailed
      const { data: payments } = await api
        .from('payments')
        .select('id, amount, description, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentTransactions((payments || []).map((p: { id: string; amount: number; description?: string; created_at: string }) => ({ ...p, type: 'payment' as const })))
      setLoading(false)
    }

    loadDashboard()
  }, [])

  const kpiCards = [
    { icon: '💵', label: 'Total Collected', value: `₱${kpis.total_collected.toLocaleString()}`, color: '#22C55E' },
    { icon: '💸', label: 'Total Expenses', value: `₱${kpis.total_expenses.toLocaleString()}`, color: '#EF4444' },
    { icon: '📊', label: 'Outstanding', value: `₱${kpis.outstanding.toLocaleString()}`, color: '#F59E0B' },
    { icon: '💰', label: 'Net Balance', value: `₱${kpis.net_balance.toLocaleString()}`, color: '#8B5CF6' }
  ]

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center" style={{ backgroundColor: '#F8FAF7' }}>
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">💰 Accounting Dashboard</h1>
        <p className="text-gray-500">Financial management and reporting</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${kpi.color}20` }}
              >
                {kpi.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">{kpi.value}</p>
                <p className="text-sm text-gray-500">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">⚡ Quick Actions</h2>
          {quickActions.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="p-4 rounded-xl text-left hover:shadow-md transition-shadow"
                  style={{ backgroundColor: action.color }}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <p className="font-medium text-gray-800 mt-2">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No quick actions available</p>
              <p className="text-xs mt-1">Modules may be disabled by admin</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🧾 Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions found</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'payment' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <span>{tx.type === 'payment' ? '💵' : '💸'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{tx.description || 'Transaction'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-bold ${tx.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'payment' ? '+' : '-'}₱{tx.amount?.toLocaleString() || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
