'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Layers, LayoutList } from 'lucide-react'

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
  mobileView?: 'cards' | 'table' | 'auto'
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
  mobileView = 'auto',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(sorting?.column || null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(sorting?.direction || 'asc')
  const [forceMobileMode, setForceMobileMode] = useState<boolean | null>(null)

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
      <div className="w-full overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-sm">
        <div className="hidden sm:block overflow-x-auto scrollbar-thin">
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
        <div className="sm:hidden p-3 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/60 space-y-2 animate-pulse bg-surface-hover/30">
              <div className="h-4 bg-text-muted/20 rounded w-2/3" />
              <div className="h-3 bg-text-muted/15 rounded w-1/2" />
              <div className="h-3 bg-text-muted/15 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const isCardsVisibleOnMobile = forceMobileMode ?? (mobileView === 'cards' || mobileView === 'auto')

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-surface shadow-sm overflow-hidden">
      {/* Mobile Mode Switcher (visible only on small screens) */}
      <div className="flex sm:hidden items-center justify-between px-3.5 py-2 border-b border-border/60 bg-surface-hover/40 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          {data.length} {data.length === 1 ? 'Item' : 'Items'}
        </span>
        <button
          type="button"
          onClick={() => setForceMobileMode((prev) => (prev === null ? false : !prev))}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface border border-border text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          {isCardsVisibleOnMobile ? <LayoutList className="h-3.5 w-3.5 text-primary" /> : <Layers className="h-3.5 w-3.5 text-primary" />}
          <span>{isCardsVisibleOnMobile ? 'Switch to Table' : 'Switch to Cards'}</span>
        </button>
      </div>

      {/* MOBILE CARD VIEW (< sm breakpoint) */}
      {isCardsVisibleOnMobile && (
        <div className="block sm:hidden divide-y divide-border/60">
          {data.length === 0 ? (
            <div className="text-center py-10 px-4 text-text-muted text-xs">
              {emptyMessage}
            </div>
          ) : (
            data.map((row) => {
              const rowKey = keyExtractor(row)
              const isSelected = selection?.selectedKeys.has(rowKey)
              const firstCol = columns[0]
              const otherCols = columns.slice(1)

              return (
                <div
                  key={rowKey}
                  className={cn(
                    'p-4 transition-colors duration-150 space-y-2.5',
                    onRowClick && 'cursor-pointer hover:bg-surface-hover/50',
                    isSelected && 'bg-primary/5'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {selection && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowKey)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 shrink-0"
                          aria-label={`Select row ${rowKey}`}
                        />
                      )}
                      <div className="font-bold text-sm text-text-primary min-w-0 truncate">
                        {firstCol ? (firstCol.render ? firstCol.render(row) : (row as Record<string, unknown>)[firstCol.key] as React.ReactNode) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-1.5 text-xs pt-1 border-t border-border/40">
                    {otherCols.map((col) => (
                      <div key={col.key} className="flex justify-between items-center gap-2">
                        <span className="text-text-muted text-[11px] font-semibold shrink-0">{col.header}:</span>
                        <div className="text-text-primary font-medium text-right truncate max-w-[65%]">
                          {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                        </div>
                      </div>
                    ))}
                  </div>

                  {actions && (
                    <div
                      className="pt-2 border-t border-border/40 flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(row)}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* DESKTOP TABLE VIEW (sm+ or when table view forced on mobile) */}
      <div className={cn('w-full overflow-x-auto scrollbar-thin', isCardsVisibleOnMobile ? 'hidden sm:block' : 'block')}>
        <table className="w-full min-w-[600px] text-sm text-left border-collapse" role="grid">
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
                <td colSpan={columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-12 text-text-muted text-xs sm:text-sm">
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
      </div>

      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 border-t border-border/60 bg-surface-hover/30 text-xs sm:text-sm">
          <div className="text-text-secondary text-center sm:text-left">
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