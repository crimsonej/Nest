import { escapeHtml, groupRows } from './format'
import { cardsHtml, compactListHtml, sectionsHtml, tableHtml, type PrintDocument } from './print'
import { calendarColumns, eventDateRange, eventKindLabel, eventStatus } from './calendar'
import type { ReportColumnSpec, ReportMeta, ReportSummaryItem } from './types'
import type { SheetSpec } from './xlsx'
import type { SemesterEvent } from '@/types'

/** The preview layouts on the reports screen. Each one prints differently. */
export type ListLayout = 'table' | 'cards' | 'roster' | 'accordion'

export const LIST_LAYOUT_INFO: Record<ListLayout, string> = {
  table: 'Full table',
  cards: 'Record cards',
  roster: 'Compact list',
  accordion: 'Grouped sections',
}

interface ListOptions {
  layout: ListLayout
  meta: ReportMeta
  columns: ReportColumnSpec[]
  rows: any[]
  /** Heading used by the grouped layout, e.g. the course or course unit. */
  groupKey: (row: any) => string
  groupLabel: string
  titleOf: (row: any) => string
  subtitleOf: (row: any) => string
  summary?: ReportSummaryItem[]
  signatures?: string[]
}

export function listPrintDocument(options: ListOptions): PrintDocument {
  const { layout, columns, rows } = options
  const wide = columns.length > 6
  let bodyHtml: string
  let orientation: PrintDocument['orientation'] = wide ? 'landscape' : 'portrait'

  if (layout === 'accordion') {
    const sections = groupRows(rows, options.groupKey).map(([heading, list]) => ({ heading: `${options.groupLabel}: ${heading}`, rows: list }))
    bodyHtml = sectionsHtml(columns, sections)
  } else if (layout === 'cards') {
    bodyHtml = cardsHtml(columns, rows, options.titleOf, options.subtitleOf)
    orientation = 'portrait'
  } else if (layout === 'roster') {
    bodyHtml = compactListHtml(columns, rows, options.titleOf)
    orientation = 'portrait'
  } else {
    bodyHtml = tableHtml(columns, rows, { numbered: true })
  }

  return {
    meta: { ...options.meta, facts: [...(options.meta.facts || []), ['Layout', LIST_LAYOUT_INFO[layout]]] },
    orientation,
    summary: options.summary || [{ label: 'Records', value: rows.length }],
    bodyHtml,
    signatures: options.signatures,
  }
}

export function listSheets(options: Pick<ListOptions, 'layout' | 'columns' | 'rows' | 'groupKey' | 'groupLabel' | 'summary'> & { name: string }): SheetSpec[] {
  const summary = options.summary || [{ label: 'Records', value: options.rows.length }]
  if (options.layout === 'accordion') {
    const groups = groupRows(options.rows, options.groupKey)
    return [{
      name: options.name,
      columns: options.columns,
      summary: [...summary, { label: `${options.groupLabel}s`, value: groups.length }],
      sections: groups.map(([heading, list]) => ({ heading: `${options.groupLabel}: ${heading}  (${list.length})`, rows: list })),
    }]
  }
  return [{ name: options.name, columns: options.columns, sections: [{ rows: options.rows }], summary }]
}

// ── Semester calendar ──────────────────────────────────────────────────────

export function calendarSummary(events: SemesterEvent[]): ReportSummaryItem[] {
  const done = events.filter((event) => eventStatus(event) === 'Completed').length
  const now = events.filter((event) => eventStatus(event) === 'In progress').length
  return [
    { label: 'Events', value: events.length },
    { label: 'Completed', value: done },
    { label: 'In progress', value: now },
    { label: 'Upcoming', value: events.length - done - now },
  ]
}

/** Calendar as a timeline (default) or a dated table. */
export function calendarPrintHtml(events: SemesterEvent[], style: 'timeline' | 'table' = 'timeline') {
  if (events.length === 0) return '<p class="muted">No calendar events have been added for this semester yet.</p>'
  if (style === 'table') return tableHtml(calendarColumns, events, { numbered: true })
  return `<div class="timeline">${events
    .map((event) => {
      const status = eventStatus(event)
      const tone = status === 'Completed' ? 'info' : status === 'In progress' ? 'ok' : 'warn'
      return `<div class="ev ${status === 'Completed' ? 'done' : ''}">
        <div class="when">${escapeHtml(eventDateRange(event))}</div>
        <div class="what"><b>${escapeHtml(event.title)}</b><span>${escapeHtml(eventKindLabel(event.kind))}${event.description ? ` · ${escapeHtml(event.description)}` : ''}</span></div>
        <span class="tag ${tone}">${status}</span>
      </div>`
    })
    .join('')}</div>`
}
