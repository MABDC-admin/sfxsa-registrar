type MoneyKpiCardProps = {
  label: string
  value: number
  currency?: string
  trend?: string
  loading?: boolean
  color?: 'green' | 'blue' | 'red' | 'orange'
}

export function MoneyKpiCard({ 
  label, 
  value, 
  currency = 'AED', 
  trend, 
  loading = false,
  color = 'green' 
}: MoneyKpiCardProps) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    orange: 'text-orange-600'
  }

  const bgClasses = {
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    red: 'bg-red-50',
    orange: 'bg-orange-50'
  }

  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm border border-green-50 hover:shadow-md transition-shadow ${bgClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-32 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <p className={`mt-2 text-3xl font-bold ${colorClasses[color]}`}>
              {currency} {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          {trend && (
            <p className="mt-2 text-xs text-gray-400">{trend}</p>
          )}
        </div>
      </div>
    </div>
  )
}
