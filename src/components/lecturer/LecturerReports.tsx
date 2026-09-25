'use client'

import { useState, useEffect } from 'react'
import {
  Download,
  FileText,
  Grid3X3,
  List,
  Users,
  UserX,
  NotebookText,
  SlidersHorizontal,
  Search,
  Maximize2,
  Minimize2,
  Table,
  LayoutGrid,
  ListFilter,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  BookCopy,
  Layers3,
  AlertCircle,
  Layers,
  Sparkles,
  Printer,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'
import * as XLSX from 'xlsx'

const compareGroupNames = (firstName: string = '', secondName: string = '') =>
  firstName.localeCompare(secondName, undefined, { numeric: true, sensitivity: 'base' })

type ReportCategory = 'students' | 'orphan_students' | 'groups' | 'course_unit_students'
type ReportColumn = { key: string; header: string; value: (row: any) => string }
type ModalLayoutMode = 'table' | 'cards' | 'roster' | 'accordion'
type GroupReportFormat = 'student_roster' | 'group_summary' | 'department_matrix'

const reportTiles = [
  { id: 'students', label: 'Student List', description: 'All students in your course unit', icon: Users, color: 'from-blue-500 to-cyan-500' },
  { id: 'orphan_students', label: 'Orphan List', description: 'Students not assigned to a group', icon: UserX, color: 'from-amber-500 to-orange-500' },
  { id: 'groups', label: 'Group List', description: 'All groups with member rosters', icon: Layers3, color: 'from-violet-500 to-purple-500' },
  { id: 'course_unit_students', label: 'Students per Course Unit', description: 'Roster for your assigned unit', icon: Grid3X3, color: 'from-emerald-500 to-teal-500' },
] as const

export function LecturerReports() {
  const { user } = useAuth()
  const supabase = createClient()

  const [assignedCourseUnit, setAssignedCourseUnit] = useState<{ id: string; code: string; name: string } | null>(null)
  const [loadingUnit, setLoadingUnit] = useState(true)

  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles')
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [overviewData, setOverviewData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<Record<string, boolean>>({})

  // Modal Controls & State
  const [modalLayoutMode, setModalLayoutMode] = useState<ModalLayoutMode>('table')
  const [groupReportFormat, setGroupReportFormat] = useState<GroupReportFormat>('student_roster')
  const [inModalSearch, setInModalSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({})

  // Step 1: Fetch the lecturer's assigned course unit
  useEffect(() => {
    if (!user?.id) return
    setLoadingUnit(true)
    supabase
      .from('course_units')
      .select('id, code, name')
      .eq('lecturer_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAssignedCourseUnit(data)
        setLoadingUnit(false)
      })
  }, [user?.id])

  // Step 2: Fetch report data scoped to the assigned unit
  useEffect(() => {
    if (!assignedCourseUnit?.id) return
    fetchOverviewData(assignedCourseUnit.id)
  }, [assignedCourseUnit?.id])

  async function fetchOverviewData(courseUnitId: string) {
    setLoading(true)
    try {
      const [studentsRes, groupsRes, groupMembersRes, courseworksRes, enrollmentsRes] = await Promise.all([
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('groups').select('id, name, description, status, max_members, leader_id, created_at, leader:users!groups_leader_id_fkey(full_name, email), coursework:courseworks(id, title, course_unit_id, course_unit:course_units(id, code, name))').order('created_at', { ascending: false }),
        supabase.from('group_members').select('id, group_id, user_id, role, joined_at, user:users(full_name, email, student_registration_number, whatsapp_phone, course, gender)').order('joined_at', { ascending: false }),
        supabase.from('courseworks').select('id, title, course_unit_id').eq('course_unit_id', courseUnitId),
        supabase.from('student_course_units').select('id, user_id, course_unit_id, status').eq('status', 'active').eq('course_unit_id', courseUnitId),
      ])

      const allUsers = studentsRes.data || []
      const allGroups = (groupsRes.data || []).filter((g: any) => g.coursework?.course_unit_id === courseUnitId)
      const allMembers = groupMembersRes.data || []
      const enrollments = enrollmentsRes.data || []

      // Students enrolled in this course unit
      const enrolledUserIds = new Set(enrollments.map((e: any) => e.user_id))
      const allStudents = allUsers.filter((u: any) =>
        u.role === 'student' && (enrolledUserIds.size === 0 || enrolledUserIds.has(u.id))
      )

      const memberUserIds = new Set(
        allMembers
          .filter((m: any) => allGroups.some((g: any) => g.id === m.group_id))
          .map((m: any) => m.user_id)
      )
      const orphanStudents = allStudents.filter((s: any) => !memberUserIds.has(s.id))

      const groupRows = allGroups.map((group: any) => {
        const members = allMembers
          .filter((m: any) => m.group_id === group.id)
          .map((m: any) => ({
            id: m.user_id,
            student_name: m.user?.full_name || 'Student',
            registration_number: m.user?.student_registration_number || '—',
            email: m.user?.email || '—',
            whatsapp_phone: m.user?.whatsapp_phone || '—',
            course: m.user?.course || '—',
            gender: m.user?.gender || '—',
            role: m.role,
          }))
        return {
          id: group.id,
          name: group.name,
          description: group.description || '—',
          status: group.status,
          max_members: group.max_members,
          leader_id: group.leader_id,
          leader: group.leader?.full_name || 'Unassigned',
          coursework: group.coursework?.title || '—',
          course_unit_id: courseUnitId,
          course_unit: assignedCourseUnit?.code || '—',
          course_unit_name: assignedCourseUnit?.name || '—',
          members,
          member_count: members.length,
          created_at: group.created_at,
        }
      })

      const courseUnitStudents = allStudents.map((s: any) => ({
        id: s.id,
        student_name: s.full_name,
        email: s.email,
        registration_number: s.student_registration_number || '—',
        course_unit: `${assignedCourseUnit?.code} - ${assignedCourseUnit?.name}`,
        course: s.course || 'Unassigned',
        gender: s.gender || '—',
        whatsapp_phone: s.whatsapp_phone || '—',
      }))

      setOverviewData({
        students: allStudents.map((s: any) => ({
          id: s.id,
          full_name: s.full_name,
          email: s.email,
          student_registration_number: s.student_registration_number || '—',
          course: s.course || 'Unassigned',
          whatsapp_phone: s.whatsapp_phone || '—',
          gender: s.gender || '—',
          created_at: s.created_at,
        })),
        orphan_students: orphanStudents.map((s: any) => ({
          id: s.id,
          full_name: s.full_name,
          email: s.email,
          student_registration_number: s.student_registration_number || '—',
          course: s.course || 'Unassigned',
          whatsapp_phone: s.whatsapp_phone || '—',
          gender: s.gender || '—',
          created_at: s.created_at,
        })),
        groups: groupRows,
        course_unit_students: courseUnitStudents,
      })
    } catch (err) {
      console.error('Error loading lecturer report data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getColumnsForCategory = (category: ReportCategory): ReportColumn[] => {
    switch (category) {
      case 'students':
      case 'orphan_students':
        return [
          { key: 'full_name', header: 'Student', value: (r) => r.full_name || '—' },
          { key: 'email', header: 'Email', value: (r) => r.email || '—' },
          { key: 'student_registration_number', header: 'Reg No.', value: (r) => r.student_registration_number || '—' },
          { key: 'course', header: 'Course', value: (r) => r.course || '—' },
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (r) => r.whatsapp_phone || '—' },
          { key: 'gender', header: 'Gender', value: (r) => r.gender || '—' },
          { key: 'created_at', header: 'Registered', value: (r) => formatDate(r.created_at) },
        ]
      case 'groups':
        if (groupReportFormat === 'group_summary') {
          return [
            { key: 'name', header: 'Group Name', value: (r) => r.name || '—' },
            { key: 'course_unit', header: 'Course Unit Code', value: (r) => r.course_unit || '—' },
            { key: 'course_unit_name', header: 'Course Unit Name', value: (r) => r.course_unit_name || '—' },
            { key: 'coursework', header: 'Coursework', value: (r) => r.coursework || '—' },
            { key: 'leader', header: 'Group Leader', value: (r) => r.leader || '—' },
            { key: 'status', header: 'Status', value: (r) => r.status || '—' },
            { key: 'member_capacity', header: 'Capacity', value: (r) => r.member_capacity || '—' },
            { key: 'members_roster', header: 'Members List', value: (r) => r.members_roster || 'No members' },
            { key: 'created_at', header: 'Created', value: (r) => formatDate(r.created_at) },
          ]
        }
        if (groupReportFormat === 'department_matrix') {
          return [
            { key: 'course_unit', header: 'Course Unit', value: (r) => r.course_unit || '—' },
            { key: 'name', header: 'Group Name', value: (r) => r.name || '—' },
            { key: 'leader', header: 'Group Leader', value: (r) => r.leader || '—' },
            { key: 'coursework', header: 'Coursework Assignment', value: (r) => r.coursework || '—' },
            { key: 'member_capacity', header: 'Members', value: (r) => r.member_capacity || '—' },
            { key: 'status', header: 'Status', value: (r) => r.status || '—' },
            { key: 'members_roster', header: 'Roster Breakdown', value: (r) => r.members_roster || '—' },
          ]
        }
        return [
          { key: 'student_number', header: 'No.', value: (r) => String(r.student_number || '—') },
          { key: 'student_name', header: 'Student Name', value: (r) => r.student_name || '—' },
          { key: 'registration_number', header: 'Reg No.', value: (r) => r.registration_number || '—' },
          { key: 'role', header: 'Role', value: (r) => r.role || 'Member' },
          { key: 'name', header: 'Group Name', value: (r) => r.name || '—' },
          { key: 'coursework', header: 'Coursework', value: (r) => r.coursework || '—' },
          { key: 'gender', header: 'Gender', value: (r) => r.gender || '—' },
          { key: 'email', header: 'Email', value: (r) => r.email || '—' },
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (r) => r.whatsapp_phone || '—' },
        ]
      case 'course_unit_students':
        return [
          { key: 'student_name', header: 'Student', value: (r) => r.student_name || '—' },
          { key: 'registration_number', header: 'Reg No.', value: (r) => r.registration_number || '—' },
          { key: 'email', header: 'Email', value: (r) => r.email || '—' },
          { key: 'course_unit', header: 'Course Unit', value: (r) => r.course_unit || '—' },
          { key: 'course', header: 'Course', value: (r) => r.course || '—' },
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (r) => r.whatsapp_phone || '—' },
          { key: 'gender', header: 'Gender', value: (r) => r.gender || '—' },
        ]
      default:
        return []
    }
  }

  useEffect(() => {
    if (selectedCategory) {
      const cols = getColumnsForCategory(selectedCategory)
      const map: Record<string, boolean> = {}
      cols.forEach((col) => (map[col.key] = true))
      setSelectedColumnKeys(map)
      setInModalSearch('')
      setSortColumn(null)
      setSortOrder('asc')
    }
  }, [selectedCategory, groupReportFormat])

  const groupOptions = overviewData.groups || []
  const selectedGroup = groupOptions.find((g: any) => g.id === selectedGroupId) || null

  const getBaseRows = () => {
    if (!selectedCategory) return []
    if (selectedCategory === 'groups') {
      const targetGroups = selectedGroup
        ? [selectedGroup]
        : [...groupOptions].sort((a: any, b: any) => compareGroupNames(a.name, b.name))

      if (groupReportFormat === 'group_summary' || groupReportFormat === 'department_matrix') {
        return targetGroups.map((g: any) => ({
          ...g,
          member_capacity: `${g.member_count || (g.members || []).length} / ${g.max_members || 0}`,
          members_roster: (g.members || []).length > 0
            ? g.members.map((m: any) => `${m.student_name || m.full_name || 'Student'} (${m.registration_number || 'No Reg'})`).join(', ')
            : 'No members assigned',
        }))
      }

      const studentRows: any[] = []
      let counter = 1
      targetGroups.forEach((g: any) => {
        const members = g.members || []
        if (members.length === 0) {
          studentRows.push({
            id: `empty-${g.id}`, student_number: counter++,
            student_name: '— No Members Assigned —', registration_number: '—', role: '—',
            name: g.name, coursework: g.coursework || '—', gender: '—', email: '—', whatsapp_phone: '—',
          })
        } else {
          members.forEach((m: any) => {
            const isLeader = g.leader_id === m.id || m.role === 'leader' || (g.leader && g.leader.toLowerCase().includes((m.student_name || '').toLowerCase()))
            studentRows.push({
              id: `${g.id}-${m.id || Math.random()}`, student_number: counter++,
              student_name: m.student_name || m.full_name || 'Student',
              registration_number: m.registration_number || '—',
              role: isLeader ? 'Group Leader' : 'Member',
              name: g.name, coursework: g.coursework || '—',
              gender: m.gender || '—', email: m.email || '—', whatsapp_phone: m.whatsapp_phone || '—',
            })
          })
        }
      })
      return studentRows
    }
    return overviewData[selectedCategory] || []
  }

  const getActiveRows = () => {
    let rows = getBaseRows()
    if (inModalSearch.trim()) {
      const q = inModalSearch.toLowerCase().trim()
      rows = rows.filter((row: any) =>
        Object.values(row).some((val) => {
          if (val === null || val === undefined) return false
          if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(q)
          return String(val).toLowerCase().includes(q)
        })
      )
    }
    if (sortColumn && selectedCategory) {
      const colDef = getColumnsForCategory(selectedCategory).find((c) => c.key === sortColumn)
      rows = [...rows].sort((a: any, b: any) => {
        const valA = colDef ? colDef.value(a) : String(a[sortColumn] ?? '')
        const valB = colDef ? colDef.value(b) : String(b[sortColumn] ?? '')
        const comp = String(valA ?? '').toLowerCase().localeCompare(String(valB ?? '').toLowerCase(), undefined, { numeric: true, sensitivity: 'base' })
        return sortOrder === 'asc' ? comp : -comp
      })
    }
    return rows
  }

  const getActiveColumns = () => {
    if (!selectedCategory) return []
    return getColumnsForCategory(selectedCategory).filter((col) => selectedColumnKeys[col.key] !== false)
  }

  const handleSortToggle = (colKey: string) => {
    if (sortColumn === colKey) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else { setSortColumn(null); setSortOrder('asc') }
    } else {
      setSortColumn(colKey)
      setSortOrder('asc')
    }
  }

  const handleExportCsv = () => {
    if (!selectedCategory) return
    const columns = getActiveColumns()
    const rows = getActiveRows()
    if (rows.length === 0 || columns.length === 0) {
      alert('No matching records or columns selected for export.')
      return
    }
    const escapeValue = (v: unknown) => {
      const text = v === null || v === undefined ? '' : String(v)
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }
    const csvRows = [
      columns.map((c) => escapeValue(c.header)).join(','),
      ...rows.map((r: any) => columns.map((c) => escapeValue(c.value(r))).join(',')),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${assignedCourseUnit?.code || 'lecturer'}_${selectedCategory}_${groupReportFormat}_report_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportXlsx = () => {
    if (!selectedCategory) return
    const columns = getActiveColumns()
    const rows = getActiveRows()
    if (rows.length === 0 || columns.length === 0) {
      alert('No matching records or columns selected for export.')
      return
    }
    const ws = XLSX.utils.json_to_sheet(rows.map((r: any) => Object.fromEntries(columns.map((c) => [c.header, c.value(r)]))))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered Report')
    XLSX.writeFile(wb, `${assignedCourseUnit?.code || 'lecturer'}_${selectedCategory}_${groupReportFormat}_report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleExportPdf = () => {
    if (!selectedCategory) return
    const columns = getActiveColumns()
    const rows = getActiveRows()

    if (rows.length === 0 || columns.length === 0) {
      alert('No matching records or columns selected for export.')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) return

    const escapeHtml = (value: unknown) => String(value ?? '—')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    if (selectedCategory === 'groups' && (groupReportFormat === 'department_matrix' || groupReportFormat === 'group_summary')) {
      const groupsToPrint = selectedGroup ? [selectedGroup] : [...groupOptions].sort((a: any, b: any) => compareGroupNames(a.name, b.name))

      const unitName = `${assignedCourseUnit?.code || '—'} - ${assignedCourseUnit?.name || 'Course Unit'}`
      
      const groupedHtml = `
        <section class="course-unit">
          <h2 style="background:#1e293b; color:#fff; padding:10px 14px; border-radius:6px; font-size:15px; margin-top:20px;">
            Course Unit: ${escapeHtml(unitName)}
          </h2>
          ${groupsToPrint.map((group: any) => {
            const members = group.members || []
            const memberRows = members.length > 0
              ? members.map((member: any, index: number) => `
                  <tr>
                    <td style="width:40px; text-align:center;">${index + 1}</td>
                    <td><strong>${escapeHtml(member.student_name || member.full_name)}</strong></td>
                    <td><code>${escapeHtml(member.registration_number)}</code></td>
                    <td>${member.user_id === group.leader_id || member.role === 'leader' ? '<span style="color:#0284c7; font-weight:bold;">Leader</span>' : 'Member'}</td>
                    <td>${escapeHtml(member.gender)}</td>
                    <td>${escapeHtml(member.email)}</td>
                    <td>${escapeHtml(member.whatsapp_phone)}</td>
                  </tr>
                `).join('')
              : `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:12px;">No members assigned yet</td></tr>`

            return `
              <div style="border:1px solid #cbd5e1; border-radius:8px; padding:14px; margin-top:14px; page-break-inside:avoid; background:#fff;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:10px;">
                  <h3 style="margin:0; font-size:16px; color:#0f172a;">Group Name: ${escapeHtml(group.name || 'Unnamed Group')}</h3>
                  <span style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold;">
                    Capacity: ${members.length} / ${escapeHtml(group.max_members)} Members
                  </span>
                </div>
                <div style="display:flex; gap:20px; font-size:12px; color:#475569; margin-bottom:10px;">
                  <span><strong>Coursework:</strong> ${escapeHtml(group.coursework)}</span>
                  <span><strong>Group Leader:</strong> ${escapeHtml(group.leader)}</span>
                  <span><strong>Status:</strong> ${escapeHtml(group.status)}</span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                  <thead>
                    <tr style="background:#f1f5f9; color:#334155; font-weight:bold;">
                      <th style="border:1px solid #cbd5e1; padding:6px;">No.</th>
                      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Student Name</th>
                      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Registration No.</th>
                      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Role</th>
                      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Gender</th>
                      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Email</th>
                      <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>${memberRows}</tbody>
                </table>
              </div>
            `
          }).join('')}
        </section>
      `

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Ndejje University - Course Unit Roster Report</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #0f172a; line-height:1.4; }
              .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
              .header h1 { margin:0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; color:#1e293b; }
              .header h2 { margin: 4px 0 0; font-size: 14px; font-weight: 500; color: #475569; }
              .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
              .footer-signature { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; font-size: 12px; }
              .signature-box { border-top: 1px solid #0f172a; width: 220px; text-align: center; padding-top: 6px; }
              .page-break { page-break-before: always; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>NDEJJE UNIVERSITY</h1>
              <h2>Faculty of Science and Computing · Academic Department</h2>
              <p>Official Lecturer Group Roster Report · ${escapeHtml(assignedCourseUnit?.code)} ${escapeHtml(assignedCourseUnit?.name)} · Generated ${escapeHtml(formatDate(new Date().toISOString()))}</p>
            </div>
            ${groupedHtml || '<p>No groups found for the selected filters.</p>'}
            <div class="footer-signature">
              <div class="signature-box">
                <strong>Course Lecturer</strong><br/>
                <span>Signature & Date</span>
              </div>
              <div class="signature-box">
                <strong>Head of Department</strong><br/>
                <span>Signature & Date</span>
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      return
    }

    const rowsHtml = rows
      .slice(0, 500)
      .map((row: any) => {
        const cells = columns
          .map((column) => `<td style="border:1px solid #d1d5db; padding:8px; text-align:left;">${escapeHtml(column.value(row))}</td>`)
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    const headerHtml = columns
      .map((column) => `<th style="border:1px solid #d1d5db; padding:8px; text-align:left; background:#f3f4f6; font-weight:600;">${escapeHtml(column.header)}</th>`)
      .join('')

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${assignedCourseUnit?.code} - ${selectedCategory} Filtered Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            table { border-collapse: collapse; width: 100%; margin-top: 12px; }
            th, td { font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 16px; }
            .header h1 { margin:0; font-size: 20px; }
            .header p { margin: 4px 0 0; font-size: 12px; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>NDEJJE UNIVERSITY</h1>
            <p>${escapeHtml(assignedCourseUnit?.code)} - ${escapeHtml(assignedCourseUnit?.name)} · Official Report</p>
          </div>
          <h2>${selectedCategory.replace(/_/g, ' ').toUpperCase()} Report</h2>
          <p style="font-size: 12px; color: #6b7280;">Exporting ${rows.length} matching records across ${columns.length} selected columns.</p>
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  // --- LAYOUT VIEWER RENDERERS ---

  // 1. Card Grid View
  const renderCardGridView = (rows: any[], columns: ReportColumn[]) => {
    return (
      <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row: any, index: number) => {
          const titleVal = row.full_name || row.student_name || row.name || row.title || row.code || `Record #${index + 1}`
          const subVal = row.student_registration_number || row.email || row.course_unit || row.course || '—'
          const badgeVal = row.status || row.role || row.gender || null

          return (
            <div
              key={row.id || index}
              className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {String(titleVal).slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary line-clamp-1">{titleVal}</h4>
                      <p className="text-xs text-text-muted font-mono">{subVal}</p>
                    </div>
                  </div>
                  {badgeVal && (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {badgeVal}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                  {columns.map((col) => (
                    <div key={col.key} className="flex justify-between items-center text-text-secondary">
                      <span className="text-text-muted text-[11px] font-medium">{col.header}:</span>
                      <span className="font-medium text-text-primary text-right max-w-[60%] truncate">
                        {col.value(row)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {row.members && row.members.length > 0 && (
                <div className="pt-2 border-t border-border/60 text-xs text-text-muted">
                  <span className="font-semibold text-text-primary">{row.members.length} Members:</span>{' '}
                  {row.members.map((m: any) => m.student_name || m.full_name || m).slice(0, 3).join(', ')}
                  {row.members.length > 3 && ` +${row.members.length - 3} more`}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 2. Compact Roster View
  const renderCompactRosterView = (rows: any[], columns: ReportColumn[]) => {
    return (
      <div className="rounded-2xl border border-border bg-surface overflow-hidden divide-y divide-border/60">
        {rows.map((row: any, index: number) => {
          const mainName = row.full_name || row.student_name || row.name || row.title || row.code || `Item #${index + 1}`
          const mainDetail = row.student_registration_number || row.email || row.course_unit || row.leader || '—'

          return (
            <div
              key={row.id || index}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-surface-hover/60 transition-colors gap-2 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-text-muted w-6 text-center">{index + 1}.</span>
                <div>
                  <div className="font-bold text-text-primary text-sm">{mainName}</div>
                  <div className="text-text-muted font-mono text-[11px]">{mainDetail}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-text-secondary sm:ml-auto">
                {columns.slice(0, 4).map((col) => (
                  <span key={col.key} className="bg-surface-hover px-2 py-1 rounded-md text-[11px]">
                    <strong className="text-text-muted mr-1">{col.header}:</strong>
                    {col.value(row)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 3. Grouped Accordion View
  const renderGroupedAccordionView = (rows: any[], columns: ReportColumn[]) => {
    const groupingKey = selectedCategory === 'groups' ? 'name' : 'course'
    const grouped = rows.reduce((acc: Record<string, any[]>, row: any) => {
      const groupName = row[groupingKey] || row.name || row.course || 'General Roster'
      if (!acc[groupName]) acc[groupName] = []
      acc[groupName].push(row)
      return acc
    }, {})

    return (
      <div className="space-y-3.5">
        {Object.entries(grouped).map(([groupTitle, groupRows]) => {
          const isOpen = expandedAccordions[groupTitle] !== false

          return (
            <div key={groupTitle} className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedAccordions((prev) => ({ ...prev, [groupTitle]: !isOpen }))}
                className="w-full flex items-center justify-between p-4 bg-surface-hover/40 text-left font-bold text-sm text-text-primary hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                  <span>{groupTitle}</span>
                  <Badge variant="primary" className="ml-2 font-mono text-xs">
                    {groupRows.length} {groupRows.length === 1 ? 'Record' : 'Records'}
                  </Badge>
                </div>
                <span className="text-xs text-text-muted uppercase tracking-wider">{isOpen ? 'Collapse' : 'Expand'}</span>
              </button>

              {isOpen && (
                <div className="p-4 border-t border-border">
                  <DataTable
                    columns={columns.map((col) => ({
                      key: col.key,
                      header: col.header,
                      render: (row: any) => <span className="whitespace-nowrap">{col.value(row)}</span>,
                    }))}
                    data={groupRows}
                    keyExtractor={(row: any) => row.id || row.student_name || row.full_name || row.name || String(Math.random())}
                    emptyMessage="No records in this group"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ─── LOADING STATE ───────────────────────────────────────────────────────

  if (loadingUnit) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!assignedCourseUnit) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-text-primary text-lg">No Course Unit Assigned</h2>
            <p className="text-text-secondary mt-1 text-sm">
              You haven't been assigned to a course unit yet. Please contact your administrator to set your{' '}
              <code className="text-primary font-mono text-xs bg-primary/10 px-1 py-0.5 rounded">lecturer_id</code> on a course unit in the database.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-r from-violet-950/20 via-purple-900/10 to-surface/90 p-6 sm:p-8 shadow-xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-bold text-violet-400 backdrop-blur-md mb-2.5">
              <FileText className="h-3.5 w-3.5 text-violet-400" />
              <span>Lecturer Supervision Portal</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-4xl">
              Reports & <span className="bg-gradient-to-r from-violet-500 via-purple-400 to-indigo-500 bg-clip-text text-transparent">Analytics</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-text-secondary font-medium max-w-xl">
              Assigned Course Unit: <span className="font-bold text-violet-400">{assignedCourseUnit.code} · {assignedCourseUnit.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setViewMode('tiles')}
              className={cn('p-2.5 rounded-xl border text-xs font-medium transition-all shadow-xs', viewMode === 'tiles' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-500/50 shadow-md shadow-violet-500/20' : 'border-border/80 bg-surface/80 text-text-muted hover:text-text-primary')}
              title="Tile View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2.5 rounded-xl border text-xs font-medium transition-all shadow-xs', viewMode === 'list' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-500/50 shadow-md shadow-violet-500/20' : 'border-border/80 bg-surface/80 text-text-muted hover:text-text-primary')}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3 text-xs text-text-secondary flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>Select any report tile below to view interactive controls, live search, 4 layout modes, 3 report formats, and custom CSV/PDF/Excel exports.</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center min-h-[20vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Report Tiles */}
      {!loading && viewMode === 'tiles' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportTiles.map((tile) => {
            const Icon = tile.icon
            const count = overviewData[tile.id]?.length || 0
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(tile.id as ReportCategory)
                  setSelectedGroupId(null)
                }}
                className="w-full text-left"
              >
                <Card hover className={`h-full overflow-hidden border border-border bg-gradient-to-br ${tile.color} p-[1px] transition-transform hover:-translate-y-0.5`}>
                  <div className="h-full rounded-xl bg-surface p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className={`rounded-lg bg-gradient-to-br ${tile.color} p-3 text-white shadow-sm`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="secondary" className="text-xs font-bold tabular-nums">{count}</Badge>
                      </div>
                      <h3 className="mt-3 font-bold text-text-primary text-sm leading-snug">{tile.label}</h3>
                      <p className="mt-1 text-xs text-text-muted">{tile.description}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs text-primary font-semibold">
                      <span>View & Custom Export</span>
                      <span>→</span>
                    </div>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {reportTiles.map((tile) => {
              const Icon = tile.icon
              const count = overviewData[tile.id]?.length || 0
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(tile.id as ReportCategory)
                    setSelectedGroupId(null)
                  }}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-surface-hover transition-colors"
                >
                  <div className={`rounded-lg bg-gradient-to-br ${tile.color} p-2.5 text-white shadow-sm shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary">{tile.label}</p>
                    <p className="text-xs text-text-muted">{tile.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-primary">Open Roster →</span>
                    <Badge variant="secondary" className="shrink-0">{count}</Badge>
                    <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Interactive Report Detail Modal ─────────────────────────────────── */}
      <Modal
        isOpen={Boolean(selectedCategory)}
        onClose={() => {
          setSelectedCategory(null)
          setSelectedGroupId(null)
          setIsFullScreen(false)
        }}
        title={selectedCategory ? reportTiles.find((t) => t.id === selectedCategory)?.label || 'Report Roster' : 'Report Roster'}
        description={selectedCategory ? `Filter records, switch layout views, choose report format, and preview live exports for ${assignedCourseUnit.code}` : 'Report Details'}
        size={isFullScreen ? 'full' : 'xl'}
      >
        {selectedCategory && (
          <div className="space-y-5">
            {/* Group Report Format Selector (Only visible for Groups category) */}
            {selectedCategory === 'groups' && (
              <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" /> Select Group List Report Format
                  </span>
                  <span className="text-[11px] text-text-muted">Choose 1 of 3 standardized formats</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupReportFormat('student_roster')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all',
                      groupReportFormat === 'student_roster'
                        ? 'border-primary bg-primary text-white shadow-sm font-semibold'
                        : 'border-border bg-surface text-text-secondary hover:border-primary/40'
                    )}
                  >
                    <div className="font-bold text-xs">Format 1: Student Roster</div>
                    <div className="text-[10px] opacity-85 mt-0.5">Flat student-by-student group list with roles</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupReportFormat('group_summary')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all',
                      groupReportFormat === 'group_summary'
                        ? 'border-primary bg-primary text-white shadow-sm font-semibold'
                        : 'border-border bg-surface text-text-secondary hover:border-primary/40'
                    )}
                  >
                    <div className="font-bold text-xs">Format 2: Group Summary</div>
                    <div className="text-[10px] opacity-85 mt-0.5">Group-centric overview, capacity & member rosters</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupReportFormat('department_matrix')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all',
                      groupReportFormat === 'department_matrix'
                        ? 'border-primary bg-primary text-white shadow-sm font-semibold'
                        : 'border-border bg-surface text-text-secondary hover:border-primary/40'
                    )}
                  >
                    <div className="font-bold text-xs">Format 3: Department Matrix</div>
                    <div className="text-[10px] opacity-85 mt-0.5">Official Ndejje University print layout</div>
                  </button>
                </div>
              </div>
            )}

            {/* Top Control Bar: Search, Filters & Layout Switcher */}
            <div className="space-y-3 bg-surface-hover/30 p-4 rounded-2xl border border-border/80">
              {/* Category Specific Dropdowns */}
              {selectedCategory === 'groups' && groupOptions.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Specific Group</label>
                  <select
                    value={selectedGroupId || ''}
                    onChange={(event) => setSelectedGroupId(event.target.value || null)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  >
                    <option value="">All Groups in {assignedCourseUnit.code}</option>
                    {groupOptions.map((group: any) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* In-Modal Search Bar & Layout Controls Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Filter by keyword (name, reg no, email, leader)..."
                    value={inModalSearch}
                    onChange={(e) => setInModalSearch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                  {inModalSearch && (
                    <button
                      onClick={() => setInModalSearch('')}
                      className="absolute right-2.5 top-2 text-xs text-text-muted hover:text-text-primary"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Sort By Dropdown & Order Toggle */}
                {selectedCategory && (
                  <div className="flex items-center gap-1.5 border-t border-border/60 pt-2 sm:border-t-0 sm:pt-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-text-secondary uppercase tracking-wider shrink-0">
                      <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                      <span className="hidden sm:inline">Sort:</span>
                    </div>
                    <select
                      value={sortColumn || ''}
                      onChange={(e) => setSortColumn(e.target.value || null)}
                      className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none max-w-[140px] sm:max-w-[160px]"
                    >
                      <option value="">Default Order</option>
                      {getColumnsForCategory(selectedCategory).map((col) => (
                        <option key={col.key} value={col.key}>{col.header}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-hover transition-colors shrink-0"
                      title={`Current order: ${sortOrder === 'asc' ? 'Ascending (A to Z)' : 'Descending (Z to A)'}`}
                    >
                      <span>{sortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
                    </button>
                  </div>
                )}

                {/* Layout Switcher Buttons */}
                <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border overflow-x-auto shrink-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setModalLayoutMode('table')}
                    className={cn(
                      'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors shrink-0',
                      modalLayoutMode === 'table' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    )}
                    title="Table View"
                  >
                    <Table className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline text-[11px]">Table</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalLayoutMode('cards')}
                    className={cn(
                      'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors shrink-0',
                      modalLayoutMode === 'cards' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    )}
                    title="Card Grid View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline text-[11px]">Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalLayoutMode('roster')}
                    className={cn(
                      'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors shrink-0',
                      modalLayoutMode === 'roster' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    )}
                    title="Compact Roster View"
                  >
                    <ListFilter className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline text-[11px]">Compact</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalLayoutMode('accordion')}
                    className={cn(
                      'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors shrink-0',
                      modalLayoutMode === 'accordion' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    )}
                    title="Grouped Accordion View"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline text-[11px]">Grouped</span>
                  </button>
                </div>

                {/* Full-Screen Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullScreen((prev) => !prev)}
                  className="shrink-0 text-xs py-1 px-2.5 h-8"
                  title="Toggle Fullscreen"
                >
                  {isFullScreen ? <Minimize2 className="h-3.5 w-3.5 mr-1" /> : <Maximize2 className="h-3.5 w-3.5 mr-1" />}
                  <span className="hidden sm:inline">{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </Button>
              </div>
            </div>

            {/* Column Customizer Toolbar */}
            {selectedCategory && (
              <div className="rounded-xl border border-border bg-surface-hover/50 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                    <span>Customize Included Columns ({getActiveColumns().length} / {getColumnsForCategory(selectedCategory).length})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        const allCols = getColumnsForCategory(selectedCategory)
                        const map: Record<string, boolean> = {}
                        allCols.forEach((c) => (map[c.key] = true))
                        setSelectedColumnKeys(map)
                      }}
                      className="text-primary hover:underline text-[11px]"
                    >
                      Select All
                    </button>
                    <span className="text-text-muted">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedColumnKeys({})}
                      className="text-text-muted hover:underline text-[11px]"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  {getColumnsForCategory(selectedCategory).map((col) => {
                    const isChecked = selectedColumnKeys[col.key] !== false
                    return (
                      <label
                        key={col.key}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-2 py-0.5 cursor-pointer transition-colors select-none text-[11px]',
                          isChecked ? 'border-primary/40 bg-primary/10 text-primary font-semibold' : 'border-border bg-surface text-text-muted'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setSelectedColumnKeys((prev) => ({ ...prev, [col.key]: e.target.checked }))}
                          className="h-3 w-3 rounded border-border text-primary"
                        />
                        <span>{col.header}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Export Action Bar & Record Counter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-y border-border py-3">
              <div className="flex items-center gap-2">
                <Badge variant="primary" className="font-mono text-xs">
                  {getActiveRows().length} {getActiveRows().length === 1 ? 'Record' : 'Records'}
                </Badge>
                {selectedCategory === 'groups' && (
                  <Badge variant="secondary" className="text-[11px] capitalize font-medium">
                    {groupReportFormat.replace('_', ' ')}
                  </Badge>
                )}
                {inModalSearch && (
                  <span className="text-xs text-text-muted">matching "{inModalSearch}"</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportXlsx}
                  disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Active Layout Display */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Active Preview Layout ({modalLayoutMode.toUpperCase()} MODE)
                </h4>
                <span className="text-[11px] text-text-muted">
                  Click column headers in Table mode to sort A-Z / Z-A
                </span>
              </div>

              {getActiveRows().length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-hover/30 p-10 text-center text-sm text-text-muted">
                  No matching records found for your current filter or search criteria.
                </div>
              ) : getActiveColumns().length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-hover/30 p-10 text-center text-sm text-text-muted">
                  Please check at least one column above to display records in the preview.
                </div>
              ) : (
                <>
                  {modalLayoutMode === 'table' && (
                    <DataTable
                      columns={getActiveColumns().map((col) => ({
                        key: col.key,
                        header: col.header,
                        sortable: true,
                        render: (row: any) => <span className="whitespace-nowrap">{col.value(row)}</span>,
                      }))}
                      data={getActiveRows()}
                      sorting={{
                        column: sortColumn || '',
                        direction: sortOrder,
                        onSort: handleSortToggle,
                      }}
                      keyExtractor={(row: any) => row.id || row.student_name || row.full_name || row.name || row.title || row.code || String(Math.random())}
                      emptyMessage="No records available"
                    />
                  )}

                  {modalLayoutMode === 'cards' && renderCardGridView(getActiveRows(), getActiveColumns())}

                  {modalLayoutMode === 'roster' && renderCompactRosterView(getActiveRows(), getActiveColumns())}

                  {modalLayoutMode === 'accordion' && renderGroupedAccordionView(getActiveRows(), getActiveColumns())}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
