'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react'

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
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  <div className="animate-pulse h-4 bg-secondary/20 w-3/4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <div className="animate-pulse h-4 bg-secondary/20 w-1/2" />
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
    <div className="table-container scrollbar-thin">
      <table className="table" role="grid">
        <thead>
          <tr>
            {selection && (
              <th className="w-12">
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
                className={cn(col.className, col.sortable && 'cursor-pointer select-none')}
                onClick={() => col.sortable && handleSort(col.key)}
                style={{ width: col.className?.includes('w-') ? undefined : 'auto' }}
              >
                <div className="flex items-center gap-1">
                  <span>{col.header}</span>
                  {col.sortable && sortColumn === col.key && (
                    <span className="text-primary">
                      {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {actions && <th className="w-32 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-8 text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  onRowClick && 'cursor-pointer',
                  selection && selection.selectedKeys.has(keyExtractor(row)) && 'bg-primary/5'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selection && (
                  <td className="w-12">
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
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
                {actions && (
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-hover/50">
          <div className="text-sm text-text-secondary">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="btn btn-outline btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="btn btn-outline btn-sm"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { ChevronUp } from 'lucide-react'