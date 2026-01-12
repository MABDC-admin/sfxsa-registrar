import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

export interface Column<T> {
  key: string
  header: string | ReactNode
  render?: (row: T, index: number) => ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface BulkAction<T> {
  label: string
  icon?: ReactNode
  onClick: (selected: T[]) => void
  variant?: 'default' | 'danger' | 'primary'
  disabled?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  // Sorting
  sortable?: boolean
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  // Pagination
  pagination?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  totalCount?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  // Selection
  selectable?: boolean
  selectedRows?: T[]
  onSelectionChange?: (selected: T[]) => void
  rowKey?: keyof T | ((row: T) => string)
  // Bulk Actions
  bulkActions?: BulkAction<T>[]
  // Actions
  onRowClick?: (row: T) => void
  // Empty state
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  // Styling
  className?: string
  striped?: boolean
  hoverable?: boolean
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  sortable = true,
  defaultSort,
  onSort,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  totalCount,
  currentPage: controlledPage,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey = 'id',
  bulkActions = [],
  onRowClick,
  emptyIcon = '📭',
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.',
  emptyAction,
  className = '',
  striped = false,
  hoverable = true,
}: DataTableProps<T>) {
  // Internal state
  const [sortKey, setSortKey] = useState(defaultSort?.key || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSort?.direction || 'asc')
  const [internalPage, setInternalPage] = useState(1)
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize)

  const currentPage = controlledPage ?? internalPage
  const pageSize = internalPageSize

  // Get row key
  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') return rowKey(row)
    return String(row[rowKey])
  }

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey || onSort) return data // Let parent handle sorting if onSort provided
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      
      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortKey, sortDirection, onSort])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination || onPageChange) return sortedData // Let parent handle pagination if controlled
    
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize, pagination, onPageChange])

  const totalPages = Math.ceil((totalCount ?? data.length) / pageSize)
  const total = totalCount ?? data.length

  // Handlers
  const handleSort = (key: string) => {
    if (!sortable) return
    
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDirection(newDirection)
    onSort?.(key, newDirection)
  }

  const handlePageChange = (page: number) => {
    setInternalPage(page)
    onPageChange?.(page)
  }

  const handlePageSizeChange = (size: number) => {
    setInternalPageSize(size)
    setInternalPage(1)
    onPageSizeChange?.(size)
  }

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      onSelectionChange?.([])
    } else {
      onSelectionChange?.(paginatedData)
    }
  }

  const handleSelectRow = (row: T) => {
    const key = getRowKey(row)
    const isSelected = selectedRows.some(r => getRowKey(r) === key)
    
    if (isSelected) {
      onSelectionChange?.(selectedRows.filter(r => getRowKey(r) !== key))
    } else {
      onSelectionChange?.([...selectedRows, row])
    }
  }

  const isRowSelected = (row: T) => {
    return selectedRows.some(r => getRowKey(r) === getRowKey(row))
  }

  const allSelected = paginatedData.length > 0 && selectedRows.length === paginatedData.length

  // Clear selection
  const clearSelection = () => {
    onSelectionChange?.([])
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {/* Bulk Actions Toolbar */}
      {selectable && selectedRows.length > 0 && (
        <div className="px-4 py-3 bg-primary-50 border-b border-primary-100 flex items-center justify-between animate-slide-down" style={{ backgroundColor: 'rgba(91, 140, 81, 0.1)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary-700" style={{ color: '#5B8C51' }}>
              {selectedRows.length} item{selectedRows.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear selection
            </button>
          </div>
          {bulkActions.length > 0 && (
            <div className="flex items-center gap-2">
              {bulkActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => action.onClick(selectedRows)}
                  disabled={action.disabled}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5
                    ${action.variant === 'danger' 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-red-50' 
                      : action.variant === 'primary'
                      ? 'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 disabled:bg-gray-50'
                    }
                    disabled:cursor-not-allowed disabled:opacity-50
                  `}
                  style={action.variant === 'primary' ? { backgroundColor: '#5B8C51' } : undefined}
                >
                  {action.icon && <span>{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {selectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider
                    ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                    ${col.sortable !== false && sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                  `}
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && sortable && sortKey === col.key && (
                      <span className="text-primary-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <LoadingSpinner size="lg" className="mx-auto" />
                  <p className="mt-2 text-gray-500">Loading...</p>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <div className="text-4xl mb-2">{emptyIcon}</div>
                  <h3 className="text-lg font-medium text-gray-900">{emptyTitle}</h3>
                  <p className="text-gray-500 mt-1">{emptyDescription}</p>
                  {emptyAction && <div className="mt-4">{emptyAction}</div>}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={getRowKey(row)}
                  className={`
                    border-b border-gray-100 last:border-0
                    ${striped && index % 2 === 1 ? 'bg-gray-50' : ''}
                    ${hoverable ? 'hover:bg-gray-50' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${isRowSelected(row) ? 'bg-primary-50' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isRowSelected(row)}
                        onChange={() => handleSelectRow(row)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`
                        px-4 py-3 text-sm text-gray-700
                        ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                      `}
                    >
                      {col.render ? col.render(row, index) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && total > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} results
          </div>
          
          <div className="flex items-center gap-4">
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`
                      px-3 py-1 rounded-lg text-sm
                      ${currentPage === pageNum 
                        ? 'bg-primary-500 text-white' 
                        : 'border border-gray-200 hover:bg-gray-100'
                      }
                    `}
                    style={currentPage === pageNum ? { backgroundColor: '#5B8C51' } : undefined}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.2s ease-out; }
      `}</style>
    </div>
  )
}
