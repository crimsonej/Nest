'use client'

import { useState, useEffect } from 'react'
import {
  Download,
  FileText,
  FolderOpen,
  Grid3X3,
  List,
  Users,
  UserX,
  BookOpen,
  NotebookText,
  ClipboardList,
  GraduationCap,
  Layers3,
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
  Layers,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Building,
  CalendarDays,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import ReportCard from '@/components/shared/ReportCard'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'
import { usePathname } from 'next/navigation'
import { semesterLabel, useSemester } from '@/hooks/useSemester'
import { useSemesterEvents } from '@/hooks/useSemesterEvents'
import { calendarColumns, calendarRows } from '@/lib/reports/calendar'
import { downloadCsv } from '@/lib/reports/csv'
import { reportFileName } from '@/lib/reports/format'
import { GROUP_FORMAT_INFO, groupPrintDocument, groupSheets, type ReportGroup } from '@/lib/reports/groups'
import { LIST_LAYOUT_INFO, calendarPrintHtml, calendarSummary, listPrintDocument, listSheets } from '@/lib/reports/lists'
import { openPrintDocument, type PrintDocument } from '@/lib/reports/print'
import type { ReportColumnSpec, ReportMeta } from '@/lib/reports/types'
import type { SheetSpec } from '@/lib/reports/xlsx'
import { downloadXlsx } from '@/lib/reports/xlsx'
import { useToast } from '@/hooks/useToast'

const compareGroupNames = (firstName: string = '', secondName: string = '') =>
  firstName.localeCompare(secondName, undefined, { numeric: true, sensitivity: 'base' })

type ReportCategory =
  | 'students'
  | 'orphan_students'
  | 'groups'
  | 'course_units'
  | 'courses'
  | 'coursework'
  | 'course_unit_students'
  | 'course_students'
  | 'semester_calendar'

type ReportColumn = {
  key: string
  header: string
  value: (row: any) => string | number
  numeric?: boolean
}

type ModalLayoutMode = 'table' | 'cards' | 'roster' | 'accordion'
type GroupReportFormat = 'student_roster' | 'group_summary' | 'department_matrix'

const reportTiles = [
  { id: 'students', label: 'General student list', description: 'All active student records', icon: Users, color: 'from-primary to-primary-hover', showCount: true },
  { id: 'orphan_students', label: 'Orphan list', description: 'Students not assigned to a group', icon: UserX, color: 'from-warning to-warning', showCount: true },
  { id: 'groups', label: 'Group list', description: 'All groups with member rosters', icon: Layers3, color: 'from-secondary to-secondary-hover', showCount: true },
  { id: 'course_units', label: 'Course units', description: 'Unit roster and structure', icon: BookOpen, color: 'from-success to-primary', showCount: true },
  { id: 'courses', label: 'Courses', description: 'Faculty-wide programme list', icon: GraduationCap, color: 'from-secondary to-secondary-hover', showCount: true },
  { id: 'coursework', label: 'Coursework', description: 'Assignments, projects and presentations', icon: NotebookText, color: 'from-primary to-secondary', showCount: true },
  { id: 'course_unit_students', label: 'Students per course unit', description: 'Roster by unit', icon: FolderOpen, color: 'from-success to-success', showCount: false },
  { id: 'course_students', label: 'Students per course', description: 'Roster by programme', icon: Grid3X3, color: 'from-primary to-primary-hover', showCount: false },
  { id: 'semester_calendar', label: 'Semester calendar', description: 'Opening, orientation, exams and other key dates', icon: CalendarDays, color: 'from-primary to-secondary', showCount: true },
] as const

export function CoordinatorReports() {
  const toast = useToast()
  const { user } = useAuth()
  const supabase = createClient()
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles')
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null)
  const [selectedCourseUnitId, setSelectedCourseUnitId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [overviewData, setOverviewData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<Record<string, boolean>>({})

  // Modal Layout & Controls State
  const [modalLayoutMode, setModalLayoutMode] = useState<ModalLayoutMode>('table')
  const [groupReportFormat, setGroupReportFormat] = useState<GroupReportFormat>('student_roster')
  const [inModalSearch, setInModalSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({})
  const [exporting, setExporting] = useState<'xlsx' | null>(null)
  const pathname = usePathname()
  const isAdminWorkspace = pathname?.startsWith('/admin') ?? false
  const { viewingSemester } = useSemester()
  const { events: semesterEvents } = useSemesterEvents(viewingSemester?.id)

  useEffect(() => {
    fetchOverviewData()
  }, [user])

  async function fetchOverviewData() {
    setLoading(true)
    try {
      const [studentsRes, courseUnitsRes, coursesRes, groupsRes, groupMembersRes, courseworksRes, enrollmentsRes] = await Promise.all([
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('course_units').select('*, course:courses(code, name)').eq('is_active', true).order('name'),
        supabase.from('courses').select('*, faculty:faculties(code, name)').order('name'),
        supabase.from('groups').select('id, name, description, status, max_members, leader_id, created_at, leader:users!groups_leader_id_fkey(full_name, email), coursework:courseworks(id, title, course_unit_id, course_unit:course_units(id, code, name))').order('created_at', { ascending: false }),
        supabase.from('group_members').select('id, group_id, user_id, role, joined_at, user:users(full_name, email, student_registration_number, whatsapp_phone, course, gender)').order('joined_at', { ascending: false }),
        supabase.from('courseworks').select('id, title, description, type, min_group_size, max_group_size, allow_self_formation, is_published, lock_at, created_at, course_unit_id, course_unit:course_units(id, code, name)').order('created_at', { ascending: false }),
        supabase.from('student_course_units').select('id, user_id, course_unit_id, status, course_unit:course_units(code, name)').eq('status', 'active'),
      ])

      const rawUsers = studentsRes.data || []
      const allStudents = rawUsers.filter((student: any) => {
        if (student.role === 'admin' || student.role === 'coordinator') {
          return student.status === 'selected_coordinator' || Boolean(student.student_registration_number)
        }
        return true
      })

      const allGroups = groupsRes.data || []
      const allMembers = groupMembersRes.data || []
      const allCourseUnits = courseUnitsRes.data || []
      const allCourses = coursesRes.data || []
      const allCourseworks = courseworksRes.data || []
      const allEnrollments = enrollmentsRes.data || []

      const memberUserIds = new Set(allMembers.map((member: any) => member.user_id))
      const orphanStudents = allStudents.filter((student: any) => !memberUserIds.has(student.id))

      const courseStudentMap = new Map<string, any[]>()
      allStudents.forEach((student: any) => {
        const rawCourse = (student.course || '').trim()
        const matchedCourse = allCourses.find((c: any) =>
          c.code?.toLowerCase() === rawCourse.toLowerCase() ||
          c.name?.toLowerCase() === rawCourse.toLowerCase() ||
          rawCourse.toLowerCase().includes((c.code || '').toLowerCase())
        )
        const key = matchedCourse ? `${matchedCourse.code} - ${matchedCourse.name}` : (rawCourse || 'Unassigned')
        if (!courseStudentMap.has(key)) {
          courseStudentMap.set(key, [])
        }
        courseStudentMap.get(key)!.push({
          id: student.id,
          course_id: matchedCourse?.id || null,
          student_name: student.full_name,
          email: student.email,
          registration_number: student.student_registration_number,
          course: key,
          gender: student.gender || '—',
          whatsapp_phone: student.whatsapp_phone || '—',
        })
      })

      const courseUnitStudentMap = new Map<string, any[]>()
      const courseUnitStudentIds = new Map<string, Set<string>>()
      allEnrollments.forEach((enrollment: any) => {
        const unit = allCourseUnits.find((item: any) => item.id === enrollment.course_unit_id)
        const student = rawUsers.find((item: any) => item.id === enrollment.user_id)
        if (!unit || !student) return

        const key = `${unit.code} - ${unit.name}`
        if (!courseUnitStudentMap.has(key)) {
          courseUnitStudentMap.set(key, [])
          courseUnitStudentIds.set(key, new Set())
        }
        const studentIds = courseUnitStudentIds.get(key)!
        if (studentIds.has(student.id)) return
        studentIds.add(student.id)

        courseUnitStudentMap.get(key)!.push({
          id: student.id,
          course_unit_id: unit.id,
          student_name: student.full_name,
          email: student.email,
          registration_number: student.student_registration_number,
          course_unit: key,
          course: student.course || 'Unassigned',
          gender: student.gender || '—',
          whatsapp_phone: student.whatsapp_phone || '—',
        })
      })

      const datasetMap: Record<string, any[]> = {
        students: allStudents.map((student: any) => ({
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          student_registration_number: student.student_registration_number,
          course: student.course || 'Unassigned',
          whatsapp_phone: student.whatsapp_phone || '—',
          gender: student.gender || '—',
          created_at: student.created_at,
        })),
        orphan_students: orphanStudents.map((student: any) => ({
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          student_registration_number: student.student_registration_number,
          course: student.course || 'Unassigned',
          whatsapp_phone: student.whatsapp_phone || '—',
          gender: student.gender || '—',
          created_at: student.created_at,
        })),
        groups: allGroups.map((group: any) => {
          const unitId = group.coursework?.course_unit_id || group.coursework?.course_unit?.id || null
          const members = (allMembers || [])
            .filter((member: any) => member.group_id === group.id)
            .map((member: any) => ({
              id: member.user_id,
              student_name: member.user?.full_name || 'Student',
              registration_number: member.user?.student_registration_number || '—',
              email: member.user?.email || '—',
              whatsapp_phone: member.user?.whatsapp_phone || '—',
              course: member.user?.course || '—',
              gender: member.user?.gender || '—',
              role: member.role,
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
            course_unit_id: unitId,
            course_unit: group.coursework?.course_unit?.code || '—',
            course_unit_name: group.coursework?.course_unit?.name || '—',
            members,
            member_count: members.length,
            created_at: group.created_at,
          }
        }),
        course_units: allCourseUnits.map((unit: any) => ({
          id: unit.id,
          code: unit.code,
          name: unit.name,
          course: unit.course?.code || '—',
          course_name: unit.course?.name || '—',
          coordinator: unit.coordinator_id || '—',
          max_group_size: unit.max_group_size,
          min_group_size: unit.min_group_size,
          created_at: unit.created_at,
        })),
        courses: allCourses.map((course: any) => ({
          id: course.id,
          code: course.code,
          name: course.name,
          description: course.description || '—',
          faculty: course.faculty?.name || course.faculty?.code || 'Unassigned',
          is_active: course.is_active ? 'Active' : 'Inactive',
          created_at: course.created_at,
        })),
        coursework: allCourseworks.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || '—',
          type: item.type,
          course_unit_id: item.course_unit_id || item.course_unit?.id || null,
          course_unit: item.course_unit?.code || '—',
          course_unit_name: item.course_unit?.name || '—',
          min_group_size: item.min_group_size,
          max_group_size: item.max_group_size,
          self_formation: item.allow_self_formation ? 'Yes' : 'No',
          status: item.is_published ? 'Published' : 'Draft',
          lock_at: item.lock_at,
          created_at: item.created_at,
        })),
        course_unit_students: Array.from(courseUnitStudentMap.entries()).flatMap(([unitKey, students]) =>
          students.map((student: any) => ({
            ...student,
            course_unit: unitKey,
          }))
        ),
        course_students: Array.from(courseStudentMap.entries()).flatMap(([courseName, students]) =>
          students.map((student: any) => ({
            ...student,
            course: courseName,
          }))
        ),
      }

      setOverviewData((previous) => ({ ...datasetMap, semester_calendar: previous.semester_calendar || [] }))
    } catch (error) {
      console.error('Error loading report overview data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getColumnsForCategory = (category: ReportCategory): ReportColumn[] => {
    switch (category) {
      case 'students':
      case 'orphan_students':
        return [
          { key: 'full_name', header: 'Student Name', value: (row) => row.full_name || '—' },
          { key: 'email', header: 'Email', value: (row) => row.email || '—' },
          { key: 'student_registration_number', header: 'Reg No.', value: (row) => row.student_registration_number || '—' },
          { key: 'course', header: 'Course / Programme', value: (row) => row.course || '—' },
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (row) => row.whatsapp_phone || '—' },
          { key: 'gender', header: 'Gender', value: (row) => row.gender || '—' },
          { key: 'created_at', header: 'Date Registered', value: (row) => formatDate(row.created_at) },
        ]
      case 'groups':
        if (groupReportFormat === 'group_summary') {
          return [
            { key: 'name', header: 'Group Name', value: (row) => row.name || '—' },
            { key: 'course_unit', header: 'Course Unit Code', value: (row) => row.course_unit || '—' },
            { key: 'course_unit_name', header: 'Course Unit Name', value: (row) => row.course_unit_name || '—' },
            { key: 'coursework', header: 'Coursework Title', value: (row) => row.coursework || '—' },
            { key: 'leader', header: 'Group Leader', value: (row) => row.leader || '—' },
            { key: 'status', header: 'Status', value: (row) => row.status || '—' },
            { key: 'member_capacity', header: 'Capacity', value: (row) => row.member_capacity || '—' },
            { key: 'members_roster', header: 'Members List', value: (row) => row.members_roster || 'No members yet' },
            { key: 'created_at', header: 'Date Created', value: (row) => formatDate(row.created_at) },
          ]
        }
        if (groupReportFormat === 'department_matrix') {
          return [
            { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || '—' },
            { key: 'name', header: 'Group Name', value: (row) => row.name || '—' },
            { key: 'leader', header: 'Group Leader', value: (row) => row.leader || '—' },
            { key: 'coursework', header: 'Coursework Assignment', value: (row) => row.coursework || '—' },
            { key: 'member_capacity', header: 'Members', value: (row) => row.member_capacity || '—' },
            { key: 'status', header: 'Status', value: (row) => row.status || '—' },
            { key: 'members_roster', header: 'Roster Breakdown', value: (row) => row.members_roster || '—' },
          ]
        }
        // Format 1: student_roster
        return [
          { key: 'student_number', header: 'No.', value: (row) => String(row.student_number || '—') },
          { key: 'student_name', header: 'Student Name', value: (row) => row.student_name || '—' },
          { key: 'registration_number', header: 'Reg No.', value: (row) => row.registration_number || '—' },
          { key: 'email', header: 'Email', value: (row) => row.email || '—' },
          { key: 'role', header: 'Role', value: (row) => row.role || 'Member' },
          { key: 'name', header: 'Group Name', value: (row) => row.name || '—' },
          { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || '—' },
          { key: 'coursework', header: 'Coursework', value: (row) => row.coursework || '—' },
          { key: 'gender', header: 'Gender', value: (row) => row.gender || '—' },
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (row) => row.whatsapp_phone || '—' },
        ]
      case 'course_units':
        return [
          { key: 'code', header: 'Code', value: (row) => row.code || '—' },
          { key: 'name', header: 'Unit Name', value: (row) => row.name || '—' },
          { key: 'course', header: 'Course Code', value: (row) => row.course || '—' },
          { key: 'course_name', header: 'Course Name', value: (row) => row.course_name || '—' },
          { key: 'max_group_size', header: 'Max Group Size', value: (row) => String(row.max_group_size || 0) },
          { key: 'min_group_size', header: 'Min Group Size', value: (row) => String(row.min_group_size || 0) },
        ]
      case 'courses':
        return [
          { key: 'code', header: 'Code', value: (row) => row.code || '—' },
          { key: 'name', header: 'Programme Name', value: (row) => row.name || '—' },
          { key: 'description', header: 'Description', value: (row) => row.description || '—' },
          { key: 'faculty', header: 'Faculty', value: (row) => row.faculty || '—' },
          { key: 'is_active', header: 'Status', value: (row) => row.is_active || '—' },
        ]
      case 'coursework':
        return [
          { key: 'title', header: 'Coursework Title', value: (row) => row.title || '—' },
          { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || '—' },
          { key: 'type', header: 'Type', value: (row) => row.type || '—' },
          { key: 'status', header: 'Status', value: (row) => row.status || '—' },
          { key: 'self_formation', header: 'Self Formation', value: (row) => row.self_formation || '—' },
          { key: 'group_size', header: 'Group Size Range', value: (row) => `${row.min_group_size || 0} – ${row.max_group_size || 0}` },
          { key: 'lock_at', header: 'Lock Date', value: (row) => (row.lock_at ? formatDate(row.lock_at) : '—') },
        ]
      case 'course_unit_students':
      case 'course_students':
        return [
          { key: 'student_name', header: 'Student Name', value: (row) => row.student_name || '—' },
          { key: 'registration_number', header: 'Reg No.', value: (row) => row.registration_number || '—' },
          { key: 'email', header: 'Email', value: (row) => row.email || '—' },
          { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || '—' },
          { key: 'course', header: 'Course / Programme', value: (row) => row.course || '—' },
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (row) => row.whatsapp_phone || '—' },
          { key: 'gender', header: 'Gender', value: (row) => row.gender || '—' },
        ]
      case 'semester_calendar':
        return calendarColumns as ReportColumn[]
      default:
        return []
    }
  }

  useEffect(() => {
    setOverviewData((previous) => ({ ...previous, semester_calendar: calendarRows(viewingSemester, semesterEvents) }))
  }, [viewingSemester, semesterEvents])

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

  const courseUnitOptions = overviewData.course_units || []
  const courseOptions = overviewData.courses || []
  const filteredGroupsForUnit = selectedCourseUnitId
    ? (overviewData.groups || [])
      .filter((group: any) => group.course_unit_id === selectedCourseUnitId || !selectedCourseUnitId)
      .sort((firstGroup: any, secondGroup: any) => compareGroupNames(firstGroup.name, secondGroup.name))
    : (overviewData.groups || []).sort((firstGroup: any, secondGroup: any) => compareGroupNames(firstGroup.name, secondGroup.name))
  const selectedGroup = filteredGroupsForUnit.find((group: any) => group.id === selectedGroupId) || null
  
  const selectedUnitStudents = selectedCourseUnitId
    ? (overviewData.course_unit_students || []).filter((student: any) => {
        if (student.course_unit_id && student.course_unit_id === selectedCourseUnitId) return true
        const unitName = student.course_unit || ''
        const selectedUnit = courseUnitOptions.find((unit: any) => unit.id === selectedCourseUnitId)
        return selectedUnit ? unitName.includes(selectedUnit.code || '') || unitName === `${selectedUnit.code} - ${selectedUnit.name}` : true
      })
    : (overviewData.course_unit_students || [])

  const selectedCourse = courseOptions.find((course: any) => course.id === selectedCourseId) || null
  const filteredStudentsForCourse = selectedCourse
    ? (overviewData.course_students || []).filter((student: any) => {
        if (student.course_id && student.course_id === selectedCourse.id) return true
        const courseName = (student.course || '').toLowerCase()
        const code = (selectedCourse.code || '').toLowerCase()
        const name = (selectedCourse.name || '').toLowerCase()
        return courseName.includes(code) || courseName.includes(name) || code.includes(courseName)
      })
    : (overviewData.course_students || [])

  const getBaseRows = () => {
    if (!selectedCategory) return []
    if (selectedCategory === 'groups') {
      const targetGroups = selectedGroup
        ? [selectedGroup]
        : selectedCourseUnitId
          ? filteredGroupsForUnit
          : [...(overviewData.groups || [])].sort((firstGroup: any, secondGroup: any) => compareGroupNames(firstGroup.name, secondGroup.name))

      if (groupReportFormat === 'group_summary' || groupReportFormat === 'department_matrix') {
        return targetGroups.map((g: any) => ({
          ...g,
          member_capacity: `${g.member_count || (g.members || []).length} / ${g.max_members || 0}`,
          members_roster: (g.members || []).length > 0
            ? g.members.map((m: any) => `${m.student_name || m.full_name || 'Student'} (${m.registration_number || 'No Reg'})`).join(', ')
            : 'No members assigned',
        }))
      }

      // Format 1: student_roster (Detailed Student-Level Roster)
      const studentRows: any[] = []
      let counter = 1
      targetGroups.forEach((g: any) => {
        const members = g.members || []
        if (members.length === 0) {
          studentRows.push({
            id: `empty-${g.id}`,
            student_number: counter++,
            student_name: '— No Members Assigned —',
            registration_number: '—',
            role: '—',
            name: g.name,
            course_unit: g.course_unit || '—',
            course_unit_name: g.course_unit_name || '—',
            coursework: g.coursework || '—',
            gender: '—',
            email: '—',
            whatsapp_phone: '—',
          })
        } else {
          members.forEach((m: any) => {
            const isLeader = g.leader_id === m.id || m.role === 'leader' || (g.leader && g.leader.toLowerCase().includes((m.student_name || '').toLowerCase()))
            studentRows.push({
              id: `${g.id}-${m.id || Math.random()}`,
              student_number: counter++,
              student_name: m.student_name || m.full_name || 'Student',
              registration_number: m.registration_number || '—',
              role: isLeader ? 'Group Leader' : 'Member',
              name: g.name,
              course_unit: g.course_unit || '—',
              course_unit_name: g.course_unit_name || '—',
              coursework: g.coursework || '—',
              gender: m.gender || '—',
              email: m.email || '—',
              whatsapp_phone: m.whatsapp_phone || '—',
            })
          })
        }
      })
      return studentRows
    }

    if (selectedCategory === 'course_unit_students') {
      if (selectedCourseUnitId) return selectedUnitStudents
      return overviewData.course_unit_students || []
    }
    if (selectedCategory === 'course_students') {
      if (selectedCourseId) return filteredStudentsForCourse
      return overviewData.course_students || []
    }
    return overviewData[selectedCategory] || []
  }

  const getActiveRows = () => {
    let rows = getBaseRows()

    // In-modal live search filter
    if (inModalSearch.trim()) {
      const q = inModalSearch.toLowerCase().trim()
      rows = rows.filter((row: any) => {
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false
          if (typeof val === 'object') {
            return JSON.stringify(val).toLowerCase().includes(q)
          }
          return String(val).toLowerCase().includes(q)
        })
      })
    }

    // Column Sorting
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
    const baseCols = getColumnsForCategory(selectedCategory)
    return baseCols.filter((col) => selectedColumnKeys[col.key] !== false)
  }

  const handleSortToggle = (colKey: string) => {
    if (sortColumn === colKey) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else {
        setSortColumn(null)
        setSortOrder('asc')
      }
    } else {
      setSortColumn(colKey)
      setSortOrder('asc')
    }
  }

  // ── Exports ────────────────────────────────────────────────────────────
  const exportSpecs = (): ReportColumnSpec[] =>
    getActiveColumns().map((column) => ({ ...column, numeric: column.numeric || column.key === 'student_number' || column.key === 'days', mono: /registration|reg_no|^code$|course_unit$|phone/.test(column.key) }))

  const filterDescription = () => {
    const parts: string[] = []
    const unit = courseUnitOptions.find((item: any) => item.id === selectedCourseUnitId)
    if (unit && (selectedCategory === 'groups' || selectedCategory === 'course_unit_students')) parts.push(`${unit.code} · ${unit.name}`)
    if (selectedGroup) parts.push(`Group: ${selectedGroup.name}`)
    if (selectedCourse && selectedCategory === 'course_students') parts.push(`${selectedCourse.code} · ${selectedCourse.name}`)
    if (inModalSearch.trim()) parts.push(`Matching “${inModalSearch.trim()}”`)
    return parts.join('  ·  ') || 'All records'
  }

  const reportMeta = (): ReportMeta => ({
    title: reportTiles.find((tile) => tile.id === selectedCategory)?.label || 'Report',
    subtitle: filterDescription(),
    semester: viewingSemester ? semesterLabel(viewingSemester) : undefined,
    preparedBy: isAdminWorkspace ? 'Administrator workspace' : 'Coordinator workspace',
  })

  const signatures = ['Course Coordinator', 'Head of Department', 'Academic Registrar']

  const targetGroups = (): ReportGroup[] => {
    const list = selectedGroup
      ? [selectedGroup]
      : selectedCourseUnitId
        ? filteredGroupsForUnit
        : [...(overviewData.groups || [])].sort((first: any, second: any) => compareGroupNames(first.name, second.name))
    const query = inModalSearch.trim().toLowerCase()
    return query ? list.filter((group: any) => JSON.stringify(group).toLowerCase().includes(query)) : list
  }

  const ensureRows = () => {
    if (!selectedCategory) return false
    if (getActiveRows().length === 0 || getActiveColumns().length === 0) {
      toast.info('Nothing to export. Clear the search or pick at least one column.')
      return false
    }
    return true
  }

  const fileName = (extension: string) =>
    reportFileName([
      'nest',
      selectedCategory,
      selectedCategory === 'groups' ? groupReportFormat : null,
      viewingSemester ? `${viewingSemester.name} ${viewingSemester.academic_year}` : null,
    ], extension)

  const listOptions = () => {
    const isUnitList = selectedCategory === 'course_unit_students' || selectedCategory === 'coursework'
    const isFacultyList = selectedCategory === 'courses'
    return {
      groupKey: (row: any) => (isUnitList ? row.course_unit : isFacultyList ? row.faculty : selectedCategory === 'course_units' ? row.course : row.course) || 'Unassigned',
      groupLabel: isUnitList ? 'Course unit' : isFacultyList ? 'Faculty' : 'Course',
      titleOf: (row: any) => row.full_name || row.student_name || row.title || row.name || row.code || 'Record',
      subtitleOf: (row: any) => row.student_registration_number || row.registration_number || row.code || row.course_unit || row.email || '',
    }
  }

  const handleExportCsv = () => {
    if (!ensureRows()) return
    downloadCsv(fileName('csv'), exportSpecs(), getActiveRows())
  }

  const handleExportXlsx = async () => {
    if (!ensureRows() || !selectedCategory) return
    setExporting('xlsx')
    try {
      const columns = exportSpecs()
      const rows = getActiveRows()
      const meta = reportMeta()
      let sheets: SheetSpec[]
      if (selectedCategory === 'groups') {
        sheets = groupSheets(groupReportFormat, targetGroups(), { columns, rows })
      } else if (selectedCategory === 'semester_calendar') {
        sheets = [{ name: 'Semester calendar', columns, sections: [{ rows }], summary: calendarSummary(rows), wrapKeys: ['description'] }]
      } else {
        sheets = listSheets({ name: meta.title, layout: modalLayoutMode, columns, rows, summary: [{ label: 'Records', value: rows.length }], ...listOptions() })
      }
      await downloadXlsx(fileName('xlsx'), meta, sheets)
    } catch (error) {
      console.error('Excel export failed:', error)
      toast.error('Could not build the Excel file. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = () => {
    if (!ensureRows() || !selectedCategory) return
    const columns = exportSpecs()
    const rows = getActiveRows()
    const meta = reportMeta()
    let doc: PrintDocument
    if (selectedCategory === 'groups') {
      doc = groupPrintDocument(groupReportFormat, meta, targetGroups(), { columns, rows, groupedOrder: !sortColumn || sortColumn === 'name' }, signatures)
    } else if (selectedCategory === 'semester_calendar') {
      doc = {
        meta,
        orientation: 'portrait',
        summary: calendarSummary(rows),
        bodyHtml: calendarPrintHtml(rows, modalLayoutMode === 'table' ? 'table' : 'timeline'),
        signatures: ['Academic Registrar', 'Dean of Faculty'],
      }
    } else {
      doc = listPrintDocument({ layout: modalLayoutMode, meta, columns, rows, signatures, ...listOptions() })
    }
    if (!openPrintDocument(doc)) toast.error('Your browser blocked the report window. Allow pop-ups for this site and try again.')
  }

  const renderTile = (tile: (typeof reportTiles)[number]) => {
    const Icon = tile.icon
    const count = overviewData[tile.id]?.length || 0

    return (
      <button
        key={tile.id}
        type="button"
        onClick={() => {
          setSelectedCategory(tile.id as ReportCategory)
          if (tile.id === 'groups' || tile.id === 'course_unit_students' || tile.id === 'course_students') {
            setSelectedCourseUnitId(null)
            setSelectedGroupId(null)
            setSelectedCourseId(null)
          }
        }}
        className="w-full text-left"
      >
        <Card
          hover
          className={`h-full overflow-hidden border border-border bg-gradient-to-br ${tile.color} p-[1px] transition-transform hover:-translate-y-0.5`}
        >
          <div className="h-full rounded-xl bg-surface p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-lg bg-gradient-to-br ${tile.color} p-3 text-white shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                {tile.showCount !== false && <Badge variant="secondary" className="font-mono font-bold">{count}</Badge>}
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="text-base font-semibold text-text-primary">{tile.label}</h3>
                <p className="text-xs text-text-secondary">{tile.description}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-primary font-semibold">
              <span>View & Custom Export</span>
              <span>→</span>
            </div>
          </div>
        </Card>
      </button>
    )
  }

  // --- LAYOUT VIEWER RENDERERS ---

  // 1. Card Grid View
  const renderCardGridView = (rows: any[], columns: ReportColumn[]) => {
    return (
      <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row: any, index: number) => {
          const titleVal = row.full_name || row.student_name || row.name || row.title || row.code || `Record #${index + 1}`
          const subVal = row.student_registration_number || row.email || row.course_unit || row.faculty || row.course || '—'
          const badgeVal = row.status || row.role || row.gender || row.is_active || row.type || null

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
    const groupingKey = selectedCategory === 'groups' ? 'course_unit' : selectedCategory === 'course_unit_students' ? 'course_unit' : 'course'
    const grouped = rows.reduce((acc: Record<string, any[]>, row: any) => {
      const groupName = row[groupingKey] || row.course_unit || row.course || row.status || 'General Roster'
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

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Coordinator Analytics
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Reports <span className="text-primary">& Analytics Overview</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">Browse, search, dynamically filter, and customize exports across all system rosters.</p>
          </div>

          <div className="inline-flex rounded-xl border border-border/60 bg-surface/80 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode('tiles')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${viewMode === 'tiles' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Tiles
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3 text-xs text-text-secondary flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>Open a report to filter it, choose columns and a layout, then export to Excel, CSV or PDF{viewingSemester ? ` for ${semesterLabel(viewingSemester)}` : ''}.</span>
          </div>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="space-y-3 py-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-xl bg-secondary/10" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'tiles' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {reportTiles.map(renderTile)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {reportTiles.map((tile) => {
                    const count = overviewData[tile.id]?.length || 0
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => setSelectedCategory(tile.id as ReportCategory)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`rounded-xl bg-gradient-to-br ${tile.color} p-2.5 text-white shadow-sm`}>
                            <tile.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary text-sm">{tile.label}</div>
                            <div className="text-xs text-text-secondary">{tile.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-primary">Open Roster →</span>
                          {tile.showCount !== false && <Badge variant="primary" className="font-mono">{count}</Badge>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Interactive Report Detail Modal */}
      <Modal
        isOpen={Boolean(selectedCategory)}
        onClose={() => {
          setSelectedCategory(null)
          setSelectedCourseUnitId(null)
          setSelectedGroupId(null)
          setSelectedCourseId(null)
          setIsFullScreen(false)
        }}
        title={selectedCategory ? reportTiles.find((tile) => tile.id === selectedCategory)?.label || 'Report Roster' : 'Report Roster'}
        description={selectedCategory ? 'Filter records, switch layout views, choose report format, and preview live exports' : 'Report Details'}
        size={isFullScreen ? 'full' : 'xl'}
      >
        <div className="space-y-5">
          {/* Group Report Format Selector (Only visible for Groups category) */}
          {selectedCategory === 'groups' && (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Report format
                </span>
                <span className="text-[11px] text-text-muted">Changes the PDF and Excel layout</span>
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
                  <div className="font-bold text-xs">1 · {GROUP_FORMAT_INFO.student_roster.label}</div>
                  <div className="text-[10px] opacity-85 mt-0.5">{GROUP_FORMAT_INFO.student_roster.description}</div>
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
                  <div className="font-bold text-xs">2 · {GROUP_FORMAT_INFO.group_summary.label}</div>
                  <div className="text-[10px] opacity-85 mt-0.5">{GROUP_FORMAT_INFO.group_summary.description}</div>
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
                  <div className="font-bold text-xs">3 · {GROUP_FORMAT_INFO.department_matrix.label}</div>
                  <div className="text-[10px] opacity-85 mt-0.5">{GROUP_FORMAT_INFO.department_matrix.description}</div>
                </button>
              </div>
            </div>
          )}

          {/* Top Control Bar: Category Filters, Search & Layout Switcher */}
          <div className="space-y-3 bg-surface-hover/30 p-4 rounded-2xl border border-border/80">
            {/* Category Specific Dropdowns */}
            {selectedCategory === 'groups' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Course Unit</label>
                  <select
                    value={selectedCourseUnitId || ''}
                    onChange={(event) => {
                      setSelectedCourseUnitId(event.target.value || null)
                      setSelectedGroupId(null)
                    }}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  >
                    <option value="">All Course Units</option>
                    {courseUnitOptions.map((unit: any) => (
                      <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Group</label>
                  <select
                    value={selectedGroupId || ''}
                    onChange={(event) => setSelectedGroupId(event.target.value || null)}
                    disabled={!selectedCourseUnitId || filteredGroupsForUnit.length === 0}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
                  >
                    <option value="">All Groups in Unit</option>
                    {filteredGroupsForUnit.map((group: any) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedCategory === 'course_unit_students' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Course Unit Roster</label>
                <select
                  value={selectedCourseUnitId || ''}
                  onChange={(event) => setSelectedCourseUnitId(event.target.value || null)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">All Course Units</option>
                  {courseUnitOptions.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedCategory === 'course_students' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Programme / Course</label>
                <select
                  value={selectedCourseId || ''}
                  onChange={(event) => setSelectedCourseId(event.target.value || null)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">All Degree Programmes</option>
                  {courseOptions.map((course: any) => (
                    <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
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
              <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setModalLayoutMode('table')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                    modalLayoutMode === 'table' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Table View"
                >
                  <Table className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalLayoutMode('cards')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                    modalLayoutMode === 'cards' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalLayoutMode('roster')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                    modalLayoutMode === 'roster' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Compact Roster View"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Compact</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalLayoutMode('accordion')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                    modalLayoutMode === 'accordion' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Grouped Accordion View"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Grouped</span>
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
              <span className="text-[11px] text-text-muted">
                {selectedCategory === 'groups'
                  ? `Exports use the ${GROUP_FORMAT_INFO[groupReportFormat].label.toLowerCase()} layout`
                  : selectedCategory === 'semester_calendar'
                    ? modalLayoutMode === 'table' ? 'PDF prints as a dated table' : 'PDF prints as a timeline'
                    : `PDF prints as: ${LIST_LAYOUT_INFO[modalLayoutMode].toLowerCase()}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1.5 text-text-muted" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportXlsx}
                loading={exporting === 'xlsx'}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" />
                PDF
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
      </Modal>
    </div>
  )
}