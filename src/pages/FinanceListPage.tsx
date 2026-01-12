import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { useSchoolYear } from '../contexts/SchoolYearContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { PageHeader, PageContainer, StatsBar } from '../components/layout'
import { 
  Button, DataTable, FormModal, Input, Select, 
  useToast, Badge, ConfirmDialog, Tabs, Card
} from '../components/ui'
import type { Column } from '../components/ui'

type FinanceTab = 'overview' | 'payments' | 'invoices' | 'expenses' | 'payroll'

interface Payment {
  id: string
  student_name: string
  amount: number
  date: string
  type: string
  status: 'paid' | 'pending' | 'overdue'
  reference: string
}

interface Invoice {
  id: string
  invoice_no: string
  student_name: string
  amount: number
  due_date: string
  status: 'paid' | 'pending' | 'overdue' | 'partial'
  paid_amount: number
}

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  approved_by: string
  status: 'approved' | 'pending' | 'rejected'
}

interface Employee {
  id: string
  name: string
  position: string
  department: string
  salary: number
  status: 'active' | 'inactive'
}

const paymentTypeOptions = [
  { value: 'Tuition', label: 'Tuition' },
  { value: 'Registration', label: 'Registration' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Library', label: 'Library' },
  { value: 'Other', label: 'Other' },
]

const expenseCategoryOptions = [
  { value: 'Utilities', label: 'Utilities' },
  { value: 'Supplies', label: 'Supplies' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Events', label: 'Events' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Other', label: 'Other' },
]

export function FinanceListPage() {
  const { selectedYear: _selectedYear } = useSchoolYear()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview')
  const [loading, setLoading] = useState(false)

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: string; id: string }>({ open: false, type: '', id: '' })
  const [deleting, setDeleting] = useState(false)

  // Form states
  const [paymentForm, setPaymentForm] = useState({ student_name: '', amount: 0, type: 'Tuition', reference: '' })
  const [expenseForm, setExpenseForm] = useState({ category: 'Utilities', description: '', amount: 0 })
  const [invoiceForm, setInvoiceForm] = useState({ student_name: '', amount: 0, due_date: '' })

  // Data from DB
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  // Load Payments from DB
  const loadPayments = useCallback(async () => {
    setLoading(true)
    const { data } = await api.from('payments').select('*').order('date', { ascending: false })
    if (data && data.length > 0) {
      setPayments(data)
    } else {
      const defaultPayments = [
        { student_name: 'Maria Santos', amount: 15000, date: '2026-01-03', type: 'Tuition', status: 'paid', reference: 'PAY-2026-001' },
        { student_name: 'Juan Cruz', amount: 15000, date: '2026-01-02', type: 'Tuition', status: 'paid', reference: 'PAY-2026-002' },
        { student_name: 'Ana Reyes', amount: 2500, date: '2026-01-02', type: 'Registration', status: 'paid', reference: 'PAY-2026-003' },
        { student_name: 'Pedro Garcia', amount: 15000, date: '2026-01-01', type: 'Tuition', status: 'pending', reference: 'PAY-2026-004' },
        { student_name: 'Sofia Lim', amount: 1500, date: '2025-12-28', type: 'Laboratory', status: 'overdue', reference: 'PAY-2026-005' },
      ]
      const { data: inserted } = await api.from('payments').insert(defaultPayments).select()
      if (inserted) setPayments(inserted)
    }
    setLoading(false)
  }, [])

  const loadInvoices = useCallback(async () => {
    const { data } = await api.from('invoices').select('*').order('due_date', { ascending: false })
    if (data && data.length > 0) {
      setInvoices(data)
    } else {
      const defaultInvoices = [
        { invoice_no: 'INV-2026-001', student_name: 'Maria Santos', amount: 45000, due_date: '2026-01-31', status: 'partial', paid_amount: 30000 },
        { invoice_no: 'INV-2026-002', student_name: 'Juan Cruz', amount: 45000, due_date: '2026-01-31', status: 'paid', paid_amount: 45000 },
        { invoice_no: 'INV-2026-003', student_name: 'Ana Reyes', amount: 45000, due_date: '2026-01-31', status: 'pending', paid_amount: 0 },
        { invoice_no: 'INV-2026-004', student_name: 'Pedro Garcia', amount: 45000, due_date: '2025-12-31', status: 'overdue', paid_amount: 15000 },
      ]
      const { data: inserted } = await api.from('invoices').insert(defaultInvoices).select()
      if (inserted) setInvoices(inserted)
    }
  }, [])

  const loadExpenses = useCallback(async () => {
    const { data } = await api.from('expenses').select('*').order('date', { ascending: false })
    if (data && data.length > 0) {
      setExpenses(data)
    } else {
      const defaultExpenses = [
        { category: 'Utilities', description: 'Electric bill - December', amount: 45000, date: '2026-01-02', approved_by: 'Admin', status: 'approved' },
        { category: 'Supplies', description: 'Office supplies', amount: 12500, date: '2026-01-01', approved_by: 'Admin', status: 'approved' },
        { category: 'Maintenance', description: 'AC repair - Room 101', amount: 8500, date: '2025-12-28', approved_by: 'Admin', status: 'approved' },
        { category: 'Events', description: 'Science fair supplies', amount: 25000, date: '2026-01-03', approved_by: '', status: 'pending' },
      ]
      const { data: inserted } = await api.from('expenses').insert(defaultExpenses).select()
      if (inserted) setExpenses(inserted)
    }
  }, [])

  const loadEmployees = useCallback(async () => {
    const { data } = await api.from('employees').select('*').order('name')
    if (data && data.length > 0) {
      setEmployees(data)
    } else {
      const defaultEmployees = [
        { name: 'Dr. Maria Santos', position: 'Principal', department: 'Admin', salary: 85000, status: 'active' },
        { name: 'John Cruz', position: 'Math Teacher', department: 'Junior High', salary: 35000, status: 'active' },
        { name: 'Anna Reyes', position: 'English Teacher', department: 'Elementary', salary: 32000, status: 'active' },
        { name: 'Pedro Garcia', position: 'PE Teacher', department: 'Junior High', salary: 30000, status: 'active' },
        { name: 'Sofia Lim', position: 'Science Teacher', department: 'Senior High', salary: 38000, status: 'active' },
      ]
      const { data: inserted } = await api.from('employees').insert(defaultEmployees).select()
      if (inserted) setEmployees(inserted)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'payments') loadPayments()
    if (activeTab === 'overview' || activeTab === 'expenses') loadExpenses()
    if (activeTab === 'invoices') loadInvoices()
    if (activeTab === 'payroll') loadEmployees()
  }, [activeTab, loadPayments, loadInvoices, loadExpenses, loadEmployees])

  // Stats
  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  const totalPayroll = employees.filter(e => e.status === 'active').reduce((s, e) => s + e.salary, 0)

  const monthlyData = [
    { month: 'Jun', income: 850000, expenses: 320000 },
    { month: 'Jul', income: 420000, expenses: 290000 },
    { month: 'Aug', income: 380000, expenses: 310000 },
    { month: 'Sep', income: 410000, expenses: 285000 },
    { month: 'Oct', income: 450000, expenses: 295000 },
    { month: 'Nov', income: 390000, expenses: 300000 },
    { month: 'Dec', income: 350000, expenses: 340000 },
    { month: 'Jan', income: totalCollected || 480000, expenses: totalExpenses || 310000 },
  ]

  // Payment Handlers
  const handleAddPayment = async () => {
    if (!paymentForm.student_name || paymentForm.amount <= 0) return
    setSaving(true)
    try {
      const newPayment = {
        student_name: paymentForm.student_name,
        amount: paymentForm.amount,
        date: new Date().toISOString().split('T')[0],
        type: paymentForm.type,
        status: 'paid',
        reference: `PAY-2026-${String(payments.length + 1).padStart(3, '0')}`,
      }
      await api.from('payments').insert(newPayment)
      toast.success('Payment recorded successfully')
      setShowPaymentModal(false)
      setPaymentForm({ student_name: '', amount: 0, type: 'Tuition', reference: '' })
      loadPayments()
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePayment = async () => {
    if (deleteConfirm.type !== 'payment') return
    setDeleting(true)
    try {
      await api.from('payments').delete().eq('id', deleteConfirm.id)
      toast.success('Payment deleted')
      setDeleteConfirm({ open: false, type: '', id: '' })
      loadPayments()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  // Expense Handlers
  const handleAddExpense = async () => {
    if (!expenseForm.description || expenseForm.amount <= 0) return
    setSaving(true)
    try {
      const newExpense = {
        category: expenseForm.category,
        description: expenseForm.description,
        amount: expenseForm.amount,
        date: new Date().toISOString().split('T')[0],
        approved_by: '',
        status: 'pending',
      }
      await api.from('expenses').insert(newExpense)
      toast.success('Expense added successfully')
      setShowExpenseModal(false)
      setExpenseForm({ category: 'Utilities', description: '', amount: 0 })
      loadExpenses()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add expense')
    } finally {
      setSaving(false)
    }
  }

  const handleApproveExpense = async (id: string) => {
    await api.from('expenses').update({ status: 'approved', approved_by: 'Admin' }).eq('id', id)
    toast.success('Expense approved')
    loadExpenses()
  }

  const handleRejectExpense = async (id: string) => {
    await api.from('expenses').update({ status: 'rejected' }).eq('id', id)
    toast.warning('Expense rejected')
    loadExpenses()
  }

  const handleDeleteExpense = async () => {
    if (deleteConfirm.type !== 'expense') return
    setDeleting(true)
    try {
      await api.from('expenses').delete().eq('id', deleteConfirm.id)
      toast.success('Expense deleted')
      setDeleteConfirm({ open: false, type: '', id: '' })
      loadExpenses()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  // Invoice Handlers
  const handleAddInvoice = async () => {
    if (!invoiceForm.student_name || invoiceForm.amount <= 0) return
    setSaving(true)
    try {
      const newInvoice = {
        invoice_no: `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`,
        student_name: invoiceForm.student_name,
        amount: invoiceForm.amount,
        due_date: invoiceForm.due_date,
        status: 'pending',
        paid_amount: 0,
      }
      await api.from('invoices').insert(newInvoice)
      toast.success('Invoice created successfully')
      setShowInvoiceModal(false)
      setInvoiceForm({ student_name: '', amount: 0, due_date: '' })
      loadInvoices()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  // Payroll Handler
  const handleRunPayroll = async () => {
    const activeEmployees = employees.filter(e => e.status === 'active')
    await api.from('expenses').insert({
      category: 'Payroll',
      description: `Monthly payroll for ${activeEmployees.length} employees`,
      amount: totalPayroll,
      date: new Date().toISOString().split('T')[0],
      approved_by: 'System',
      status: 'approved',
    })
    toast.success(`Payroll processed for ${activeEmployees.length} employees. Total: ₱${totalPayroll.toLocaleString()}`)
    loadExpenses()
  }

  const handleDelete = () => {
    if (deleteConfirm.type === 'payment') handleDeletePayment()
    else if (deleteConfirm.type === 'expense') handleDeleteExpense()
  }

  // Columns
  const paymentColumns: Column<Payment>[] = [
    { key: 'reference', header: 'Reference', render: (row) => <span className="font-mono text-sm">{row.reference}</span> },
    { key: 'student_name', header: 'Student', render: (row) => <span className="font-medium">{row.student_name}</span> },
    { key: 'type', header: 'Type' },
    { key: 'amount', header: 'Amount', render: (row) => <span className="font-bold" style={{ color: '#5B8C51' }}>₱{row.amount.toLocaleString()}</span> },
    { key: 'date', header: 'Date' },
    { key: 'status', header: 'Status', render: (row) => (
      <Badge variant={row.status === 'paid' ? 'success' : row.status === 'pending' ? 'warning' : 'danger'}>{row.status}</Badge>
    )},
    { key: 'actions', header: '', sortable: false, render: (row) => (
      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteConfirm({ open: true, type: 'payment', id: row.id })}>🗑️</Button>
    )},
  ]

  const expenseColumns: Column<Expense>[] = [
    { key: 'category', header: 'Category', render: (row) => <Badge variant="default">{row.category}</Badge> },
    { key: 'description', header: 'Description', render: (row) => <span className="font-medium">{row.description}</span> },
    { key: 'amount', header: 'Amount', render: (row) => <span className="font-bold">₱{row.amount.toLocaleString()}</span> },
    { key: 'date', header: 'Date' },
    { key: 'status', header: 'Status', render: (row) => (
      <Badge variant={row.status === 'approved' ? 'success' : row.status === 'pending' ? 'warning' : 'danger'}>{row.status}</Badge>
    )},
    { key: 'actions', header: '', sortable: false, render: (row) => (
      <div className="flex gap-1">
        {row.status === 'pending' && (
          <>
            <Button variant="ghost" size="sm" onClick={() => handleApproveExpense(row.id)}>✓</Button>
            <Button variant="ghost" size="sm" onClick={() => handleRejectExpense(row.id)}>✕</Button>
          </>
        )}
        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteConfirm({ open: true, type: 'expense', id: row.id })}>🗑️</Button>
      </div>
    )},
  ]

  const invoiceColumns: Column<Invoice>[] = [
    { key: 'invoice_no', header: 'Invoice #', render: (row) => <span className="font-mono text-sm">{row.invoice_no}</span> },
    { key: 'student_name', header: 'Student', render: (row) => <span className="font-medium">{row.student_name}</span> },
    { key: 'amount', header: 'Total', render: (row) => `₱${row.amount.toLocaleString()}` },
    { key: 'paid_amount', header: 'Paid', render: (row) => <span style={{ color: '#5B8C51' }}>₱{row.paid_amount.toLocaleString()}</span> },
    { key: 'balance', header: 'Balance', render: (row) => <span className="text-red-600">₱{(row.amount - row.paid_amount).toLocaleString()}</span> },
    { key: 'due_date', header: 'Due Date' },
    { key: 'status', header: 'Status', render: (row) => (
      <Badge variant={row.status === 'paid' ? 'success' : row.status === 'partial' ? 'primary' : row.status === 'pending' ? 'warning' : 'danger'}>{row.status}</Badge>
    )},
  ]

  const employeeColumns: Column<Employee>[] = [
    { key: 'name', header: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'position', header: 'Position' },
    { key: 'department', header: 'Department' },
    { key: 'salary', header: 'Salary', render: (row) => <span className="font-bold" style={{ color: '#5B8C51' }}>₱{row.salary.toLocaleString()}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge> },
  ]

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'payments', label: '💳 Payments' },
    { key: 'invoices', label: '📄 Invoices' },
    { key: 'expenses', label: '💸 Expenses' },
    { key: 'payroll', label: '👥 Payroll' },
  ]

  const getHeaderActions = () => {
    switch (activeTab) {
      case 'payments': return <Button onClick={() => setShowPaymentModal(true)} icon="➕">Record Payment</Button>
      case 'invoices': return <Button onClick={() => setShowInvoiceModal(true)} icon="➕">Create Invoice</Button>
      case 'expenses': return <Button onClick={() => setShowExpenseModal(true)} icon="➕">Add Expense</Button>
      case 'payroll': return <Button onClick={handleRunPayroll} icon="🏃">Run Payroll</Button>
      default: return null
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Finance" subtitle="Manage payments, expenses, and payroll" icon="💰" actions={getHeaderActions()} />

      {/* Tabs */}
      <Tabs tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as FinanceTab)} variant="pills" className="mb-6" />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <StatsBar stats={[
            { label: 'Total Collected', value: `₱${totalCollected.toLocaleString()}`, icon: '💵', color: '#5B8C51' },
            { label: 'Pending', value: `₱${totalPending.toLocaleString()}`, icon: '⏳', color: '#EAB308' },
            { label: 'Overdue', value: `₱${totalOverdue.toLocaleString()}`, icon: '⚠️', color: '#EF4444' },
            { label: 'Expenses', value: `₱${totalExpenses.toLocaleString()}`, icon: '💸', color: '#6B7280' },
          ]} />

          <Card>
            <h3 className="font-bold text-gray-800 mb-4">Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `₱${v / 1000}K`} />
                <Bar dataKey="income" fill="#5B8C51" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#E8A838" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5B8C51' }}></div><span className="text-sm text-gray-600">Income</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E8A838' }}></div><span className="text-sm text-gray-600">Expenses</span></div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <h3 className="font-bold text-gray-800 mb-4">Recent Payments</h3>
              <div className="space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-800">{payment.student_name}</p>
                      <p className="text-sm text-gray-500">{payment.type} • {payment.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: '#5B8C51' }}>₱{payment.amount.toLocaleString()}</p>
                      <Badge size="sm" variant={payment.status === 'paid' ? 'success' : payment.status === 'pending' ? 'warning' : 'danger'}>{payment.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-bold text-gray-800 mb-4">Recent Expenses</h3>
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-800">{expense.description}</p>
                      <p className="text-sm text-gray-500">{expense.category} • {expense.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">₱{expense.amount.toLocaleString()}</p>
                      <Badge size="sm" variant={expense.status === 'approved' ? 'success' : expense.status === 'pending' ? 'warning' : 'danger'}>{expense.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <DataTable data={payments} columns={paymentColumns} loading={loading} pagination pageSize={10} emptyIcon="💳" emptyTitle="No payments found" />
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <DataTable data={invoices} columns={invoiceColumns} loading={loading} pagination pageSize={10} emptyIcon="📄" emptyTitle="No invoices found" />
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <DataTable data={expenses} columns={expenseColumns} loading={loading} pagination pageSize={10} emptyIcon="💸" emptyTitle="No expenses found" />
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <StatsBar stats={[
            { label: 'Total Employees', value: employees.length, icon: '👥' },
            { label: 'Active', value: employees.filter(e => e.status === 'active').length, icon: '✓', color: '#5B8C51' },
            { label: 'Monthly Payroll', value: `₱${totalPayroll.toLocaleString()}`, icon: '💰', color: '#3B82F6' },
            { label: 'Avg Salary', value: `₱${employees.length > 0 ? Math.round(totalPayroll / employees.filter(e => e.status === 'active').length).toLocaleString() : 0}`, icon: '📊' },
          ]} />
          <DataTable data={employees} columns={employeeColumns} loading={loading} pagination pageSize={10} emptyIcon="👥" emptyTitle="No employees found" />
        </div>
      )}

      {/* Payment Modal */}
      <FormModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSubmit={handleAddPayment} title="Record Payment" submitText="Save" submitLoading={saving}>
        <div className="space-y-4">
          <Input label="Student Name" value={paymentForm.student_name} onChange={(e) => setPaymentForm({ ...paymentForm, student_name: e.target.value })} required />
          <Input label="Amount (₱)" type="number" value={String(paymentForm.amount)} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} required />
          <Select label="Payment Type" value={paymentForm.type} onChange={(value) => setPaymentForm({ ...paymentForm, type: value })} options={paymentTypeOptions} />
        </div>
      </FormModal>

      {/* Expense Modal */}
      <FormModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} onSubmit={handleAddExpense} title="Add Expense" submitText="Save" submitLoading={saving}>
        <div className="space-y-4">
          <Select label="Category" value={expenseForm.category} onChange={(value) => setExpenseForm({ ...expenseForm, category: value })} options={expenseCategoryOptions} />
          <Input label="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required />
          <Input label="Amount (₱)" type="number" value={String(expenseForm.amount)} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} required />
        </div>
      </FormModal>

      {/* Invoice Modal */}
      <FormModal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} onSubmit={handleAddInvoice} title="Create Invoice" submitText="Save" submitLoading={saving}>
        <div className="space-y-4">
          <Input label="Student Name" value={invoiceForm.student_name} onChange={(e) => setInvoiceForm({ ...invoiceForm, student_name: e.target.value })} required />
          <Input label="Amount (₱)" type="number" value={String(invoiceForm.amount)} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} required />
          <Input label="Due Date" type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} required />
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={deleteConfirm.open} onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ open: false, type: '', id: '' })} title="Delete Record?" message="Are you sure you want to delete this record? This action cannot be undone." confirmText="Delete" variant="danger" loading={deleting} />
    </PageContainer>
  )
}
