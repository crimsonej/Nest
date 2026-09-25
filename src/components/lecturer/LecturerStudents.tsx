'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Search,
  GraduationCap,
  UserCheck,
  AlertCircle,
  LayoutList,
  Grid,
  RefreshCw,
  Phone,
  Mail,
  UserPlus,
  UserX,
  Plus,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { cn, formatNumber, getInitials } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

export function LecturerStudents() {
  const { user } = useAuth()
  const supabase = createClient()

  const [assignedCourseUnit, setAssignedCourseUnit] = useState<{ id: string; code: string; name: string } | null>(null)
  const [loadingUnit, setLoadingUnit] = useState(true)

  const [loading, setLoading] = useState(false)
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])

  // Filter / view state
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Enroll Modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [enrollSearchQuery, setEnrollSearchQuery] = useState('')
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Step 1: Fetch assigned course unit
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

  // Step 2: Fetch students scoped to unit
  useEffect(() => {
    if (!assignedCourseUnit?.id) return
    fetchData(assignedCourseUnit.id)
  }, [assignedCourseUnit?.id])

  async function fetchData(courseUnitId: string) {
    setLoading(true)
    try {
      const [usersRes, enrollmentsRes, groupsRes, membersRes] = await Promise.all([
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('student_course_units').select('*').eq('status', 'active').eq('course_unit_id', courseUnitId),
        supabase.from('groups').select('id, name, coursework:courseworks(course_unit_id)'),
        supabase.from('group_members').select('user_id, group_id'),
      ])

      const users = (usersRes.data || []).filter((u: any) => u.role === 'student' || u.status === 'normal' || u.status === 'selected_coordinator')
      const unitEnrollments = enrollmentsRes.data || []
      const enrolledIds = new Set(unitEnrollments.map((e: any) => e.user_id))

      const enrolledList = users.filter((u: any) => enrolledIds.has(u.id))

      const unitGroups = (groupsRes.data || []).filter((g: any) => g.coursework?.course_unit_id === courseUnitId)
      const unitGroupIds = new Set(unitGroups.map((g: any) => g.id))
      const unitMembers = (membersRes.data || []).filter((m: any) => unitGroupIds.has(m.group_id))

      setAllStudents(users)
      setEnrolledStudents(enrolledList)
      setGroups(unitGroups)
      setGroupMembers(unitMembers)
      setEnrollments(unitEnrollments)
    } catch (err) {
      console.error('Error fetching lecturer students:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build group assignment map
  const studentGroupMap = useMemo(() => {
    const map = new Map<string, string[]>()
    groupMembers.forEach((m) => {
      const group = groups.find((g) => g.id === m.group_id)
      if (!map.has(m.user_id)) map.set(m.user_id, [])
      if (group) map.get(m.user_id)!.push(group.name)
    })
    return map
  }, [groupMembers, groups])

  const filteredStudents = useMemo(() => {
    return enrolledStudents.filter((s) => {
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        const haystack = `${s.full_name} ${s.email} ${s.student_registration_number} ${s.whatsapp_phone} ${s.course}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (genderFilter !== 'all' && (s.gender || '').toLowerCase() !== genderFilter) return false
      const hasGroups = (studentGroupMap.get(s.id) || []).length > 0
      if (statusFilter === 'assigned' && !hasGroups) return false
      if (statusFilter === 'orphan' && hasGroups) return false
      return true
    })
  }, [enrolledStudents, searchQuery, genderFilter, statusFilter, studentGroupMap])

  // Non-enrolled students for the Enroll Modal
  const nonEnrolledStudents = useMemo(() => {
    const enrolledSet = new Set(enrolledStudents.map((s) => s.id))
    return allStudents.filter((s) => !enrolledSet.has(s.id)).filter((s) => {
      const q = enrollSearchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.student_registration_number || '').toLowerCase().includes(q)
      )
    })
  }, [allStudents, enrolledStudents, enrollSearchQuery])

  const metrics = useMemo(() => {
    const total = enrolledStudents.length
    const males = enrolledStudents.filter((s) => s.gender === 'male').length
    const females = enrolledStudents.filter((s) => s.gender === 'female').length
    const assigned = enrolledStudents.filter((s) => (studentGroupMap.get(s.id) || []).length > 0).length
    return { total, males, females, assigned, orphans: total - assigned }
  }, [enrolledStudents, studentGroupMap])

  // Enroll Student Action
  const handleEnrollStudent = async (studentId: string) => {
    if (!assignedCourseUnit) return
    setEnrollingId(studentId)
    try {
      const { error } = await supabase.from('student_course_units').upsert(
        { user_id: studentId, course_unit_id: assignedCourseUnit.id, status: 'active' },
        { onConflict: 'user_id,course_unit_id' }
      )
      if (error) throw error
      await fetchData(assignedCourseUnit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enroll student.')
    } finally {
      setEnrollingId(null)
    }
  }

  // Remove/Unenroll Student Action
  const handleUnenrollStudent = async (student: any) => {
    if (!assignedCourseUnit) return
    if (!confirm(`Are you sure you want to remove ${student.full_name} from ${assignedCourseUnit.code}?`)) return

    setRemovingId(student.id)
    try {
      // 1. Delete enrollment from student_course_units
      const { error } = await supabase
        .from('student_course_units')
        .delete()
        .eq('user_id', student.id)
        .eq('course_unit_id', assignedCourseUnit.id)

      if (error) throw error

      // 2. Remove student from any groups in this course unit
      const unitGroupIds = groups.map((g) => g.id)
      if (unitGroupIds.length > 0) {
        await supabase
          .from('group_members')
          .delete()
          .eq('user_id', student.id)
          .in('group_id', unitGroupIds)
      }

      await fetchData(assignedCourseUnit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove student from course unit.')
    } finally {
      setRemovingId(null)
    }
  }

  // ─── LOADING ──────────────────────────────────────────────────────────────

  if (loadingUnit) {
    return <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  }

  if (!assignedCourseUnit) {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 mt-6">
        <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-text-primary text-lg">No Course Unit Assigned</h2>
          <p className="text-text-secondary mt-1 text-sm">Ask your administrator to assign a course unit to your lecturer account in the database.</p>
        </div>
      </div>
    )
  }

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              <GraduationCap className="h-3.5 w-3.5 text-violet-500 animate-pulse" />
              Lecturer Portal
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Course Unit <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">Students</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Enrolled in: <span className="font-bold text-violet-500 dark:text-violet-400">{assignedCourseUnit.code} · {assignedCourseUnit.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(assignedCourseUnit.id)} loading={loading} className="border-border/60 backdrop-blur-md">
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setIsEnrollModalOpen(true)} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-md">
              <UserPlus className="h-4 w-4 mr-1" /> Enroll Student
            </Button>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Users className="h-5 w-5" /></div>
          <div><p className="text-xs text-text-muted">Enrolled Students</p><p className="font-bold text-text-primary text-xl">{formatNumber(metrics.total)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500"><UserCheck className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-text-muted">Gender Ratio</p>
            <p className="text-sm font-bold text-text-primary">
              <span className="text-blue-500">♂ {metrics.males}</span> / <span className="text-pink-500">♀ {metrics.females}</span>
            </p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Users className="h-5 w-5" /></div>
          <div><p className="text-xs text-text-muted">In a Group</p><p className="font-bold text-emerald-500 text-xl">{metrics.assigned}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><AlertCircle className="h-5 w-5" /></div>
          <div><p className="text-xs text-text-muted">Orphans</p><p className="font-bold text-amber-500 text-xl">{metrics.orphans}</p></div>
        </CardContent></Card>
      </div>

      {/* Control bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, reg number, email, course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-muted">Gender:</span>
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs focus:outline-none">
                  <option value="all">All</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-muted">Status:</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs focus:outline-none">
                  <option value="all">All</option>
                  <option value="assigned">In a Group</option>
                  <option value="orphan">Orphan</option>
                </select>
              </div>
              <div className="ml-1 flex items-center rounded-lg border border-border bg-surface p-1">
                <button onClick={() => setViewMode('table')} className={cn('p-1.5 rounded-md text-xs transition-colors', viewMode === 'table' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary')} title="Table"><LayoutList className="h-4 w-4" /></button>
                <button onClick={() => setViewMode('cards')} className={cn('p-1.5 rounded-md text-xs transition-colors', viewMode === 'cards' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary')} title="Cards"><Grid className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-text-muted">{filteredStudents.length} enrolled students{searchQuery || genderFilter !== 'all' || statusFilter !== 'all' ? ' (filtered)' : ''}</p>
        </CardContent>
      </Card>

      {/* Students list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[20vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filteredStudents.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-text-muted">No students found{searchQuery ? ` matching "${searchQuery}"` : ''}.</CardContent></Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-hover/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider hidden sm:table-cell">Reg No.</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Group</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider hidden lg:table-cell">Gender</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((s) => {
                    const studentGroups = studentGroupMap.get(s.id) || []
                    return (
                      <tr key={s.id} className="hover:bg-surface-hover/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {getInitials(s.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary truncate">{s.full_name}</p>
                              <p className="text-xs text-text-muted truncate">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary font-mono hidden sm:table-cell">{s.student_registration_number || '—'}</td>
                        <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">
                          {s.whatsapp_phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-emerald-400" />{s.whatsapp_phone}</span> : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {studentGroups.length > 0
                            ? <Badge variant="success" className="text-[11px]">{studentGroups[0]}</Badge>
                            : <Badge variant="warning" className="text-[11px]">Orphan</Badge>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge variant="secondary" className={cn('text-[11px] capitalize', s.gender === 'female' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : s.gender === 'male' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : '')}>
                            {s.gender || '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleUnenrollStudent(s)}
                            loading={removingId === s.id}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" /> Remove from Unit
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Cards view
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((s) => {
            const studentGroups = studentGroupMap.get(s.id) || []
            return (
              <Card key={s.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {getInitials(s.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-text-primary truncate">{s.full_name}</p>
                        <p className="text-xs text-text-muted font-mono truncate">{s.student_registration_number || '—'}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1.5 h-auto text-red-500 hover:bg-red-500/10 shrink-0"
                      onClick={() => handleUnenrollStudent(s)}
                      title="Remove from Course Unit"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 text-xs text-text-muted">
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{s.email}</span></div>
                    {s.whatsapp_phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{s.whatsapp_phone}</div>}
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {studentGroups.length > 0
                      ? <Badge variant="success" className="text-[11px]">{studentGroups[0]}</Badge>
                      : <Badge variant="warning" className="text-[11px]">Orphan</Badge>}
                    <Badge variant="secondary" className={cn('text-[11px] capitalize', s.gender === 'female' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : s.gender === 'male' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : '')}>
                      {s.gender || '—'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal to Enroll New Student into Course Unit */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Enroll Student into ${assignedCourseUnit.code}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Select a student to enroll into <strong>{assignedCourseUnit.code} ({assignedCourseUnit.name})</strong>.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search non-enrolled students..."
              value={enrollSearchQuery}
              onChange={(e) => setEnrollSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
            {nonEnrolledStudents.length === 0 ? (
              <p className="p-6 text-center text-xs text-text-muted">No non-enrolled students found.</p>
            ) : (
              nonEnrolledStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 hover:bg-surface-hover/50 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-text-primary">{s.full_name}</p>
                    <p className="text-[11px] text-text-muted">{s.email} {s.student_registration_number ? `· ${s.student_registration_number}` : ''}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleEnrollStudent(s.id)}
                    loading={enrollingId === s.id}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Enroll
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
