import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

// ============================================
// BREADCRUMB COMPONENT
// ============================================
export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-gray-400">/</span>
            )}
            {item.href && index < items.length - 1 ? (
              <Link
                to={item.href}
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium flex items-center gap-1">
                {item.icon}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// Auto-generate breadcrumbs from route config
const routeLabels: Record<string, { label: string; icon?: string }> = {
  '/': { label: 'Dashboard', icon: '🏠' },
  '/students': { label: 'Students', icon: '👥' },
  '/classes': { label: 'Classes', icon: '📚' },
  '/teachers': { label: 'Teachers', icon: '👨‍🏫' },
  '/finance': { label: 'Finance', icon: '💰' },
  '/attendance': { label: 'Attendance', icon: '📋' },
  '/grades': { label: 'Grades', icon: '📊' },
  '/calendar': { label: 'Calendar', icon: '📅' },
  '/settings': { label: 'Settings', icon: '⚙️' },
  '/reports': { label: 'Reports', icon: '📈' },
  '/admins': { label: 'Admins', icon: '👤' },
  '/registrars': { label: 'Registrars', icon: '📝' },
  '/principals': { label: 'Principals', icon: '🎓' },
  '/accounting': { label: 'Accounting', icon: '🧮' },
}

export function AutoBreadcrumb() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)
  
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/', icon: '🏠' }
  ]

  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const config = routeLabels[currentPath]
    
    items.push({
      label: config?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: index < pathSegments.length - 1 ? currentPath : undefined,
      icon: config?.icon,
    })
  })

  if (items.length === 1) return null

  return <Breadcrumb items={items} />
}

// ============================================
// PAGE HEADER COMPONENT
// ============================================
export interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  showBreadcrumb?: boolean
  actions?: ReactNode
  backHref?: string
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  icon,
  breadcrumbs,
  showBreadcrumb = true,
  actions,
  backHref,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Breadcrumb */}
      {showBreadcrumb && (
        <div className="mb-3">
          {breadcrumbs ? (
            <Breadcrumb items={breadcrumbs} />
          ) : (
            <AutoBreadcrumb />
          )}
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          {backHref && (
            <Link
              to={backHref}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          )}

          {/* Icon */}
          {icon && (
            <span className="text-3xl">{icon}</span>
          )}

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// PAGE CONTAINER COMPONENT
// ============================================
export interface PageContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const maxWidthStyles = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function PageContainer({
  children,
  className = '',
  maxWidth = 'full',
  padding = 'md',
}: PageContainerProps) {
  return (
    <div 
      className={`
        flex-1 
        ${paddingStyles[padding]}
        ${className}
      `}
      style={{ backgroundColor: '#F8FAF7' }}
    >
      <div className={`mx-auto ${maxWidthStyles[maxWidth]}`}>
        {children}
      </div>
    </div>
  )
}

// ============================================
// FILTER BAR COMPONENT
// ============================================
export interface FilterOption {
  key: string
  label: string
  type: 'select' | 'date' | 'dateRange' | 'search'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface FilterBarProps {
  filters: FilterOption[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  onClear?: () => void
  onSearch?: (term: string) => void
  searchValue?: string
  searchPlaceholder?: string
  className?: string
}

export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  onSearch,
  searchValue = '',
  searchPlaceholder = 'Search...',
  className = '',
}: FilterBarProps) {
  const hasActiveFilters = Object.values(values).some(v => v && v !== 'all' && v !== '')

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        {onSearch && (
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
            />
            {searchValue && (
              <button
                onClick={() => onSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        {filters.map((filter) => (
          <div key={filter.key}>
            {filter.type === 'select' && filter.options && (
              <select
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm bg-white"
              >
                <option value="">{filter.placeholder || `All ${filter.label}`}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            {filter.type === 'date' && (
              <input
                type="date"
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm"
              />
            )}
          </div>
        ))}

        {/* Clear Filters */}
        {hasActiveFilters && onClear && (
          <button
            onClick={onClear}
            className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          {Object.entries(values).map(([key, value]) => {
            if (!value || value === 'all' || value === '') return null
            const filter = filters.find(f => f.key === key)
            const label = filter?.options?.find(o => o.value === value)?.label || value
            
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm"
                style={{ backgroundColor: '#d4ecd4', color: '#3a5a34' }}
              >
                {filter?.label}: {label}
                <button
                  onClick={() => onChange(key, '')}
                  className="hover:bg-primary-200 rounded p-0.5"
                >
                  ✕
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// STATS BAR COMPONENT
// ============================================
export interface Stat {
  label: string
  value: string | number
  icon?: ReactNode
  change?: { value: number; type: 'increase' | 'decrease' }
  color?: string
}

export interface StatsBarProps {
  stats: Stat[]
  className?: string
}

export function StatsBar({ stats, className = '' }: StatsBarProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            {stat.icon && (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: stat.color ? `${stat.color}20` : '#d4ecd4' }}
              >
                {stat.icon}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
          {stat.change && (
            <div className={`mt-2 text-sm ${stat.change.type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
              {stat.change.type === 'increase' ? '↑' : '↓'} {Math.abs(stat.change.value)}%
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
