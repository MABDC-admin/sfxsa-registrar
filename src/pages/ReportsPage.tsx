import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { useSchoolYear } from '../contexts/SchoolYearContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

type ReportType = 'enrollment' | 'attendance' | 'academic' | 'financial' | 'teachers'

interface StudentStats {
  total: number
  male: number
  female: number
  byGrade: { grade: string; count: number }[]
}

interface AttendanceStats {
  averageRate: number
  monthlyData: { month: string; rate: number }[]
}

interface AcademicStats {
  passRate: number
  averageGrade: number
  distribution: { range: string; count: number }[]
}

interface FinancialStats {
  totalCollected: number
  totalExpected: number
  outstanding: number
  monthlyRevenue: { month: string; amount: number }[]
}

export function ReportsPage() {
  const { selectedYear } = useSchoolYear()
  const [activeReport, setActiveReport] = useState<ReportType>('enrollment')
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '2025-06-01', end: '2026-03-31' })

  // Stats
  const [studentStats, setStudentStats] = useState<StudentStats>({
    total: 534, male: 278, female: 256,
    byGrade: [
      { grade: 'Kindergarten', count: 87 },
      { grade: 'Grade 1', count: 48 }, { grade: 'Grade 2', count: 46 },
      { grade: 'Grade 3', count: 44 }, { grade: 'Grade 4', count: 42 },
      { grade: 'Grade 5', count: 40 }, { grade: 'Grade 6', count: 38 },
      { grade: 'Grade 7', count: 36 }, { grade: 'Grade 8', count: 35 },
      { grade: 'Grade 9', count: 33 }, { grade: 'Grade 10', count: 30 },
      { grade: 'Grade 11', count: 28 }, { grade: 'Grade 12', count: 27 },
    ]
  })

  const [attendanceStats, _setAttendanceStats] = useState<AttendanceStats>({
    averageRate: 92.5,
    monthlyData: [
      { month: 'Jun', rate: 95 }, { month: 'Jul', rate: 93 },
      { month: 'Aug', rate: 91 }, { month: 'Sep', rate: 94 },
      { month: 'Oct', rate: 92 }, { month: 'Nov', rate: 90 },
      { month: 'Dec', rate: 88 }, { month: 'Jan', rate: 93 },
      { month: 'Feb', rate: 94 }, { month: 'Mar', rate: 95 },
    ]
  })

  const [academicStats, _setAcademicStats] = useState<AcademicStats>({
    passRate: 94.2,
    averageGrade: 85.6,
    distribution: [
      { range: '90-100', count: 145 },
      { range: '80-89', count: 198 },
      { range: '75-79', count: 124 },
      { range: '70-74', count: 45 },
      { range: 'Below 70', count: 22 },
    ]
  })

  const [financialStats, _setFinancialStats] = useState<FinancialStats>({
    totalCollected: 4250000,
    totalExpected: 5100000,
    outstanding: 850000,
    monthlyRevenue: [
      { month: 'Jun', amount: 850000 }, { month: 'Jul', amount: 420000 },
      { month: 'Aug', amount: 380000 }, { month: 'Sep', amount: 410000 },
      { month: 'Oct', amount: 450000 }, { month: 'Nov', amount: 390000 },
      { month: 'Dec', amount: 350000 }, { month: 'Jan', amount: 480000 },
      { month: 'Feb', amount: 320000 }, { month: 'Mar', amount: 200000 },
    ]
  })

  const [teacherStats, _setTeacherStats] = useState({
    total: 42,
    fullTime: 35,
    partTime: 7,
    byDepartment: [
      { dept: 'Elementary', count: 15 },
      { dept: 'Junior High', count: 12 },
      { dept: 'Senior High', count: 10 },
      { dept: 'Special Ed', count: 5 },
    ]
  })

  // Load real student data
  const loadStudentStats = useCallback(async () => {
    setLoading(true)
    const { data, count } = await api
      .from('student_records')
      .select('*', { count: 'exact' })
      .eq('school_year', selectedYear)

    if (data && data.length > 0) {
      const male = data.filter((s: any) => s.gender?.toLowerCase() === 'male' || s.gender?.toLowerCase() === 'm').length
      const female = data.filter((s: any) => s.gender?.toLowerCase() === 'female' || s.gender?.toLowerCase() === 'f').length
      
      const gradeMap: Record<string, number> = {}
      data.forEach((s: any) => {
        const grade = s.grade_level || s.level || 'Unknown'
        gradeMap[grade] = (gradeMap[grade] || 0) + 1
      })
      
      const byGrade = Object.entries(gradeMap).map(([grade, cnt]) => ({ grade, count: cnt }))
      
      setStudentStats({
        total: count || data.length,
        male,
        female,
        byGrade
      })
    }
    setLoading(false)
  }, [selectedYear])

  useEffect(() => {
    if (activeReport === 'enrollment') loadStudentStats()
  }, [activeReport, loadStudentStats])

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    alert(`Exporting ${activeReport} report as ${format.toUpperCase()}...`)
  }

  const handlePrint = () => {
    window.print()
  }

  const COLORS = ['#5B8C51', '#8BB87D', '#C5DEB8', '#E8F5E3', '#F5FAF3']

  const reports = [
    { id: 'enrollment', label: 'Enrollment', icon: '👥', desc: 'Student enrollment statistics' },
    { id: 'attendance', label: 'Attendance', icon: '✅', desc: 'Attendance rates and trends' },
    { id: 'academic', label: 'Academic', icon: '📊', desc: 'Grades and performance' },
    { id: 'financial', label: 'Financial', icon: '💰', desc: 'Revenue and collections' },
    { id: 'teachers', label: 'Teachers', icon: '👨‍🏫', desc: 'Staff statistics' },
  ]

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📊 Reports</h1>
          <p className="text-gray-500">Generate and view system reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">📄 CSV</button>
          <button onClick={() => handleExport('excel')} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">📊 Excel</button>
          <button onClick={() => handleExport('pdf')} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">📑 PDF</button>
          <button onClick={handlePrint} className="px-4 py-2 rounded-xl text-white font-medium" style={{ backgroundColor: '#5B8C51' }}>🖨️ Print</button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex gap-2">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id as ReportType)}
              className={`flex-1 p-4 rounded-xl text-left transition-all ${
                activeReport === report.id ? 'text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              style={activeReport === report.id ? { backgroundColor: '#5B8C51' } : {}}
            >
              <span className="text-2xl block mb-1">{report.icon}</span>
              <span className="font-bold block">{report.label}</span>
              <span className={`text-xs ${activeReport === report.id ? 'text-white/80' : 'text-gray-500'}`}>{report.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex items-center gap-4">
        <span className="text-gray-600 font-medium">📅 Date Range:</span>
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          className="px-4 py-2 rounded-xl border border-gray-200 outline-none"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          className="px-4 py-2 rounded-xl border border-gray-200 outline-none"
        />
        <span className="text-sm text-gray-500 ml-4">School Year: {selectedYear}</span>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center text-gray-500">Loading report data...</div>
      ) : (
        <>
          {/* Enrollment Report */}
          {activeReport === 'enrollment' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Total Students</p>
                  <p className="text-4xl font-bold text-gray-800">{studentStats.total}</p>
                  <p className="text-sm text-green-600 mt-1">+12% vs last year</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Male Students</p>
                  <p className="text-4xl font-bold" style={{ color: '#4A90D9' }}>{studentStats.male}</p>
                  <p className="text-sm text-gray-500 mt-1">{((studentStats.male / studentStats.total) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Female Students</p>
                  <p className="text-4xl font-bold" style={{ color: '#E8A838' }}>{studentStats.female}</p>
                  <p className="text-sm text-gray-500 mt-1">{((studentStats.female / studentStats.total) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Grade Levels</p>
                  <p className="text-4xl font-bold text-gray-800">{studentStats.byGrade.length}</p>
                  <p className="text-sm text-gray-500 mt-1">Active levels</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Students by Grade Level</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={studentStats.byGrade}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Bar dataKey="count" fill="#5B8C51" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Gender Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Male', value: studentStats.male },
                          { name: 'Female', value: studentStats.female }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#4A90D9" />
                        <Cell fill="#E8A838" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Enrollment by Grade Level</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Grade Level</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Total Students</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Percentage</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Capacity</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.byGrade.map((grade, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{grade.grade}</td>
                        <td className="py-3 px-4">{grade.count}</td>
                        <td className="py-3 px-4">{((grade.count / studentStats.total) * 100).toFixed(1)}%</td>
                        <td className="py-3 px-4">50</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${grade.count >= 45 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {grade.count >= 45 ? 'Near Full' : 'Available'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance Report */}
          {activeReport === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Average Attendance</p>
                  <p className="text-4xl font-bold" style={{ color: '#5B8C51' }}>{attendanceStats.averageRate}%</p>
                  <p className="text-sm text-green-600 mt-1">Above 80% threshold</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Present Today</p>
                  <p className="text-4xl font-bold text-gray-800">498</p>
                  <p className="text-sm text-gray-500 mt-1">93.3% of enrolled</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Absent Today</p>
                  <p className="text-4xl font-bold text-red-500">36</p>
                  <p className="text-sm text-gray-500 mt-1">6.7% of enrolled</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">At Risk Students</p>
                  <p className="text-4xl font-bold text-orange-500">12</p>
                  <p className="text-sm text-gray-500 mt-1">Below 80% attendance</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Monthly Attendance Rate</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attendanceStats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
                    <Line type="monotone" dataKey="rate" stroke="#5B8C51" strokeWidth={3} dot={{ fill: '#5B8C51' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Academic Report */}
          {activeReport === 'academic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Pass Rate</p>
                  <p className="text-4xl font-bold" style={{ color: '#5B8C51' }}>{academicStats.passRate}%</p>
                  <p className="text-sm text-green-600 mt-1">+2.1% vs last term</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Average Grade</p>
                  <p className="text-4xl font-bold text-gray-800">{academicStats.averageGrade}</p>
                  <p className="text-sm text-gray-500 mt-1">Out of 100</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Honor Students</p>
                  <p className="text-4xl font-bold" style={{ color: '#E8A838' }}>145</p>
                  <p className="text-sm text-gray-500 mt-1">27.2% of students</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">At Risk</p>
                  <p className="text-4xl font-bold text-red-500">22</p>
                  <p className="text-sm text-gray-500 mt-1">Below passing grade</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Grade Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={academicStats.distribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="range" type="category" width={80} />
                      <Bar dataKey="count" fill="#5B8C51" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Performance by Category</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={academicStats.distribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="count"
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {academicStats.distribution.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Financial Report */}
          {activeReport === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Total Collected</p>
                  <p className="text-4xl font-bold" style={{ color: '#5B8C51' }}>₱{(financialStats.totalCollected / 1000000).toFixed(2)}M</p>
                  <p className="text-sm text-green-600 mt-1">{((financialStats.totalCollected / financialStats.totalExpected) * 100).toFixed(1)}% collected</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Expected Revenue</p>
                  <p className="text-4xl font-bold text-gray-800">₱{(financialStats.totalExpected / 1000000).toFixed(2)}M</p>
                  <p className="text-sm text-gray-500 mt-1">Total billable</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Outstanding</p>
                  <p className="text-4xl font-bold text-orange-500">₱{(financialStats.outstanding / 1000).toFixed(0)}K</p>
                  <p className="text-sm text-gray-500 mt-1">Pending payments</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Collection Rate</p>
                  <p className="text-4xl font-bold" style={{ color: '#5B8C51' }}>{((financialStats.totalCollected / financialStats.totalExpected) * 100).toFixed(1)}%</p>
                  <p className="text-sm text-green-600 mt-1">On track</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Monthly Revenue</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={financialStats.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `₱${v / 1000}K`} />
                    <Bar dataKey="amount" fill="#5B8C51" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Revenue Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Tuition Fees', amount: 3200000, pct: 75 },
                      { label: 'Registration', amount: 425000, pct: 10 },
                      { label: 'Laboratory', amount: 212500, pct: 5 },
                      { label: 'Other Fees', amount: 412500, pct: 10 },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                          <span className="text-gray-700">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">₱{(item.amount / 1000).toFixed(0)}K</span>
                          <span className="text-sm text-gray-500 ml-2">({item.pct}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Collection Status</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Fully Paid</span>
                        <span className="font-bold text-green-600">68%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: '68%', backgroundColor: '#5B8C51' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Partial Payment</span>
                        <span className="font-bold text-yellow-600">22%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: '22%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">No Payment</span>
                        <span className="font-bold text-red-600">10%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Teachers Report */}
          {activeReport === 'teachers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Total Teachers</p>
                  <p className="text-4xl font-bold text-gray-800">{teacherStats.total}</p>
                  <p className="text-sm text-gray-500 mt-1">Active faculty</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Full-Time</p>
                  <p className="text-4xl font-bold" style={{ color: '#5B8C51' }}>{teacherStats.fullTime}</p>
                  <p className="text-sm text-gray-500 mt-1">{((teacherStats.fullTime / teacherStats.total) * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Part-Time</p>
                  <p className="text-4xl font-bold" style={{ color: '#E8A838' }}>{teacherStats.partTime}</p>
                  <p className="text-sm text-gray-500 mt-1">{((teacherStats.partTime / teacherStats.total) * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Student-Teacher Ratio</p>
                  <p className="text-4xl font-bold text-gray-800">13:1</p>
                  <p className="text-sm text-green-600 mt-1">Ideal ratio</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Teachers by Department</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={teacherStats.byDepartment}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {teacherStats.byDepartment.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Department Overview</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-sm text-gray-600">Department</th>
                        <th className="text-left py-2 text-sm text-gray-600">Teachers</th>
                        <th className="text-left py-2 text-sm text-gray-600">Students</th>
                        <th className="text-left py-2 text-sm text-gray-600">Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { dept: 'Elementary', teachers: 15, students: 215 },
                        { dept: 'Junior High', teachers: 12, students: 141 },
                        { dept: 'Senior High', teachers: 10, students: 85 },
                        { dept: 'Special Ed', teachers: 5, students: 35 },
                      ].map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 font-medium">{row.dept}</td>
                          <td className="py-2">{row.teachers}</td>
                          <td className="py-2">{row.students}</td>
                          <td className="py-2">{Math.round(row.students / row.teachers)}:1</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
