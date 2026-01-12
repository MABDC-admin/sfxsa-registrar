import type { AcademicYear } from '../types'

type AcademicYearSelectorProps = {
  years: AcademicYear[]
  value: string | null
  onChange: (id: string) => void
  loading?: boolean
}

export function AcademicYearSelector({
  years,
  value,
  onChange,
  loading = false,
}: AcademicYearSelectorProps) {
  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-green-100">
      <span className="text-sm font-medium text-gray-600">Academic Year</span>
      <select
        className="border border-green-200 rounded-md px-3 py-1.5 text-sm font-medium text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50 disabled:opacity-50"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || years.length === 0}
      >
        {years.length === 0 && <option value="">No years available</option>}
        {years.map((y) => (
          <option key={y.id} value={y.id}>
            {y.name}
          </option>
        ))}
      </select>
    </div>
  )
}
