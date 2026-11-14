import { defaultUniversity } from '@/lib/university-config'
import type { CellValue } from './types'

export const REPORT_UNIVERSITY = defaultUniversity.university
export const REPORT_CAMPUS = `${defaultUniversity.branch} · ${defaultUniversity.location}`

export function escapeHtml(value: CellValue) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function cellText(value: CellValue) {
  if (value === null || value === undefined) return ''
  return String(value)
}

/** "14 Nov 2026" for a date or ISO string; empty for nothing. */
export function shortDate(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function generatedStamp() {
  return new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fileStamp() {
  return new Date().toISOString().slice(0, 10)
}

export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'report'
}

export function reportFileName(parts: (string | null | undefined)[], extension: string) {
  return `${parts.filter(Boolean).map((part) => slug(String(part))).join('_')}_${fileStamp()}.${extension}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Groups rows by a key while keeping first-seen order. */
export function groupRows<T>(rows: T[], keyOf: (row: T) => string) {
  const map = new Map<string, T[]>()
  rows.forEach((row) => {
    const key = keyOf(row) || 'Unassigned'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(row)
  })
  return Array.from(map.entries())
}
