import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AttendanceMonth } from '../types'

type AttendanceTrendChartProps = {
  data: AttendanceMonth[]
  loading?: boolean
}

export function AttendanceTrendChart({ data, loading = false }: AttendanceTrendChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Attendance Trend (Monthly)</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Attendance Trend (Monthly)</h3>
        <div className="h-80 flex items-center justify-center text-gray-400">
          No attendance data available
        </div>
      </div>
    )
  }

  const chartData = data.map(item => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    presentRate: item.present_rate_pct,
    totalMarks: item.total_marks,
    presentMarks: item.present_marks,
  }))

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Attendance Trend (Monthly)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            domain={[0, 100]}
            label={{ value: 'Present Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line 
            type="monotone" 
            dataKey="presentRate" 
            stroke="#22c55e" 
            strokeWidth={3}
            dot={{ fill: '#22c55e', r: 4 }}
            activeDot={{ r: 6 }}
            name="Present Rate (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
