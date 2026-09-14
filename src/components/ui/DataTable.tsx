'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'

interface DataTableProps<T> {
  columns: Array<{
    key: string
    header: string
    render?: (row: T) => React.ReactNode
    className?: string
    sortable?: boolean
  }>
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  sorting?: {
    column: string
    direction: 'asc' | 'desc'
    onSort: (column: string) => void
  }
  selection?: {
    selectedKeys: Set<string>
    onSelectionChange: (keys: Set<string>) => void
  }
  actions?: (row: T) => React.ReactNode
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  pagination,
  sorting,
  selection,
  actions,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(sorting?.column || null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(sorting?.direction || 'asc')

  const handleSort = (column: string) => {
    if (!columns.find((c) => c.key === column)?.sortable) return
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    sorting?.onSort(column)
  }

  const handleSelectAll = () => {
    if (!selection) return
    if (selection.selectedKeys.size === data.length) {
      selection.onSelectionChange(new Set())
    } else {
      selection.onSelectionChange(new Set(data.map(keyExtractor)))
    }
  }

  const handleSelectRow = (key: string) => {
    if (!selection) return
    const newSelection = new Set(selection.selectedKeys)
    if (newSelection.has(key)) {
      newSelection.delete(key)
    } else {
      newSelection.add(key)
    }
    selection.onSelectionChange(newSelection)
  }

  if (loading) {
    return (
      <div className="w-full overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-sm scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-surface-hover/50">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3.5 text-left font-semibold text-text-secondary">
                  <div className="animate-pulse h-4 bg-text-muted/20 rounded w-3/4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/40">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div className="animate-pulse h-4 bg-text-muted/15 rounded w-1/2" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-sm scrollbar-thin">
      <table className="w-full text-sm text-left" role="grid">
        <thead>
          <tr className="border-b border-border/70 bg-surface-hover/60 text-xs font-bold uppercase tracking-wider text-text-secondary">
            {selection && (
              <th className="w-12 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={selection.selectedKeys.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('px-4 py-3.5 font-bold', col.className, col.sortable && 'cursor-pointer select-none hover:text-text-primary')}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center gap-1.5">
                  <span>{col.header}</span>
                  {col.sortable && sortColumn === col.key && (
                    <span className="text-primary">
                      {sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {actions && <th className="w-32 px-4 py-3.5 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-12 text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  'transition-colors duration-150 hover:bg-surface-hover/70',
                  onRowClick && 'cursor-pointer',
                  selection && selection.selectedKeys.has(keyExtractor(row)) && 'bg-primary/5'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selection && (
                  <td className="w-12 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selection.selectedKeys.has(keyExtractor(row))}
                      onChange={() => handleSelectRow(keyExtractor(row))}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                      aria-label={`Select row ${keyExtractor(row)}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3.5 text-text-primary', col.className)}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border/60 bg-surface-hover/30 text-xs sm:text-sm">
          <div className="text-text-secondary">
            Showing <strong className="font-semibold text-text-primary">{(pagination.page - 1) * pagination.pageSize + 1}</strong> to{' '}
            <strong className="font-semibold text-text-primary">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</strong> of{' '}
            <strong className="font-semibold text-text-primary">{pagination.total}</strong> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="btn btn-outline btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="btn btn-outline btn-sm"
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}