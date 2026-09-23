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
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  BookCopy,
  Layers3,
  AlertCircle,
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
type ModalLayoutMode = 'table' | 'cards' | 'accordion'
type GroupReportFormat = 'student_roster' | 'group_summary'

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
  const [overviewData, setOverviewData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<Record<string, boolean>>({})
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
      const allCourseworks = courseworksRes.data || []
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
            { key: 'coursework', header: 'Coursework', value: (r) => r.coursework || '—' },
            { key: 'leader', header: 'Group Leader', value: (r) => r.leader || '—' },
            { key: 'status', header: 'Status', value: (r) => r.status || '—' },
            { key: 'member_capacity', header: 'Capacity', value: (r) => r.member_capacity || '—' },
            { key: 'members_roster', header: 'Members', value: (r) => r.members_roster || 'No members' },
            { key: 'created_at', header: 'Created', value: (r) => formatDate(r.created_at) },
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

  const getBaseRows = () => {
    if (!selectedCategory) return []
    if (selectedCategory === 'groups') {
      const allGroups = overviewData.groups || []
      const targetGroups = [...allGroups].sort((a: any, b: any) => compareGroupNames(a.name, b.name))

      if (groupReportFormat === 'group_summary') {
        return targetGroups.map((g: any) => ({
          ...g,
          member_capacity: `${g.member_count || 0} / ${g.max_members || 0}`,
          members_roster: (g.members || []).length > 0
            ? g.members.map((m: any) => `${m.student_name} (${m.registration_number})`).join(', ')
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
            name: g.name, coursework: g.coursework || '—', gender: '—', email: '—',
          })
        } else {
          members.forEach((m: any) => {
            const isLeader = g.leader_id === m.id || m.role === 'leader'
            studentRows.push({
              id: `${g.id}-${m.id}`, student_number: counter++,
              student_name: m.student_name || 'Student',
              registration_number: m.registration_number || '—',
              role: isLeader ? 'Group Leader' : 'Member',
              name: g.name, coursework: g.coursework || '—',
              gender: m.gender || '—', email: m.email || '—',
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
      const q = inModalSearch.toLowerCase()
      rows = rows.filter((row: any) =>
        Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
      )
    }
    if (sortColumn && selectedCategory) {
      const colDef = getColumnsForCategory(selectedCategory).find((c) => c.key === sortColumn)
      rows = [...rows].sort((a: any, b: any) => {
        const valA = colDef ? colDef.value(a) : String(a[sortColumn] ?? '')
        const valB = colDef ? colDef.value(b) : String(b[sortColumn] ?? '')
        const comp = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase(), undefined, { numeric: true })
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
    if (rows.length === 0) { alert('No records to export.'); return }
    const escapeValue = (v: unknown) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }
    const csvRows = [columns.map((c) => escapeValue(c.header)).join(','), ...rows.map((r: any) => columns.map((c) => escapeValue(c.value(r))).join(','))]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedCategory}_report_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url)
  }

  const handleExportXlsx = () => {
    if (!selectedCategory) return
    const columns = getActiveColumns(); const rows = getActiveRows()
    if (rows.length === 0) { alert('No records to export.'); return }
    const ws = XLSX.utils.json_to_sheet(rows.map((r: any) => Object.fromEntries(columns.map((c) => [c.header, c.value(r)]))))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `${selectedCategory}_report_${new Date().toISOString().split('T')[0]}.xlsx`)
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
      <div className="flex flex-col gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-violet-500" />
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-violet-500">Lecturer Portal</p>
          </div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Reports</h1>
          <p className="mt-1 text-text-secondary text-sm">
            Scoped to: <span className="font-bold text-violet-400">{assignedCourseUnit.code} · {assignedCourseUnit.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode('tiles')}
            className={cn('p-2 rounded-xl border text-xs font-medium transition-colors', viewMode === 'tiles' ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:text-text-primary')}
            title="Tile View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2 rounded-xl border text-xs font-medium transition-colors', viewMode === 'list' ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:text-text-primary')}
            title="List View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

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
                onClick={() => setSelectedCategory(tile.id as ReportCategory)}
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
          <CardContent className="divide-y divide-border">
            {reportTiles.map((tile) => {
              const Icon = tile.icon
              const count = overviewData[tile.id]?.length || 0
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setSelectedCategory(tile.id as ReportCategory)}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-surface-hover transition-colors"
                >
                  <div className={`rounded-lg bg-gradient-to-br ${tile.color} p-2.5 text-white shadow-sm shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary">{tile.label}</p>
                    <p className="text-xs text-text-muted">{tile.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{count}</Badge>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Report Modal ─────────────────────────────────── */}
      <Modal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={selectedCategory ? reportTiles.find((t) => t.id === selectedCategory)?.label || '' : ''}
        size={isFullScreen ? 'xl' : 'xl'}
      >
        {selectedCategory && (
          <div className="space-y-4">
            {/* Controls bar */}
            <div className="flex flex-wrap gap-2 items-center justify-between border-b border-border/60 pb-3">
              <div className="flex flex-wrap gap-2 items-center">
                {selectedCategory === 'groups' && (
                  <select
                    value={groupReportFormat}
                    onChange={(e) => setGroupReportFormat(e.target.value as GroupReportFormat)}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                  >
                    <option value="student_roster">Student Roster</option>
                    <option value="group_summary">Group Summary</option>
                  </select>
                )}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={inModalSearch}
                    onChange={(e) => setInModalSearch(e.target.value)}
                    className="rounded-lg border border-border bg-surface pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary w-44"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportCsv}>
                  <Download className="h-3.5 w-3.5 mr-1" />CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportXlsx}>
                  <Download className="h-3.5 w-3.5 mr-1" />XLSX
                </Button>
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors"
                  title={isFullScreen ? 'Exit full screen' : 'Full screen'}
                >
                  {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Column toggles */}
            <div className="flex flex-wrap gap-1.5">
              {getColumnsForCategory(selectedCategory).map((col) => (
                <button
                  key={col.key}
                  onClick={() => setSelectedColumnKeys((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                    selectedColumnKeys[col.key] !== false
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface text-text-muted border-border hover:border-primary/40'
                  )}
                >
                  {col.header}
                </button>
              ))}
            </div>

            {/* Record count */}
            <p className="text-xs text-text-muted">{getActiveRows().length} records</p>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-border max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-hover/90 backdrop-blur-sm">
                  <tr>
                    {getActiveColumns().map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-2.5 text-left font-bold text-text-muted uppercase tracking-wider cursor-pointer whitespace-nowrap hover:text-text-primary transition-colors"
                        onClick={() => handleSortToggle(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.header}
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getActiveRows().map((row: any, i: number) => (
                    <tr key={row.id || i} className="hover:bg-surface-hover/50 transition-colors">
                      {getActiveColumns().map((col) => (
                        <td key={col.key} className="px-3 py-2.5 text-text-primary whitespace-nowrap">
                          {col.value(row) || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {getActiveRows().length === 0 && (
                    <tr>
                      <td colSpan={getActiveColumns().length} className="px-4 py-8 text-center text-text-muted">
                        No records found{inModalSearch ? ` matching "${inModalSearch}"` : ''}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
