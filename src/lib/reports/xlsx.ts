import { REPORT_CAMPUS, REPORT_UNIVERSITY, cellText, downloadBlob, generatedStamp } from './format'
import type { ReportColumnSpec, ReportMeta, ReportSection, ReportSummaryItem } from './types'

export interface SheetSpec {
  name: string
  columns: ReportColumnSpec[]
  sections: ReportSection[]
  summary?: ReportSummaryItem[]
  /** Columns whose text should wrap (long member lists, notes). */
  wrapKeys?: string[]
}

const INK = 'FF14232B'
const MUTED = 'FF5B6B73'
const BRAND = 'FF1C4E63'
const BRAND_SOFT = 'FFE6EFF3'
const BAND = 'FFF6F9FA'
const RULE = 'FFD5DFE4'

const thin = { style: 'thin' as const, color: { argb: RULE } }
const cellBorder = { top: thin, left: thin, bottom: thin, right: thin }

function sheetName(name: string, used: Set<string>) {
  const base = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Report'
  let candidate = base
  let index = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${index++})`
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
  }
  used.add(candidate.toLowerCase())
  return candidate
}

function longestLine(text: string) {
  return text.split('\n').reduce((max, line) => Math.max(max, line.length), 0)
}

/**
 * Builds a formatted .xlsx (letterhead, styled header, banded rows, frozen header, filters,
 * sensible column widths and A4 print setup) and downloads it.
 */
export async function downloadXlsx(filename: string, meta: ReportMeta, sheets: SheetSpec[]) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'NEST'
  workbook.title = meta.title
  workbook.created = new Date()
  const usedNames = new Set<string>()
  const stamp = generatedStamp()

  for (const sheet of sheets) {
    const columns = sheet.columns
    const width = Math.max(columns.length, 2)
    const ws = workbook.addWorksheet(sheetName(sheet.name, usedNames), {
      views: [{ showGridLines: false }],
      pageSetup: {
        paperSize: 9,
        orientation: columns.length > 6 ? 'landscape' : 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
      },
      headerFooter: {
        oddFooter: `&L&8${REPORT_UNIVERSITY} · ${meta.title}&R&8Page &P of &N`,
      },
    })

    const mergeRow = (rowNumber: number) => ws.mergeCells(rowNumber, 1, rowNumber, width)

    // Letterhead
    const uni = ws.addRow([REPORT_UNIVERSITY.toUpperCase()])
    mergeRow(uni.number)
    uni.font = { name: 'Calibri', size: 16, bold: true, color: { argb: BRAND } }
    uni.height = 24

    const campus = ws.addRow([REPORT_CAMPUS])
    mergeRow(campus.number)
    campus.font = { size: 9, color: { argb: MUTED } }

    const title = ws.addRow([meta.title])
    mergeRow(title.number)
    title.font = { size: 13, bold: true, color: { argb: INK } }
    title.height = 20

    const lines = [meta.subtitle, meta.semester, `Generated ${stamp}${meta.preparedBy ? ` · ${meta.preparedBy}` : ''}`].filter(Boolean)
    lines.forEach((line) => {
      const row = ws.addRow([line])
      mergeRow(row.number)
      row.font = { size: 10, color: { argb: MUTED } }
    })

    ;(meta.facts || []).forEach(([label, value]) => {
      const row = ws.addRow([label, value])
      if (width > 2) ws.mergeCells(row.number, 2, row.number, width)
      row.getCell(1).font = { bold: true, size: 10, color: { argb: INK } }
      row.getCell(2).font = { size: 10, color: { argb: INK } }
    })

    // Rule under the letterhead
    const rule = ws.addRow([])
    for (let c = 1; c <= width; c += 1) rule.getCell(c).border = { bottom: { style: 'medium', color: { argb: BRAND } } }
    rule.height = 6
    ws.addRow([])

    if (sheet.summary?.length) {
      const heading = ws.addRow(['Summary'])
      mergeRow(heading.number)
      heading.font = { bold: true, size: 11, color: { argb: BRAND } }
      sheet.summary.forEach((item) => {
        const row = ws.addRow([item.label, item.value])
        row.getCell(1).font = { size: 10, color: { argb: MUTED } }
        row.getCell(2).font = { size: 10, bold: true, color: { argb: INK } }
        row.getCell(2).alignment = { horizontal: 'left' }
      })
      ws.addRow([])
    }

    const widths = columns.map((column) => Math.max(column.header.length + 2, 8))
    // Keep the label column wide enough for the facts and summary labels above the table.
    const labelWidth = Math.max(...[...(meta.facts || []).map(([label]) => label.length), ...(sheet.summary || []).map((item) => item.label.length), 8]) + 2
    widths[0] = Math.max(widths[0] || 8, labelWidth)
    let singleHeaderRow: number | null = null
    const flat = sheet.sections.length === 1 && !sheet.sections[0].heading

    sheet.sections.forEach((section, sectionIndex) => {
      const sectionColumns = section.columns || columns

      if (section.heading) {
        const heading = ws.addRow([section.heading])
        mergeRow(heading.number)
        heading.height = 20
        heading.eachCell((cell) => {
          cell.font = { bold: true, size: 11, color: { argb: BRAND } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_SOFT } }
          cell.alignment = { vertical: 'middle' }
        })
        for (let c = 1; c <= width; c += 1) {
          ws.getCell(heading.number, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_SOFT } }
        }
        if (section.note) {
          const note = ws.addRow([section.note])
          mergeRow(note.number)
          note.font = { size: 9, italic: true, color: { argb: MUTED } }
        }
      }

      const header = ws.addRow(sectionColumns.map((column) => column.header))
      header.height = 22
      header.eachCell((cell, colNumber) => {
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
        cell.alignment = { vertical: 'middle', horizontal: sectionColumns[colNumber - 1]?.numeric ? 'right' : 'left', wrapText: true }
        cell.border = cellBorder
      })
      if (flat) singleHeaderRow = header.number

      if (section.rows.length === 0) {
        const empty = ws.addRow(['No records'])
        mergeRow(empty.number)
        empty.font = { italic: true, size: 10, color: { argb: MUTED } }
      }

      section.rows.forEach((source, rowIndex) => {
        const values = sectionColumns.map((column) => {
          const raw = column.value(source)
          if (column.numeric) {
            const number = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(/[^0-9.-]/g, ''))
            return Number.isFinite(number) && String(raw ?? '').trim() !== '' ? number : cellText(raw)
          }
          return cellText(raw)
        })
        const row = ws.addRow(values)
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const column = sectionColumns[colNumber - 1]
          if (!column) return
          const wrap = sheet.wrapKeys?.includes(column.key) || String(cell.value ?? '').includes('\n')
          cell.font = { size: 10, color: { argb: INK }, name: column.mono ? 'Consolas' : undefined }
          cell.alignment = { vertical: 'top', horizontal: column.numeric ? 'right' : 'left', wrapText: wrap }
          cell.border = cellBorder
          if (rowIndex % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } }
          const text = cellText(cell.value as string)
          widths[colNumber - 1] = Math.max(widths[colNumber - 1] || 8, wrap ? Math.min(longestLine(text), 60) : longestLine(text) + 2)
        })
      })

      if (sectionIndex < sheet.sections.length - 1) ws.addRow([])
    })

    ws.columns.forEach((column, index) => {
      column.width = Math.min(Math.max(widths[index] || 10, 8), 60)
    })

    if (singleHeaderRow) {
      ws.views = [{ state: 'frozen', ySplit: singleHeaderRow, showGridLines: false }]
      ws.autoFilter = { from: { row: singleHeaderRow, column: 1 }, to: { row: singleHeaderRow, column: columns.length } }
      ws.pageSetup.printTitlesRow = `${singleHeaderRow}:${singleHeaderRow}`
    }

    ws.addRow([])
    const footer = ws.addRow([`Produced by NEST for ${REPORT_UNIVERSITY}. Figures reflect the records at the time of export.`])
    mergeRow(footer.number)
    footer.font = { size: 8, italic: true, color: { argb: MUTED } }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}
