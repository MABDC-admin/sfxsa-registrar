type KpiCardProps = {
  label: string
  value: number
  icon?: React.ReactNode
  trend?: string
  loading?: boolean
}

export function KpiCard({ label, value, icon, trend, loading = false }: KpiCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <p className="mt-2 text-3xl font-bold text-green-600">
              {value.toLocaleString()}
            </p>
          )}
          {trend && (
            <p className="mt-2 text-xs text-gray-400">{trend}</p>
          )}
        </div>
        {icon && (
          <div className="ml-4 flex-shrink-0 text-green-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
