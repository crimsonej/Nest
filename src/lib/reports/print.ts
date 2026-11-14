import { REPORT_CAMPUS, REPORT_UNIVERSITY, escapeHtml, generatedStamp, groupRows } from './format'
import type { ReportColumnSpec, ReportMeta, ReportSummaryItem } from './types'

export type PrintOrientation = 'portrait' | 'landscape'

export interface PrintDocument {
  meta: ReportMeta
  bodyHtml: string
  orientation?: PrintOrientation
  summary?: ReportSummaryItem[]
  signatures?: string[]
}

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #14232b; font-size: 10.5px; line-height: 1.45; background: #fff; }
  .page { max-width: 1100px; margin: 0 auto; padding: 24px; }
  @media print { .page { padding: 0; max-width: none; } .no-print { display: none !important; } }

  .letterhead { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; border-bottom: 2.5px solid #1c4e63; }
  .letterhead img { width: 46px; height: 46px; object-fit: contain; }
  .letterhead .org { flex: 1; }
  .letterhead .org strong { display: block; font-size: 17px; letter-spacing: 0.08em; text-transform: uppercase; color: #1c4e63; }
  .letterhead .org span { font-size: 10px; color: #5b6b73; }
  .letterhead .doc-type { text-align: right; font-size: 9px; color: #5b6b73; text-transform: uppercase; letter-spacing: 0.12em; }
  .letterhead .doc-type b { display: block; font-size: 10px; color: #14232b; letter-spacing: 0.04em; }

  .title-block { margin: 16px 0 12px; }
  .title-block h1 { font-size: 19px; font-weight: 700; color: #14232b; }
  .title-block .sub { margin-top: 2px; font-size: 11.5px; color: #3c4d55; }
  .facts { display: flex; flex-wrap: wrap; gap: 4px 22px; margin-top: 8px; font-size: 10px; color: #5b6b73; }
  .facts b { color: #14232b; font-weight: 600; }

  .summary { display: grid; gap: 8px; margin: 12px 0 16px; }
  .summary div { border: 1px solid #d5dfe4; border-radius: 6px; padding: 8px 10px; background: #f6f9fa; break-inside: avoid; }
  .summary span { display: block; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #5b6b73; }
  .summary b { display: block; font-size: 17px; color: #1c4e63; margin-top: 2px; }

  h2.section { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 18px 0 6px; padding: 6px 10px; background: #e6eff3; border-left: 4px solid #1c4e63; font-size: 12px; color: #14232b; break-after: avoid; }
  h2.section small { font-size: 9.5px; font-weight: 500; color: #5b6b73; }
  .note { font-size: 9.5px; color: #5b6b73; margin: -2px 0 6px; }

  table.data { width: 100%; border-collapse: collapse; font-size: 9.8px; }
  table.data thead { display: table-header-group; }
  table.data th { background: #1c4e63; color: #fff; text-align: left; font-weight: 600; padding: 6px 7px; border: 1px solid #1c4e63; white-space: nowrap; }
  table.data td { padding: 5px 7px; border: 1px solid #d5dfe4; vertical-align: top; }
  table.data tbody tr:nth-child(even) td { background: #f6f9fa; }
  table.data tr { break-inside: avoid; }
  table.data .num { text-align: right; font-variant-numeric: tabular-nums; }
  table.data .idx { width: 30px; text-align: right; color: #7a8a91; }
  table.data .mono { font-family: Consolas, 'Courier New', monospace; font-size: 9.3px; }
  table.data tr.group-row td { background: #e6eff3 !important; font-weight: 700; color: #1c4e63; border-top: 1.5px solid #1c4e63; }
  table.data tr.group-row td small { font-weight: 500; color: #5b6b73; margin-left: 8px; }
  table.data tfoot td { font-size: 9px; color: #5b6b73; font-style: italic; background: #fff; }
  .muted { color: #7a8a91; }
  .tag { display: inline-block; padding: 1px 6px; border-radius: 9px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.02em; }
  .tag.lead { background: #1c4e63; color: #fff; }
  .tag.ok { background: #e3f3ec; color: #1d6b4c; }
  .tag.warn { background: #fbf1dc; color: #8a5800; }
  .tag.bad { background: #fbe9ea; color: #a12f39; }
  .tag.info { background: #e6eff3; color: #1c4e63; }

  .bar { height: 5px; width: 70px; background: #e3e9ec; border-radius: 3px; overflow: hidden; margin-top: 3px; }
  .bar i { display: block; height: 100%; background: #1c4e63; }

  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .landscape .cards { grid-template-columns: repeat(4, 1fr); }
  .card { border: 1px solid #d5dfe4; border-radius: 6px; padding: 8px 10px; break-inside: avoid; }
  .card h3 { font-size: 11px; color: #14232b; }
  .card .card-sub { font-size: 9px; color: #5b6b73; margin-bottom: 5px; }
  .card dl { display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; font-size: 9px; border-top: 1px solid #e3e9ec; padding-top: 5px; }
  .card dt { color: #7a8a91; }
  .card dd { color: #14232b; text-align: right; word-break: break-word; }

  ol.compact { columns: 2; column-gap: 22px; font-size: 9.8px; padding-left: 22px; }
  .landscape ol.compact { columns: 3; }
  ol.compact li { break-inside: avoid; padding: 3px 0; border-bottom: 1px dotted #d5dfe4; }
  ol.compact li b { color: #14232b; }
  ol.compact li span { display: block; color: #5b6b73; font-size: 9px; }

  .group-block { border: 1px solid #d5dfe4; border-radius: 6px; margin-top: 10px; break-inside: avoid; overflow: hidden; }
  .group-block header { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 10px; background: #f6f9fa; border-bottom: 1px solid #d5dfe4; }
  .group-block header h3 { font-size: 11.5px; }
  .group-block .meta-line { display: flex; flex-wrap: wrap; gap: 3px 16px; padding: 6px 10px 0; font-size: 9.3px; color: #3c4d55; }
  .group-block .meta-line b { color: #14232b; }
  .group-block table.data { margin: 6px 0 0; }
  .group-block table.data th { background: #f0f4f6; color: #14232b; border-color: #d5dfe4; }
  .unit-break { break-before: page; }

  .timeline { border-left: 2px solid #1c4e63; margin-left: 8px; padding-left: 18px; }
  .timeline .ev { position: relative; padding: 6px 0 8px; break-inside: avoid; border-bottom: 1px dotted #d5dfe4; display: grid; grid-template-columns: 150px 1fr auto; gap: 10px; align-items: baseline; }
  .timeline .ev::before { content: ''; position: absolute; left: -24px; top: 8px; width: 10px; height: 10px; border-radius: 50%; background: #fff; border: 2px solid #1c4e63; }
  .timeline .ev.done::before { background: #1c4e63; }
  .timeline .when { font-weight: 700; color: #1c4e63; font-size: 9.8px; }
  .timeline .what b { font-size: 10.5px; }
  .timeline .what span { display: block; font-size: 9px; color: #5b6b73; }

  .signatures { display: flex; justify-content: space-between; gap: 24px; margin-top: 42px; break-inside: avoid; }
  .signatures div { flex: 1; max-width: 210px; text-align: center; border-top: 1px solid #14232b; padding-top: 5px; font-size: 9.5px; font-weight: 600; }
  .signatures span { display: block; font-weight: 400; color: #5b6b73; font-size: 8.5px; }
  .end-note { margin-top: 18px; font-size: 8.5px; color: #7a8a91; text-align: center; }
  .toolbar { position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 24px; background: #f6f9fa; border-bottom: 1px solid #d5dfe4; }
  .toolbar button { font: 600 12px 'Segoe UI', Arial, sans-serif; padding: 7px 14px; border-radius: 6px; border: 1px solid #1c4e63; background: #1c4e63; color: #fff; cursor: pointer; }
  .toolbar button.ghost { background: #fff; color: #1c4e63; }
`

function summaryColumns(count: number) {
  if (count < 4) return `repeat(${count}, minmax(0, 150px))`
  return `repeat(${Math.min(count, 6)}, minmax(0, 1fr))`
}

function pageRule(orientation: PrintOrientation, footer: string) {
  const label = footer.replace(/["\\\n]/g, ' ')
  return `@page { size: A4 ${orientation}; margin: 14mm 12mm 16mm;
    @bottom-left { content: "${label}"; font: 8px 'Segoe UI', Arial, sans-serif; color: #5b6b73; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8px 'Segoe UI', Arial, sans-serif; color: #5b6b73; }
  }`
}

/**
 * Opens a print-ready A4 document in a new tab and starts printing once it has loaded
 * (the user can save it as PDF from the print dialog). Returns false if pop-ups are blocked.
 */
export function openPrintDocument(doc: PrintDocument) {
  const win = window.open('', '_blank')
  if (!win) return false

  const orientation = doc.orientation || 'portrait'
  const { meta } = doc
  const logo = `${window.location.origin}/logo.png`
  const facts = [
    meta.semester ? ['Semester', meta.semester] : null,
    ['Generated', generatedStamp()],
    meta.preparedBy ? ['Prepared from', meta.preparedBy] : null,
    ...(meta.facts || []),
  ].filter(Boolean) as [string, string][]

  win.document.open()
  win.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(`${REPORT_UNIVERSITY} – ${meta.title}`)}</title>
<style>${pageRule(orientation, `${REPORT_UNIVERSITY} · ${meta.title}`)}
${STYLES}</style>
</head>
<body class="${orientation}">
<div class="toolbar no-print"><button class="ghost" onclick="window.close()">Close</button><button onclick="window.print()">Print / Save as PDF</button></div>
<main class="page">
  <header class="letterhead">
    <img src="${logo}" alt="" />
    <div class="org"><strong>${escapeHtml(REPORT_UNIVERSITY)}</strong><span>${escapeHtml(REPORT_CAMPUS)}</span></div>
    <div class="doc-type">Official report<b>${escapeHtml(meta.title)}</b></div>
  </header>
  <section class="title-block">
    <h1>${escapeHtml(meta.title)}</h1>
    ${meta.subtitle ? `<p class="sub">${escapeHtml(meta.subtitle)}</p>` : ''}
    <div class="facts">${facts.map(([label, value]) => `<span><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</span>`).join('')}</div>
  </section>
  ${doc.summary?.length ? `<section class="summary" style="grid-template-columns: ${summaryColumns(doc.summary.length)}">${doc.summary.map((item) => `<div><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b></div>`).join('')}</section>` : ''}
  ${doc.bodyHtml}
  ${doc.signatures?.length ? `<section class="signatures">${doc.signatures.map((role) => `<div>${escapeHtml(role)}<span>Name, signature &amp; date</span></div>`).join('')}</section>` : ''}
  <p class="end-note">Produced by NEST for ${escapeHtml(REPORT_UNIVERSITY)}. Figures reflect the records at the time of export.</p>
</main>
<script>
  window.addEventListener('load', function () { setTimeout(function () { window.focus(); window.print(); }, 350); });
</script>
</body>
</html>`)
  win.document.close()
  return true
}

// ── Body builders ─────────────────────────────────────────────────────────

function cellHtml(column: ReportColumnSpec, row: any) {
  const value = column.value(row)
  const text = value === null || value === undefined || value === '' ? '<span class="muted">—</span>' : escapeHtml(value)
  const classes = [column.numeric ? 'num' : '', column.mono ? 'mono' : ''].filter(Boolean).join(' ')
  return `<td${classes ? ` class="${classes}"` : ''}>${text}</td>`
}

export function tableHtml(columns: ReportColumnSpec[], rows: any[], options: { numbered?: boolean; groupBy?: (row: any) => string; groupNote?: (key: string, rows: any[]) => string } = {}) {
  const span = columns.length + (options.numbered ? 1 : 0)
  const head = `<thead><tr>${options.numbered ? '<th class="idx">#</th>' : ''}${columns.map((column) => `<th${column.numeric ? ' class="num"' : ''}>${escapeHtml(column.header)}</th>`).join('')}</tr></thead>`

  let index = 0
  const renderRows = (list: any[]) => list.map((row) => `<tr>${options.numbered ? `<td class="idx">${++index}</td>` : ''}${columns.map((column) => cellHtml(column, row)).join('')}</tr>`).join('')

  const body = options.groupBy
    ? groupRows(rows, options.groupBy).map(([key, list]) => `<tr class="group-row"><td colspan="${span}">${escapeHtml(key)}<small>${escapeHtml(options.groupNote ? options.groupNote(key, list) : `${list.length} record${list.length === 1 ? '' : 's'}`)}</small></td></tr>${renderRows(list)}`).join('')
    : renderRows(rows)

  return `<table class="data">${head}<tbody>${body || `<tr><td colspan="${span}" class="muted">No records</td></tr>`}</tbody></table>`
}

export function sectionsHtml(columns: ReportColumnSpec[], sections: { heading: string; rows: any[] }[]) {
  return sections
    .map((section) => `<h2 class="section">${escapeHtml(section.heading)}<small>${section.rows.length} record${section.rows.length === 1 ? '' : 's'}</small></h2>${tableHtml(columns, section.rows, { numbered: true })}`)
    .join('')
}

export function cardsHtml(columns: ReportColumnSpec[], rows: any[], titleOf: (row: any) => string, subtitleOf: (row: any) => string) {
  return `<div class="cards">${rows
    .map((row) => {
      const title = titleOf(row)
      const subtitle = subtitleOf(row)
      // Skip details already shown as the card's title or subtitle.
      const details = columns.filter((column) => {
        const value = String(column.value(row) ?? '')
        return value !== title && value !== subtitle
      })
      return `<article class="card"><h3>${escapeHtml(title)}</h3><div class="card-sub">${escapeHtml(subtitle)}</div><dl>${details
        .map((column) => `<dt>${escapeHtml(column.header)}</dt><dd>${escapeHtml(column.value(row) ?? '') || '—'}</dd>`)
        .join('')}</dl></article>`
    })
    .join('')}</div>`
}

export function compactListHtml(columns: ReportColumnSpec[], rows: any[], titleOf: (row: any) => string) {
  return `<ol class="compact">${rows
    .map((row) => {
      const details = columns.map((column) => column.value(row)).filter((value) => value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== titleOf(row))
      return `<li><b>${escapeHtml(titleOf(row))}</b><span>${details.map((value) => escapeHtml(value)).join(' · ')}</span></li>`
    })
    .join('')}</ol>`
}
