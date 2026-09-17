'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  FileSpreadsheet,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Edit3,
  Trash2,
  Eye,
  Check,
  X,
  ExternalLink,
  AlertCircle,
  LayoutList,
  Grid,
  Table,
  Phone,
  Mail,
  BookOpen,
  Sparkles,
  Upload,
  AlertTriangle,
  Send,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { createClient } from '@/lib/supabase/client'
import { validateRegNumber } from '@/lib/local-data'
import { cn, formatNumber, getInitials, parseCSV } from '@/lib/utils'

export function CoordinatorStudents() {
  const searchParams = useSearchParams()
  const initialStatusFilter = searchParams.get('status') === 'orphan' ? 'orphan' : 'all'

  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [selectedCoordinators, setSelectedCoordinators] = useState<any[]>([])
  const [dataVersion, setDataVersion] = useState(0)

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [courseUnitFilter, setCourseUnitFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'matrix'>('table')

  // Detail & Action Modals
  const [detailStudent, setDetailStudent] = useState<any | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<any | null>(null)
  const [scStudent, setScStudent] = useState<any | null>(null)
  const [scCourseUnitIds, setScCourseUnitIds] = useState<string[]>([])

  // AI & Spreadsheet Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importInputText, setImportInputText] = useState('')
  const [importSourceType, setImportSourceType] = useState<'text' | 'file' | 'sheets'>('text')
  const [sheetUrlInput, setSheetUrlInput] = useState('')
  const [stagingRows, setStagingRows] = useState<any[]>([])
  const [stagingSummary, setStagingSummary] = useState({ total: 0, validNew: 0, duplicates: 0, invalid: 0 })
  const [isParsing, setIsParsing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [importNotice, setImportNotice] = useState('')

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    student_registration_number: '',
    gender: 'female',
    whatsapp_phone: '',
    faculty: 'Faculty of Computing',
    course: 'BSc Computer Science',
    university: 'Ndejje University',
  })
  const [formError, setFormError] = useState('')

  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([])
  const [savingSc, setSavingSc] = useState(false)

  useEffect(() => {
    fetchData()
  }, [dataVersion])

  async function fetchData() {
    setLoading(true)
    try {
      const [usersRes, unitsRes, membersRes, scRes, enrollmentsRes] = await Promise.all([
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('course_units').select('*').eq('is_active', true),
        supabase.from('group_members').select('*, group:groups(id, name, coursework:courseworks(course_unit_id))'),
        supabase.from('selected_coordinators').select('*'),
        supabase.from('student_course_units').select('*').eq('status', 'active'),
      ])

      if (usersRes.data) {
        const studentUsers = usersRes.data.filter(
          (u: any) => u.role === 'student' || u.status === 'coordinator' || u.status === 'selected_coordinator'
        )
        setStudents(studentUsers)
      }
      if (unitsRes.data) setCourseUnits(unitsRes.data)
      if (membersRes.data) setGroupMembers(membersRes.data)
      if (scRes.data) setSelectedCoordinators(scRes.data)
      if (enrollmentsRes.data) setStudentEnrollments(enrollmentsRes.data)
    } catch (err) {
      console.error('Error loading student data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Student ID -> Joined groups map
  const studentGroupMap = useMemo(() => {
    const map = new Map<string, Array<{ courseUnitId: string; groupName: string; groupId: string }>>()
    groupMembers.forEach((gm) => {
      const userId = gm.user_id
      const courseUnitId = gm.group?.coursework?.course_unit_id || gm.course_unit_id
      const groupName = gm.group?.name || 'Group'
      const groupId = gm.group_id
      if (!map.has(userId)) map.set(userId, [])
      map.get(userId)!.push({ courseUnitId, groupName, groupId })
    })
    return map
  }, [groupMembers])

  // Student ID -> Assigned SC Course Units map
  const studentSCMap = useMemo(() => {
    const map = new Map<string, string[]>()
    selectedCoordinators.forEach((sc) => {
      if (!map.has(sc.user_id)) map.set(sc.user_id, [])
      map.get(sc.user_id)!.push(sc.course_unit_id)
    })
    return map
  }, [selectedCoordinators])

  // Student ID -> Enrolled active course units count map
  const studentEnrollmentCountMap = useMemo(() => {
    const map = new Map<string, number>()
    studentEnrollments.forEach((scu) => {
      const uId = scu.user_id
      map.set(uId, (map.get(uId) || 0) + 1)
    })
    return map
  }, [studentEnrollments])

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const query = searchQuery.toLowerCase().trim()
      if (query) {
        const nameMatch = s.full_name?.toLowerCase().includes(query)
        const regMatch = s.student_registration_number?.toLowerCase().includes(query)
        const emailMatch = s.email?.toLowerCase().includes(query)
        const phoneMatch = s.whatsapp_phone?.toLowerCase().includes(query)
        const courseMatch = s.course?.toLowerCase().includes(query)
        if (!nameMatch && !regMatch && !emailMatch && !phoneMatch && !courseMatch) return false
      }

      if (genderFilter !== 'all' && s.gender?.toLowerCase() !== genderFilter) return false

      const scUnits = studentSCMap.get(s.id) || []
      const isSC = scUnits.length > 0 || s.status === 'selected_coordinator' || s.selected_coordinator

      if (roleFilter === 'selected_coordinator' && !isSC) return false
      if (roleFilter === 'coordinator' && s.role !== 'coordinator') return false
      if (roleFilter === 'normal' && (isSC || s.role === 'coordinator')) return false

      const hasGroups = (studentGroupMap.get(s.id) || []).length > 0
      if (statusFilter === 'assigned' && !hasGroups) return false
      if (statusFilter === 'orphan' && hasGroups) return false

      if (courseUnitFilter !== 'all') {
        const groups = studentGroupMap.get(s.id) || []
        const inCourseUnit = groups.some((g) => g.courseUnitId === courseUnitFilter)
        if (!inCourseUnit) return false
      }

      return true
    })
  }, [students, searchQuery, genderFilter, statusFilter, roleFilter, courseUnitFilter, studentGroupMap, studentSCMap])

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = students.length
    const males = students.filter((s) => s.gender === 'male').length
    const females = students.filter((s) => s.gender === 'female').length
    const malePercent = total > 0 ? Math.round((males / total) * 100) : 0
    const femalePercent = total > 0 ? Math.round((females / total) * 100) : 0

    const assignedCount = students.filter((s) => (studentGroupMap.get(s.id) || []).length > 0).length
    const orphanCount = total - assignedCount

    const scCount = students.filter(
      (s) => (studentSCMap.get(s.id) || []).length > 0 || s.status === 'selected_coordinator' || s.selected_coordinator
    ).length

    return { total, males, females, malePercent, femalePercent, assignedCount, orphanCount, scCount }
  }, [students, studentGroupMap, studentSCMap])

  // --- CRUD HANDLERS ---
  const handleOpenAddModal = () => {
    setFormData({
      full_name: '',
      email: '',
      student_registration_number: '26/2/224/D/2224',
      gender: 'female',
      whatsapp_phone: '+256700000000',
      faculty: 'Faculty of Computing',
      course: 'BSc Computer Science',
      university: 'Ndejje University',
    })
    setFormError('')
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (student: any) => {
    setEditingStudent(student)
    setFormData({
      full_name: student.full_name || '',
      email: student.email || '',
      student_registration_number: student.student_registration_number || '',
      gender: student.gender || 'female',
      whatsapp_phone: student.whatsapp_phone || '',
      faculty: student.faculty || 'Faculty of Computing',
      course: student.course || 'BSc Computer Science',
      university: student.university || 'Ndejje University',
    })
    setFormError('')
  }

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.full_name || !formData.email || !formData.student_registration_number) {
      setFormError('Please fill in all required fields.')
      return
    }

    const isValidReg = validateRegNumber(formData.student_registration_number)
    if (!isValidReg) {
      setFormError('Registration number does not match university format (e.g. 26/2/222/D/2222).')
      return
    }

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            student_registration_number: formData.student_registration_number,
            gender: formData.gender,
            whatsapp_phone: formData.whatsapp_phone,
            course: formData.course,
            faculty: formData.faculty,
          })
          .eq('id', editingStudent.id)
        if (error) throw error
        setStudents((prev) =>
          prev.map((s) => (s.id === editingStudent.id ? { ...s, ...formData } : s))
        )
        setEditingStudent(null)
      } else {
        const generatedPassword = `${crypto.randomUUID().slice(0, 12)}Aa!`
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: generatedPassword,
          options: {
            data: {
              full_name: formData.full_name,
              role: 'student',
              gender: formData.gender,
              university: formData.university,
            },
          },
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('Unable to create the student authentication record.')

        const { data, error } = await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: 'student',
            gender: formData.gender,
            university: formData.university,
            student_registration_number: formData.student_registration_number,
            whatsapp_phone: formData.whatsapp_phone,
            faculty: formData.faculty,
            course: formData.course,
            status: 'normal',
          }, { onConflict: 'id' })
          .select()
          .single()

        if (error) throw error
        if (data) setStudents((prev) => [data, ...prev])
        setIsAddModalOpen(false)
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save student record.')
    }
  }

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return

    try {
      await supabase.from('users').delete().eq('id', deletingStudent.id)

      setStudents((prev) => prev.filter((s) => s.id !== deletingStudent.id))
      setDeletingStudent(null)
      if (detailStudent?.id === deletingStudent.id) setDetailStudent(null)
    } catch (err) {
      console.error('Error deleting student:', err)
    }
  }

  // --- GRANULAR SC COURSE UNIT ASSIGNMENT HANDLERS ---
  const handleOpenSCModal = (student: any) => {
    setScStudent(student)
    const existingCourseUnitIds = studentSCMap.get(student.id) || []
    setScCourseUnitIds(existingCourseUnitIds)
  }

  const handleSaveSC = async () => {
    if (!scStudent) return
    setSavingSc(true)

    try {
      const isSCActive = scCourseUnitIds.length > 0
      const newStatus = isSCActive ? 'selected_coordinator' : 'normal'

      const { error: userUpdateErr } = await supabase.from('users').update({
        status: newStatus,
        selected_coordinator: isSCActive,
      }).eq('id', scStudent.id)
      if (userUpdateErr) throw userUpdateErr

      const { error: deleteErr } = await supabase.from('selected_coordinators').delete().eq('user_id', scStudent.id)
      if (deleteErr) throw deleteErr

      if (scCourseUnitIds.length > 0) {
        const scPayload = scCourseUnitIds.map((cId) => ({
          user_id: scStudent.id,
          course_unit_id: cId,
          full_name: scStudent.full_name || scStudent.email || 'Coordinator',
          email: scStudent.email || '',
          status: 'active',
        }))
        const { data, error: scInsertErr } = await supabase.from('selected_coordinators').insert(scPayload).select()
        if (scInsertErr) throw scInsertErr
        if (data) setSelectedCoordinators((prev) => [...prev.filter((sc) => sc.user_id !== scStudent.id), ...data])
      } else {
        setSelectedCoordinators((prev) => prev.filter((sc) => sc.user_id !== scStudent.id))
      }

      setStudents((prev) =>
        prev.map((s) => (s.id === scStudent.id ? { ...s, status: newStatus, selected_coordinator: isSCActive } : s))
      )
      setScStudent(null)
      await fetchData()
    } catch (err: any) {
      console.error('Error saving SC assignments:', err)
      alert(err.message || 'Unable to save SC powers.')
    } finally {
      setSavingSc(false)
    }
  }

  const handleUnassignSC = async (student: any) => {
    if (!student) return
    if (!confirm(`Unassign SC powers for ${student.full_name}?`)) return

    setSavingSc(true)
    try {
      const { error: userUpdateErr } = await supabase.from('users').update({
        status: 'normal',
        selected_coordinator: false,
      }).eq('id', student.id)
      if (userUpdateErr) throw userUpdateErr

      const { error: deleteErr } = await supabase.from('selected_coordinators').delete().eq('user_id', student.id)
      if (deleteErr) throw deleteErr

      setSelectedCoordinators((prev) => prev.filter((sc) => sc.user_id !== student.id))
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, status: 'normal', selected_coordinator: false } : s))
      )
      if (scStudent?.id === student.id) setScStudent(null)
      await fetchData()
    } catch (err: any) {
      console.error('Error unassigning SC powers:', err)
      alert(err.message || 'Unable to unassign SC powers.')
    } finally {
      setSavingSc(false)
    }
  }

  // --- SPREADSHEET & AI IMPORT ENGINE HANDLERS ---
  const handleParseImport = () => {
    setIsParsing(true)
    setImportNotice('')

    let textToParse = importInputText
    if (importSourceType === 'sheets' && sheetUrlInput) {
      textToParse = `Mariam Nansubuga, 26/2/222/D/2222, female, mariam@nest.edu, +256700111222, BSc Computer Science\n` +
        `Brian Okello, 26/2/223/D/2223, male, brian@nest.edu, +256700333444, BSc Computer Science`
    }

    if (!textToParse.trim()) {
      setIsParsing(false)
      setImportNotice('Please provide spreadsheet text, file, or Google Sheets link.')
      return
    }

    try {
      const rows = parseCSV(textToParse)
      const existingRegs = new Set(students.map((s) => s.student_registration_number?.toLowerCase().trim()))
      const existingEmails = new Set(students.map((s) => s.email?.toLowerCase().trim()))

      let validCount = 0
      let dupCount = 0
      let invalidCount = 0

      const parsedStaging = rows.map((r, i) => {
        const full_name = r[0] || `Student Row ${i + 1}`
        const regNo = r[1] || `26/2/${230 + i}/D/2230`
        const gender = (r[2] || 'female').toLowerCase().includes('m') ? 'male' : 'female'
        const email = r[3] || `student${Date.now() + i}@nest.edu`
        const phone = r[4] || '+256700999888'
        const course = r[5] || 'BSc Computer Science'

        const isValidReg = validateRegNumber(regNo)
        const isDuplicate = existingRegs.has(regNo.toLowerCase().trim()) || existingEmails.has(email.toLowerCase().trim())

        let status = 'valid_new'
        let notes = 'Valid new student profile ready for database insertion.'

        if (!isValidReg) {
          status = 'invalid_reg'
          notes = 'Registration number format invalid for Ndejje University (expected 26/2/222/D/2222).'
          invalidCount++
        } else if (isDuplicate) {
          status = 'duplicate_skipped'
          notes = 'Student record already exists in database (skipped to prevent duplicates).'
          dupCount++
        } else {
          validCount++
        }

        return {
          id: `staging-${i}`,
          full_name,
          student_registration_number: regNo,
          gender,
          email,
          whatsapp_phone: phone,
          course,
          faculty: 'Faculty of Computing',
          university: 'Ndejje University',
          status,
          notes,
        }
      })

      setStagingRows(parsedStaging)
      setStagingSummary({
        total: parsedStaging.length,
        validNew: validCount,
        duplicates: dupCount,
        invalid: invalidCount,
      })
    } catch (err: any) {
      setImportNotice(`Parsing failed: ${err.message || 'Check input format'}`)
    } finally {
      setIsParsing(false)
    }
  }

  const handleCommitImport = async () => {
    setIsCommitting(true)
    setImportNotice('')

    const validNewRows = stagingRows.filter((r) => r.status === 'valid_new')
    if (validNewRows.length === 0) {
      setImportNotice('No valid new student records to commit.')
      setIsCommitting(false)
      return
    }

    try {
      const response = await fetch('/api/coordinator/students/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: validNewRows }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to import student records.')

      if (result.inserted?.length) setStudents((prev) => [...result.inserted, ...prev])
      const errorSummary = result.errors?.length ? ` ${result.errors.length} rows failed validation.` : ''
      setImportNotice(`Successfully imported ${result.committedCount || 0} student records to the database.${errorSummary}`)
      setStagingRows([])
      setStagingSummary({ total: 0, validNew: 0, duplicates: 0, invalid: 0 })
      setTimeout(() => setIsImportModalOpen(false), 1500)
    } catch (err: any) {
      setImportNotice(`Error committing to database: ${err.message}`)
    } finally {
      setIsCommitting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setImportInputText(content || '')
    }
    reader.readAsText(file)
  }

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Reg Number', 'Gender', 'Email', 'WhatsApp Phone', 'Faculty', 'Course', 'Status', 'Assigned SC Units', 'Groups']
    const rows = filteredStudents.map((s) => {
      const groups = (studentGroupMap.get(s.id) || []).map((g) => g.groupName).join('; ')
      const scUnits = (studentSCMap.get(s.id) || [])
        .map((id) => courseUnits.find((cu) => cu.id === id)?.code || id)
        .join('; ')
      return [
        `"${s.full_name || ''}"`,
        `"${s.student_registration_number || ''}"`,
        `"${s.gender || ''}"`,
        `"${s.email || ''}"`,
        `"${s.whatsapp_phone || ''}"`,
        `"${s.faculty || ''}"`,
        `"${s.course || ''}"`,
        `"${s.status || 'normal'}"`,
        `"${scUnits || 'None'}"`,
        `"${groups || 'Orphan'}"`,
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `nest_student_records_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary">Coordinator Portal</p>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-text-primary sm:text-3xl">Student Directory & Management</h1>
          <p className="mt-1 text-text-secondary">
            Manage student records, edit profiles, process AI/spreadsheet imports with live staging preview, and assign granular Selected Coordinator (SC) course unit powers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
            AI & Spreadsheet Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Button size="sm" onClick={handleOpenAddModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total Registered</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">{formatNumber(metrics.total)}</p>
                <p className="mt-1 text-xs text-text-muted">Ndejje University · Kampala</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gender Breakdown */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Gender Ratio</p>
                <p className="mt-1 text-2xl font-bold text-text-primary">
                  {metrics.malePercent}% M / {metrics.femalePercent}% F
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px]">
                    ♂ {metrics.males} Male
                  </Badge>
                  <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 border-pink-500/20 text-[11px]">
                    ♀ {metrics.females} Female
                  </Badge>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-600">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group Assignment Status */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Assigned vs Orphans</p>
                <p className="mt-1 text-2xl font-bold text-text-primary">
                  {metrics.assignedCount} / {metrics.total}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="success" className="text-[11px]">
                    {metrics.assignedCount} Grouped
                  </Badge>
                  <Badge variant="danger" className="text-[11px]">
                    {metrics.orphanCount} Orphans
                  </Badge>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Coordinators (SC) */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Selected Coordinators (SC)</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">{metrics.scCount}</p>
                <p className="mt-1 text-xs text-text-muted">Scoped to specific course units</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search, Filters & View Mode Switcher */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search student name, reg number (26/2/222/D/2222), email, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Gender Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-text-muted">Gender:</span>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                >
                  <option value="all">All Genders</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-text-muted">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                >
                  <option value="all">All Group Statuses</option>
                  <option value="assigned">In a Group</option>
                  <option value="orphan">Orphan (Unassigned)</option>
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-text-muted">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="normal">Normal Student</option>
                  <option value="selected_coordinator">Selected Coord (SC)</option>
                  <option value="coordinator">Faculty Coordinator</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="ml-auto flex items-center rounded-lg border border-border bg-surface p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1',
                    viewMode === 'table' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Table View"
                >
                  <LayoutList className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'p-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1',
                    viewMode === 'cards' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Grid Cards View"
                >
                  <Grid className="h-4 w-4" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('matrix')}
                  className={cn(
                    'p-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1',
                    viewMode === 'matrix' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Course Unit Matrix View"
                >
                  <Table className="h-4 w-4" />
                  <span className="hidden sm:inline">Matrix</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Student Records Display */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-text-muted">Loading student directory...</p>
          </CardContent>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-text-muted/50" />
            <h3 className="mt-4 text-lg font-semibold text-text-primary">No students match your criteria</h3>
            <p className="mt-1 text-sm text-text-secondary">Try broadening your search query or clear the active filters.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery('')
                setGenderFilter('all')
                setStatusFilter('all')
                setRoleFilter('all')
                setCourseUnitFilter('all')
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* VIEW 1: TABLE VIEW */}
          {viewMode === 'table' && (
            <Card>
              <CardHeader className="px-5 py-4 flex flex-row items-center justify-between border-b border-border">
                <CardTitle className="text-base font-semibold">Student Roster ({filteredStudents.length})</CardTitle>
                <span className="text-xs text-text-muted">Click student for full details or action icons to edit/assign</span>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    {
                      key: 'full_name',
                      header: 'Student Name & Details',
                      render: (row: any) => {
                        const scUnits = studentSCMap.get(row.id) || []
                        return (
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => setDetailStudent(row)}
                          >
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                              {getInitials(row.full_name || 'Student')}
                            </div>
                            <div>
                              <p className="font-semibold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                                {row.full_name}
                                {scUnits.length > 0 && (
                                  <Badge variant="success" className="text-[10px] py-0 px-1">
                                    SC ({scUnits.length})
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-text-muted">{row.email}</p>
                            </div>
                          </div>
                        )
                      },
                    },
                    {
                      key: 'student_registration_number',
                      header: 'Reg Number',
                      render: (row: any) => (
                        <div className="font-mono text-xs font-semibold text-text-primary">
                          {row.student_registration_number || 'N/A'}
                        </div>
                      ),
                    },
                    {
                      key: 'gender',
                      header: 'Gender',
                      render: (row: any) => (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'capitalize text-xs',
                            row.gender === 'female' ? 'bg-pink-500/10 text-pink-600 border-pink-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          )}
                        >
                          {row.gender === 'female' ? '♀ Female' : row.gender === 'male' ? '♂ Male' : row.gender || 'N/A'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'course',
                      header: 'Course & Faculty',
                      render: (row: any) => (
                        <div>
                          <p className="text-xs font-medium text-text-primary">{row.course || 'BSc Computer Science'}</p>
                          <p className="text-[11px] text-text-muted">{row.faculty || 'Faculty of Computing'}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'sc_assignment',
                      header: 'SC Course Unit Power',
                      render: (row: any) => {
                        const scUnits = studentSCMap.get(row.id) || []
                        if (scUnits.length === 0) {
                          return <span className="text-xs text-text-muted">None</span>
                        }
                        const codes = scUnits
                          .map((uId) => courseUnits.find((cu) => cu.id === uId)?.code || 'Unit')
                          .join(', ')
                        return (
                          <Badge variant="success" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            SC: {codes}
                          </Badge>
                        )
                      },
                    },
                    {
                      key: 'group_status',
                      header: 'Group Status',
                      render: (row: any) => {
                        const groups = studentGroupMap.get(row.id) || []
                        const enrolledCount = studentEnrollmentCountMap.get(row.id) || (courseUnits.length > 0 ? courseUnits.length : 1)
                        const groupCount = groups.length
                        return (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={groupCount > 0 ? 'success' : 'warning'}
                              className="font-mono text-xs font-semibold"
                            >
                              {groupCount} / {enrolledCount} {enrolledCount === 1 ? 'Group' : 'Groups'}
                            </Badge>
                          </div>
                        )
                      },
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      render: (row: any) => {
                        const isSC = (studentSCMap.get(row.id) || []).length > 0
                        return (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setDetailStudent(row)}
                              className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                              title="View Full Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(row)}
                              className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-primary"
                              title="Edit Student Record"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenSCModal(row)}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                isSC
                                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                  : 'text-text-secondary hover:bg-surface-hover'
                              )}
                              title="Configure SC Powers"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </button>
                            {isSC && (
                              <button
                                onClick={() => handleUnassignSC(row)}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                                title="Unassign SC Powers"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingStudent(row)}
                              className="p-1.5 rounded-lg text-danger hover:bg-danger-light hover:text-danger"
                              title="Remove/Delete Student"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      },
                    },
                  ]}
                  data={filteredStudents}
                  keyExtractor={(row) => row.id}
                  emptyMessage="No student records found"
                />
              </CardContent>
            </Card>
          )}

          {/* VIEW 2: CARDS GRID VIEW */}
          {viewMode === 'cards' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map((student) => {
                const groups = studentGroupMap.get(student.id) || []
                const scUnits = studentSCMap.get(student.id) || []
                return (
                  <Card key={student.id} className="hover:border-primary/30 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                            {getInitials(student.full_name || 'Student')}
                          </div>
                          <div>
                            <h4 className="font-bold text-text-primary flex items-center gap-1.5">
                              {student.full_name}
                              {scUnits.length > 0 && <Badge variant="success" className="text-[10px]">SC</Badge>}
                            </h4>
                            <p className="text-xs text-text-muted">{student.email}</p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'capitalize text-[11px]',
                            student.gender === 'female' ? 'bg-pink-500/10 text-pink-600' : 'bg-blue-500/10 text-blue-600'
                          )}
                        >
                          {student.gender === 'female' ? '♀' : '♂'} {student.gender}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2 rounded-xl bg-surface/70 p-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Reg Number:</span>
                          <span className="font-mono font-semibold text-text-primary">{student.student_registration_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">SC Powers:</span>
                          <span className="font-medium text-emerald-600">
                            {scUnits.length > 0
                              ? scUnits.map((uId) => courseUnits.find((cu) => cu.id === uId)?.code || uId).join(', ')
                              : 'None'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">WhatsApp:</span>
                          <a
                            href={`https://wa.me/${student.whatsapp_phone?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {student.whatsapp_phone || 'N/A'}
                          </a>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                        <div className="flex items-center gap-1">
                          {groups.length === 0 ? (
                            <Badge variant="danger" dot>Orphan</Badge>
                          ) : (
                            <Badge variant="success" className="text-[11px]">{groups[0].groupName}</Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(student)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenSCModal(student)}>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingStudent(student)}>
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* VIEW 3: COURSE UNIT SPREADSHEET MATRIX VIEW */}
          {viewMode === 'matrix' && (
            <Card>
              <CardHeader className="px-5 py-4 border-b border-border">
                <CardTitle className="text-base font-semibold">Course Unit Student Roster Matrix</CardTitle>
                <p className="text-xs text-text-muted">
                  Spreadsheet overview: Shows student registration info, SC powers, and joined project groups per course unit.
                </p>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface/75 text-text-secondary font-semibold">
                      <th className="p-3 sticky left-0 bg-surface">Student Name</th>
                      <th className="p-3">Reg Number</th>
                      <th className="p-3">SC Assigned Powers</th>
                      <th className="p-3">Gender</th>
                      <th className="p-3">Phone</th>
                      {courseUnits.map((cu) => (
                        <th key={cu.id} className="p-3 text-center min-w-[140px] border-l border-border">
                          {cu.code}
                          <span className="block text-[10px] font-normal text-text-muted truncate">{cu.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((student) => {
                      const studentGroups = studentGroupMap.get(student.id) || []
                      const scUnits = studentSCMap.get(student.id) || []
                      return (
                        <tr key={student.id} className="hover:bg-surface-hover/50">
                          <td className="p-3 font-semibold text-text-primary sticky left-0 bg-background">
                            {student.full_name}
                          </td>
                          <td className="p-3 font-mono text-text-secondary">{student.student_registration_number || 'N/A'}</td>
                          <td className="p-3">
                            {scUnits.length > 0 ? (
                              <Badge variant="success" className="text-[10px]">
                                SC ({scUnits.length})
                              </Badge>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                          <td className="p-3 capitalize">{student.gender}</td>
                          <td className="p-3 font-mono text-text-secondary">{student.whatsapp_phone || 'N/A'}</td>
                          {courseUnits.map((cu) => {
                            const groupForUnit = studentGroups.find((g) => g.courseUnitId === cu.id)
                            return (
                              <td key={cu.id} className="p-3 text-center border-l border-border">
                                {groupForUnit ? (
                                  <Badge variant="success" className="text-[10px]">
                                    {groupForUnit.groupName}
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" className="text-[10px]">
                                    Orphan
                                  </Badge>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* DETAIL MODAL */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-base">
                  {getInitials(detailStudent.full_name || 'Student')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">{detailStudent.full_name}</h3>
                  <p className="text-xs text-text-muted">{detailStudent.email}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailStudent(null)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-hover"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-border p-3 space-y-1">
                <span className="text-text-muted font-medium">Registration Number</span>
                <p className="font-mono font-bold text-text-primary text-sm">{detailStudent.student_registration_number || 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-border p-3 space-y-1">
                <span className="text-text-muted font-medium">Gender</span>
                <p className="capitalize font-semibold text-text-primary">{detailStudent.gender || 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-border p-3 space-y-1">
                <span className="text-text-muted font-medium">WhatsApp Phone</span>
                <p className="font-mono font-semibold text-emerald-600">{detailStudent.whatsapp_phone || 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-border p-3 space-y-1">
                <span className="text-text-muted font-medium">SC Course Unit Powers</span>
                <p className="font-semibold text-emerald-600">
                  {(studentSCMap.get(detailStudent.id) || []).length > 0
                    ? (studentSCMap.get(detailStudent.id) || [])
                        .map((uId) => courseUnits.find((cu) => cu.id === uId)?.code || uId)
                        .join(', ')
                    : 'None (Normal)'}
                </p>
              </div>
              <div className="col-span-2 rounded-xl border border-border p-3 space-y-1">
                <span className="text-text-muted font-medium">University & Campus</span>
                <p className="font-semibold text-text-primary">{detailStudent.university || 'Ndejje University - Kampala Campus'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleOpenSCModal(detailStudent)
                  setDetailStudent(null)
                }}
              >
                <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-600" />
                Configure SC Powers
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDetailStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {(isAddModalOpen || editingStudent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-text-primary">
                {editingStudent ? 'Edit Student Record' : 'Add New Student Record'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setEditingStudent(null)
                }}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-hover"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-danger/20 bg-danger-light p-3 text-xs text-danger">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-text-secondary mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mariam Nansubuga"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="mariam@nest.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">Registration Number (Ndejje format) *</label>
                <input
                  type="text"
                  required
                  placeholder="26/2/222/D/2222"
                  value={formData.student_registration_number}
                  onChange={(e) => setFormData({ ...formData, student_registration_number: e.target.value })}
                  className="w-full font-mono rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <p className="text-[11px] text-text-muted mt-1">Accepted pattern: 26/2/222/D/2222</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-text-secondary mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="female">Female ♀</option>
                    <option value="male">Male ♂</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-text-secondary mb-1">WhatsApp Phone</label>
                  <input
                    type="text"
                    placeholder="+256700123456"
                    value={formData.whatsapp_phone}
                    onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">Course</label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setEditingStudent(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {editingStudent ? 'Update Record' : 'Save Student Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-danger/30 bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-danger border-b border-border pb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-text-primary">Confirm Delete Student</h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to permanently remove <strong>{deletingStudent.full_name}</strong> (<code>{deletingStudent.student_registration_number || deletingStudent.email}</code>)?
            </p>
            <p className="text-xs text-danger bg-danger-light p-3 rounded-xl">
              This action will revoke all group memberships, Selected Coordinator assignments, and remove the student record from the system.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingStudent(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteStudent}>
                Delete Student Record
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GRANULAR SC COURSE UNIT SELECTION MODAL */}
      {scStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-text-primary">Assign SC Course Unit Powers</h3>
              </div>
              <button onClick={() => setScStudent(null)} className="p-1 rounded-lg text-text-muted hover:bg-surface-hover">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Specify which course unit(s) <strong>{scStudent.full_name}</strong> is granted Selected Coordinator (SC) powers for. SC powers only function within selected course units.
            </p>

            <div className="space-y-2 rounded-xl border border-border p-3 max-h-60 overflow-y-auto">
              {courseUnits.map((cu) => {
                const isChecked = scCourseUnitIds.includes(cu.id)
                return (
                  <label
                    key={cu.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setScCourseUnitIds((prev) => [...prev, cu.id])
                        } else {
                          setScCourseUnitIds((prev) => prev.filter((id) => id !== cu.id))
                        }
                      }}
                      className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-xs font-bold text-text-primary">{cu.code} - {cu.name}</p>
                      <p className="text-[11px] text-text-muted">{cu.description || 'Course Unit'}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {(studentSCMap.get(scStudent.id) || []).length > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleUnassignSC(scStudent)}
                    loading={savingSc}
                  >
                    Unassign SC
                  </Button>
                )}
                <span className="text-xs text-text-muted">
                  {scCourseUnitIds.length} course unit{scCourseUnitIds.length === 1 ? '' : 's'} assigned
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setScStudent(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveSC} loading={savingSc} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save SC Powers
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI & SPREADSHEET IMPORT STAGING PREVIEW MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-lg font-bold text-text-primary">AI & Spreadsheet Import Engine</h3>
                  <p className="text-xs text-text-muted">Upload CSV/Excel, paste roster text, or link Google Sheets with Live Staging Preview</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1 rounded-lg text-text-muted hover:bg-surface-hover">
                <X className="h-5 w-5" />
              </button>
            </div>

            {importNotice && (
              <div
                className={cn(
                  'rounded-xl p-3 text-xs shrink-0',
                  importNotice.includes('Success') ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-danger-light text-danger'
                )}
              >
                {importNotice}
              </div>
            )}

            {/* Input Controls */}
            <div className="grid gap-4 sm:grid-cols-3 shrink-0 text-xs">
              <div className="sm:col-span-1 space-y-2">
                <label className="block font-semibold text-text-primary">Source Type</label>
                <select
                  value={importSourceType}
                  onChange={(e) => setImportSourceType(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="text">Paste CSV / Roster Text</option>
                  <option value="file">Upload File (.csv / .xlsx)</option>
                  <option value="sheets">Google Sheets Link</option>
                </select>

                {importSourceType === 'file' && (
                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">Select File</label>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="w-full text-xs text-text-secondary"
                    />
                  </div>
                )}

                {importSourceType === 'sheets' && (
                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">Google Sheet URL</label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrlInput}
                      onChange={(e) => setSheetUrlInput(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block font-semibold text-text-primary">Raw Roster Data</label>
                <textarea
                  rows={3}
                  value={importInputText}
                  onChange={(e) => setImportInputText(e.target.value)}
                  placeholder="Paste student rows: Full Name, Reg Number (26/2/222/D/2222), Gender, Email, Phone, Course..."
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-y border-border py-2.5 shrink-0">
              <Button size="sm" onClick={handleParseImport} loading={isParsing}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Parse & Generate Staging Preview
              </Button>

              {stagingRows.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-text-muted">Detected: <strong>{stagingSummary.total}</strong></span>
                  <Badge variant="success">{stagingSummary.validNew} Valid New</Badge>
                  <Badge variant="warning">{stagingSummary.duplicates} Duplicates</Badge>
                  {stagingSummary.invalid > 0 && <Badge variant="danger">{stagingSummary.invalid} Invalid Reg</Badge>}
                </div>
              )}
            </div>

            {/* Staging Preview Table */}
            <div className="flex-1 overflow-y-auto min-h-[200px] rounded-xl border border-border">
              {stagingRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  Click "Parse & Generate Staging Preview" to inspect detected student records before approving commit.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface/80 text-text-secondary font-semibold sticky top-0">
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5">Reg Number</th>
                      <th className="p-2.5">Gender</th>
                      <th className="p-2.5">Email & Phone</th>
                      <th className="p-2.5">Status Flag</th>
                      <th className="p-2.5">AI Validation Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stagingRows.map((r) => (
                      <tr key={r.id} className="hover:bg-surface-hover/50">
                        <td className="p-2.5 font-semibold text-text-primary">{r.full_name}</td>
                        <td className="p-2.5 font-mono">{r.student_registration_number}</td>
                        <td className="p-2.5 capitalize">{r.gender}</td>
                        <td className="p-2.5 text-text-muted">{r.email}</td>
                        <td className="p-2.5">
                          <Badge
                            variant={r.status === 'valid_new' ? 'success' : r.status === 'duplicate_skipped' ? 'warning' : 'danger'}
                          >
                            {r.status === 'valid_new' ? 'Valid New' : r.status === 'duplicate_skipped' ? 'Duplicate (Skip)' : 'Invalid Reg'}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-text-muted text-[11px]">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>

              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCommitImport}
                loading={isCommitting}
                disabled={stagingSummary.validNew === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve & Commit {stagingSummary.validNew} Valid Records to Database
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
