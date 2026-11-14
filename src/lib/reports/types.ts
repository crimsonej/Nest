/** Shared shapes for every report the app exports (CSV, Excel and printable PDF). */

export type CellValue = string | number | null | undefined

export interface ReportColumnSpec {
  key: string
  header: string
  value: (row: any) => CellValue
  /** Right-align and store as a number in Excel. */
  numeric?: boolean
  /** Registration numbers, codes: shown in a monospace face when printed. */
  mono?: boolean
}

export interface ReportSection {
  heading?: string
  note?: string
  rows: any[]
  columns?: ReportColumnSpec[]
}

export interface ReportSummaryItem {
  label: string
  value: string | number
}

export interface ReportMeta {
  /** e.g. "Group Summary". */
  title: string
  /** One line under the title, e.g. "CSC 2101 · Software Engineering". */
  subtitle?: string
  /** e.g. "Semester 1 · 2026/2027". */
  semester?: string
  /** Who produced it, e.g. "Coordinator workspace". */
  preparedBy?: string
  /** Extra label/value pairs shown in the document header. */
  facts?: [string, string][]
}
