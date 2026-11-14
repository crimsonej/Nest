import { escapeHtml, groupRows } from './format'
import { tableHtml, type PrintDocument } from './print'
import type { ReportColumnSpec, ReportMeta, ReportSummaryItem } from './types'
import type { SheetSpec } from './xlsx'

export type GroupReportFormat = 'student_roster' | 'group_summary' | 'department_matrix'

export interface ReportGroupMember {
  id: string
  student_name: string
  registration_number: string
  role?: string | null
  gender?: string | null
  email?: string | null
  whatsapp_phone?: string | null
}

export interface ReportGroup {
  id: string
  name: string
  course_unit: string
  course_unit_name: string
  coursework: string
  leader: string
  leader_id?: string | null
  status: string
  max_members: number | null
  members: ReportGroupMember[]
}

export const GROUP_FORMAT_INFO: Record<GroupReportFormat, { label: string; description: string }> = {
  student_roster: { label: 'Student roster', description: 'Every student, listed under their group. Landscape.' },
  group_summary: { label: 'Group summary', description: 'One line per group with leader, fill level and members.' },
  department_matrix: { label: 'Department matrix', description: 'Official layout: a page per course unit, a block per group, signatures.' },
}

const dash = (value: string | null | undefined) => (value && value !== '—' ? value : '')

export function isGroupLeader(group: ReportGroup, member: ReportGroupMember) {
  return (!!group.leader_id && member.id === group.leader_id) || member.role === 'leader'
}

function unitLabel(group: ReportGroup) {
  const code = dash(group.course_unit)
  const name = dash(group.course_unit_name)
  return [code, name].filter(Boolean).join(' · ') || 'Course unit not set'
}

export function groupSummary(groups: ReportGroup[]): ReportSummaryItem[] {
  const students = groups.reduce((total, group) => total + group.members.length, 0)
  const empty = groups.filter((group) => group.members.length === 0).length
  const full = groups.filter((group) => group.max_members && group.members.length >= group.max_members).length
  const units = new Set(groups.map((group) => group.course_unit)).size
  return [
    { label: 'Groups', value: groups.length },
    { label: 'Students placed', value: students },
    { label: 'Course units', value: units },
    { label: 'Full groups', value: full },
    { label: 'Empty groups', value: empty },
    { label: 'Average size', value: groups.length ? Number((students / groups.length).toFixed(1)) : 0 },
  ]
}

function statusTag(status: string) {
  const value = (status || '').toLowerCase()
  const tone = value === 'open' || value === 'active' ? 'ok' : value === 'full' ? 'info' : value ? 'warn' : 'info'
  return `<span class="tag ${tone}">${escapeHtml(status || 'Unknown')}</span>`
}

function fill(group: ReportGroup) {
  const max = group.max_members || 0
  const pct = max ? Math.min(100, Math.round((group.members.length / max) * 100)) : 0
  return { max, pct }
}

const memberColumns: ReportColumnSpec[] = [
  { key: 'student_name', header: 'Student', value: (row) => row.student_name },
  { key: 'registration_number', header: 'Registration no.', value: (row) => dash(row.registration_number), mono: true },
  { key: 'role', header: 'Role', value: (row) => row.__role },
  { key: 'gender', header: 'Gender', value: (row) => dash(row.gender) },
  { key: 'email', header: 'Email', value: (row) => dash(row.email) },
  { key: 'whatsapp_phone', header: 'WhatsApp', value: (row) => dash(row.whatsapp_phone), mono: true },
]

function membersWithRole(group: ReportGroup) {
  return [...group.members]
    .sort((a, b) => Number(isGroupLeader(group, b)) - Number(isGroupLeader(group, a)) || a.student_name.localeCompare(b.student_name))
    .map((member) => ({ ...member, __role: isGroupLeader(group, member) ? 'Leader' : 'Member' }))
}

// ── PDF ────────────────────────────────────────────────────────────────────

export function groupPrintDocument(
  format: GroupReportFormat,
  meta: ReportMeta,
  groups: ReportGroup[],
  roster: { columns: ReportColumnSpec[]; rows: any[]; groupedOrder: boolean },
  signatures: string[]
): PrintDocument {
  const summary = groupSummary(groups)

  if (format === 'student_roster') {
    return {
      meta: { ...meta, title: `${meta.title} — Student roster` },
      orientation: 'landscape',
      summary,
      bodyHtml: tableHtml(roster.columns, roster.rows, {
        groupBy: roster.groupedOrder ? (row) => `${row.name}${dash(row.course_unit) ? ` · ${row.course_unit}` : ''}` : undefined,
        groupNote: (_key, list) => `${list.filter((row) => !String(row.student_name || '').startsWith('—')).length} student(s)${list[0]?.coursework && list[0].coursework !== '—' ? ` · ${list[0].coursework}` : ''}`,
      }),
      signatures,
    }
  }

  if (format === 'group_summary') {
    const rows = groups
      .map((group, index) => {
        const { max, pct } = fill(group)
        const members = membersWithRole(group)
        return `<tr>
          <td class="idx">${index + 1}</td>
          <td><b>${escapeHtml(group.name)}</b><div class="muted">${escapeHtml(unitLabel(group))}</div></td>
          <td>${escapeHtml(dash(group.coursework)) || '<span class="muted">—</span>'}</td>
          <td>${escapeHtml(dash(group.leader)) || '<span class="muted">Not chosen</span>'}</td>
          <td class="num"><b>${group.members.length}</b>${max ? ` / ${max}` : ''}<div class="bar"><i style="width:${pct}%"></i></div></td>
          <td>${statusTag(group.status)}</td>
          <td>${members.length ? members.map((member) => `${escapeHtml(member.student_name)}${member.__role === 'Leader' ? ' <span class="tag lead">L</span>' : ''}`).join('<br/>') : '<span class="muted">No members yet</span>'}</td>
        </tr>`
      })
      .join('')
    return {
      meta: { ...meta, title: `${meta.title} — Group summary` },
      orientation: 'portrait',
      summary,
      bodyHtml: `<table class="data"><thead><tr><th class="idx">#</th><th>Group</th><th>Coursework</th><th>Leader</th><th class="num">Members</th><th>Status</th><th>Members list</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">No groups</td></tr>'}</tbody></table>`,
      signatures,
    }
  }

  // Department matrix: a page per course unit, a block per group.
  const units = groupRows(groups, unitLabel)
  const body = units
    .map(([unit, unitGroups], unitIndex) => {
      const placed = unitGroups.reduce((total, group) => total + group.members.length, 0)
      const blocks = unitGroups
        .map((group) => {
          const { max } = fill(group)
          return `<div class="group-block">
            <header><h3>${escapeHtml(group.name)}</h3><span>${statusTag(group.status)} <span class="tag info">${group.members.length}${max ? ` / ${max}` : ''} members</span></span></header>
            <div class="meta-line"><span><b>Coursework:</b> ${escapeHtml(dash(group.coursework) || '—')}</span><span><b>Leader:</b> ${escapeHtml(dash(group.leader) || 'Not chosen')}</span></div>
            ${tableHtml(memberColumns, membersWithRole(group), { numbered: true })}
          </div>`
        })
        .join('')
      return `<section class="${unitIndex > 0 ? 'unit-break' : ''}">
        <h2 class="section">${escapeHtml(unit)}<small>${unitGroups.length} group(s) · ${placed} student(s)</small></h2>
        ${blocks}
      </section>`
    })
    .join('')

  return {
    meta: { ...meta, title: `${meta.title} — Department matrix` },
    orientation: 'portrait',
    summary,
    bodyHtml: body || '<p class="muted">No groups for the selected filters.</p>',
    signatures,
  }
}

// ── Excel ──────────────────────────────────────────────────────────────────

export function groupSheets(format: GroupReportFormat, groups: ReportGroup[], roster: { columns: ReportColumnSpec[]; rows: any[] }): SheetSpec[] {
  const summary = groupSummary(groups)

  if (format === 'student_roster') {
    return [{ name: 'Student roster', columns: roster.columns, sections: [{ rows: roster.rows }], summary }]
  }

  if (format === 'group_summary') {
    const columns: ReportColumnSpec[] = [
      { key: 'name', header: 'Group', value: (group: ReportGroup) => group.name },
      { key: 'course_unit', header: 'Unit code', value: (group: ReportGroup) => dash(group.course_unit), mono: true },
      { key: 'course_unit_name', header: 'Course unit', value: (group: ReportGroup) => dash(group.course_unit_name) },
      { key: 'coursework', header: 'Coursework', value: (group: ReportGroup) => dash(group.coursework) },
      { key: 'leader', header: 'Leader', value: (group: ReportGroup) => dash(group.leader) },
      { key: 'members', header: 'Members', value: (group: ReportGroup) => group.members.length, numeric: true },
      { key: 'capacity', header: 'Capacity', value: (group: ReportGroup) => group.max_members ?? '', numeric: true },
      { key: 'fill', header: 'Fill %', value: (group: ReportGroup) => fill(group).pct, numeric: true },
      { key: 'status', header: 'Status', value: (group: ReportGroup) => group.status },
      { key: 'member_list', header: 'Members list', value: (group: ReportGroup) => membersWithRole(group).map((member) => `${member.student_name} (${dash(member.registration_number) || 'no reg. no.'})${member.__role === 'Leader' ? ' – leader' : ''}`).join('\n') },
    ]
    return [{ name: 'Group summary', columns, sections: [{ rows: groups }], summary, wrapKeys: ['member_list'] }]
  }

  return groupRows(groups, unitLabel).map(([unit, unitGroups]) => ({
    name: unitGroups[0]?.course_unit && unitGroups[0].course_unit !== '—' ? unitGroups[0].course_unit : unit,
    columns: memberColumns,
    summary: [
      { label: 'Course unit', value: unit },
      { label: 'Groups', value: unitGroups.length },
      { label: 'Students placed', value: unitGroups.reduce((total, group) => total + group.members.length, 0) },
    ],
    sections: unitGroups.map((group) => ({
      heading: `${group.name}  ·  ${group.members.length}${group.max_members ? ` / ${group.max_members}` : ''} members  ·  ${group.status}`,
      note: `Coursework: ${dash(group.coursework) || '—'}   Leader: ${dash(group.leader) || 'not chosen'}`,
      rows: membersWithRole(group),
    })),
  }))
}
