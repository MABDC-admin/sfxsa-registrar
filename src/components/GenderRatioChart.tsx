import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { GenderRatio } from '../types'

type GenderRatioChartProps = {
  data: GenderRatio | null
  loading?: boolean
}

const COLORS = {
  male: '#3b82f6',
  female: '#ec4899',
  other: '#a855f7',
}

export function GenderRatioChart({ data, loading = false }: GenderRatioChartProps) {
  if (loading || !data) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Male/Female Ratio</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  const total = data.male_count + data.female_count + data.other_count
  
  if (total === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Male/Female Ratio</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    )
  }

  const chartData = [
    { name: 'Male', value: data.male_count, percentage: ((data.male_count / total) * 100).toFixed(0) },
    { name: 'Female', value: data.female_count, percentage: ((data.female_count / total) * 100).toFixed(0) },
    { name: 'Other', value: data.other_count, percentage: ((data.other_count / total) * 100).toFixed(0) },
  ].filter(item => item.value > 0)

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Male/Female Ratio</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props: any) => `${props.name} ${props.percentage}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell 
                key={`cell-${entry.name}`} 
                fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} 
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-gray-500">Male</p>
          <p className="font-semibold text-blue-600">{data.male_count}</p>
        </div>
        <div>
          <p className="text-gray-500">Female</p>
          <p className="font-semibold text-pink-600">{data.female_count}</p>
        </div>
        <div>
          <p className="text-gray-500">Other</p>
          <p className="font-semibold text-purple-600">{data.other_count}</p>
        </div>
      </div>
    </div>
  )
}
