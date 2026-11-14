import { cellText, downloadBlob } from './format'
import type { ReportColumnSpec } from './types'

function csvCell(value: string) {
  // Stop spreadsheet apps from running cell text as a formula.
  const safe = /^[=@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Plain, flat CSV (one header row) that opens cleanly in Excel, Sheets and LibreOffice. */
export function downloadCsv(filename: string, columns: ReportColumnSpec[], rows: any[]) {
  const lines = [
    columns.map((column) => csvCell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(cellText(column.value(row)))).join(',')),
  ]
  downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), filename)
}
