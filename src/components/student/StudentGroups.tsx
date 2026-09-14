'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Filter, Users, Lock, Globe, LayoutGrid, List, Shuffle, MessageSquare, UserPlus, UserMinus, ShieldCheck, BookCopy, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { groupCreationSchema } from '@/lib/validators'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DataTable } from '../ui/DataTable'
import { isLocalDataMode, subscribeLocalData } from '@/lib/local-data'

export function StudentGroups() {
  const { user } = useAuth()
  const supabase = createClient()
  
  // Data state
  const [loading, setLoading] = useState(true)
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([])
  const [selectedCoordinators, setSelectedCoordinators] = useState<any[]>([])
  
  // UI Selection & Filters
  const [selectedCourseUnitId, setSelectedCourseUnitId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid')
  const [assignmentTargets, setAssignmentTargets] = useState<Record<string, string>>({})
  const [assigningIds, setAssigningIds] = useState<Record<string, boolean>>({})

  // User state
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set())
  const [myCourseworkGroups, setMyCourseworkGroups] = useState<Record<string, string[]>>({})
  const [randomizerUses, setRandomizerUses] = useState<number>(0)
  
  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [joinMessage, setJoinMessage] = useState('')
  const [dataVersion, setDataVersion] = useState(0)

  const form = useForm({
    resolver: zodResolver(groupCreationSchema),
    defaultValues: {
      courseworkId: '',
      name: '',
      description: '',
      isPrivate: false,
      maxMembers: 5,
    },
  })

  useEffect(() => {
    if (!isLocalDataMode()) return
    return subscribeLocalData(() => setDataVersion((v) => v + 1))
  }, [])

  useEffect(() => {
    fetchData()
  }, [user, dataVersion])

  async function fetchData() {
    setLoading(true)
    try {
      const [unitsRes, cwRes, groupsRes, membersRes, usersRes, enrollmentsRes, scRes] = await Promise.all([
        supabase.from('course_units').select('*, course:courses(code, name)').eq('is_active', true).order('name'),
        supabase.from('courseworks').select('id, title, course_unit_id, course_unit:course_units(code, name, whatsapp_group_link)').eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('groups').select(`
          *,
          coursework:courseworks(
            id,
            title,
            course_unit_id,
            course_unit:course_units(code, name, whatsapp_group_link)
          ),
          leader:users!groups_leader_id_fkey(id, full_name, email),
          members:group_members(count)
        `).in('status', ['forming', 'active', 'locked']).order('created_at', { ascending: false }),
        supabase.from('group_members').select('*, user:users(id, full_name, email, student_registration_number)'),
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('student_course_units').select('*').eq('status', 'active'),
        supabase.from('selected_coordinators').select('*'),
      ])

      const units = unitsRes.data || []
      const cws = cwRes.data || []
      const grps = groupsRes.data || []
      const mbrs = membersRes.data || []
      const stus = usersRes.data || []
      const enrs = enrollmentsRes.data || []
      const scs = scRes.data || []

      setCourseUnits(units)
      setCourseworks(cws)
      setGroups(grps)
      setGroupMembers(mbrs)
      setStudents(stus)
      setStudentEnrollments(enrs)
      setSelectedCoordinators(scs)

      // Do not auto-select — user should click a Course Unit tile to navigate in

      // Calculate current user's group memberships
      if (user?.id) {
        const nextGroupIds = new Set<string>()
        const nextMyCourseworkGroups: Record<string, string[]> = {}
        for (const m of mbrs) {
          if (m.user_id === user.id) {
            nextGroupIds.add(m.group_id)
            const groupObj = grps.find((g) => g.id === m.group_id)
            if (groupObj?.coursework_id) {
              nextMyCourseworkGroups[groupObj.coursework_id] = [
                ...(nextMyCourseworkGroups[groupObj.coursework_id] || []),
                m.group_id,
              ].filter(Boolean)
            }
          }
        }
        setMyGroupIds(nextGroupIds)
        setMyCourseworkGroups(nextMyCourseworkGroups)
      }
    } catch (error) {
      console.error('Error fetching group data:', error)
      setJoinMessage(error instanceof Error ? error.message : 'Unable to load group records.')
    } finally {
      setLoading(false)
    }
  }

  // Unit Summaries calculation for Course Unit Tiles
  const unitSummaries = useMemo(() => {
    return courseUnits
      .map((unit) => {
        const enrolledUserIds = studentEnrollments
          .filter((enrollment) => enrollment.course_unit_id === unit.id && enrollment.status === 'active')
          .map((enrollment) => enrollment.user_id)

        const registeredStudentIds = enrolledUserIds.length > 0
          ? new Set(enrolledUserIds)
          : new Set(students.filter((s) => s.role === 'student').map((s) => s.id))

        const unitGroups = groups.filter((group) => group.coursework?.course_unit_id === unit.id)
        
        const groupCounts = unitGroups.map((group) => ({
          id: group.id,
          name: group.name,
          count: groupMembers.filter((member) => member.group_id === group.id).length,
          max: group.max_members,
        }))

        const assignedUserIds = new Set(
          groupMembers
            .filter((member) => unitGroups.some((group) => group.id === member.group_id))
            .map((member) => member.user_id)
        )

        const totalStudents = registeredStudentIds.size
        const totalMembersAssigned = assignedUserIds.size
        const groupedPercentage = totalStudents > 0 ? Math.min(100, Math.round((totalMembersAssigned / totalStudents) * 100)) : 0

        return {
          ...unit,
          totalStudents,
          totalGroups: unitGroups.length,
          groupCounts,
          totalMembersAssigned,
          groupedPercentage,
        }
      })
      .filter((unit) => {
        const search = searchQuery.trim().toLowerCase()
        if (!search) return true
        const haystack = `${unit.code} ${unit.name} ${unit.course?.name || ''}`.toLowerCase()
        return haystack.includes(search)
      })
  }, [courseUnits, studentEnrollments, students, groups, groupMembers, searchQuery])

  const selectedCourseSummary = useMemo(
    () => unitSummaries.find((unit) => unit.id === selectedCourseUnitId) || null,
    [unitSummaries, selectedCourseUnitId]
  )

  const selectedGroups = useMemo(
    () => groups.filter((group) => group.coursework?.course_unit_id === selectedCourseUnitId),
    [groups, selectedCourseUnitId]
  )

  const selectedCourseworks = useMemo(
    () => courseworks.filter((cw) => cw.course_unit_id === selectedCourseUnitId),
    [courseworks, selectedCourseUnitId]
  )

  // Orphan students in selected course unit
  const orphanStudents = useMemo(() => {
    if (!selectedCourseUnitId) return []

    const assignedUserIds = new Set(
      groupMembers
        .filter((member) => selectedGroups.some((group) => group.id === member.group_id))
        .map((member) => member.user_id)
    )

    const enrolledUserIds = new Set(
      studentEnrollments
        .filter((e) => e.course_unit_id === selectedCourseUnitId && e.status === 'active')
        .map((e) => e.user_id)
    )

    return students
      .filter((student) => {
        if (student.role !== 'student' && student.status !== 'normal' && student.status !== 'selected_coordinator') {
          return false
        }
        const isEnrolled = enrolledUserIds.size > 0 ? enrolledUserIds.has(student.id) : true
        return isEnrolled && !assignedUserIds.has(student.id)
      })
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  }, [students, studentEnrollments, groupMembers, selectedCourseUnitId, selectedGroups])

  // Check if current user is main coordinator or selected coordinator for this course unit
  const isCoordinatorOrSCForThisUnit = useMemo(() => {
    if (!selectedCourseUnitId || !user) return false
    if (user.role === 'coordinator') return true
    return selectedCoordinators.some(
      (sc) => sc.user_id === user.id && sc.course_unit_id === selectedCourseUnitId
    )
  }, [selectedCourseUnitId, user, selectedCoordinators])

  // Handlers
  const handleRandomizer = async () => {
    if (!user) return
    if (randomizerUses >= 2) {
      setJoinMessage('You have reached the maximum limit of 2 randomizer pairings.')
      return
    }

    const availableGroups = selectedGroups.filter((g) => {
      const currentCount = groupMembers.filter((m) => m.group_id === g.id).length
      return g.status === 'forming' && currentCount < g.max_members && !g.is_private
    })

    if (availableGroups.length === 0) {
      setJoinMessage('No open forming groups available for random pairing in this course unit.')
      return
    }

    const randomGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)]
    await handleJoin(randomGroup.id)
    setRandomizerUses((prev) => prev + 1)
    setJoinMessage(`Randomizer paired you with "${randomGroup.name}"!`)
  }

  const buildWhatsAppLink = (phone?: string) => {
    if (!phone) return '#'
    const digits = phone.replace(/\D/g, '')
    if (!digits) return '#'
    return `https://wa.me/${digits}`
  }

  const onSubmit = async (values: any) => {
    setCreating(true)
    setJoinMessage('')
    try {
      if (!user?.id) {
        throw new Error('You need to be signed in before creating a group.')
      }

      const trimmedName = String(values.name || '').trim()
      if (!trimmedName) {
        throw new Error('Group name is required.')
      }

      const { data: existingGroup, error: duplicateCheckError } = await supabase
        .from('groups')
        .select('id')
        .eq('coursework_id', values.courseworkId)
        .ilike('name', trimmedName)
        .maybeSingle()

      if (duplicateCheckError) {
        throw new Error(duplicateCheckError.message || 'Unable to verify group name uniqueness.')
      }

      if (existingGroup) {
        throw new Error('A group with that name already exists for this coursework. Please choose another name.')
      }

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          coursework_id: values.courseworkId,
          name: trimmedName,
          description: values.description,
          leader_id: user.id,
          is_private: values.isPrivate,
          max_members: values.maxMembers,
          status: 'forming',
        })
        .select()
        .single()

      if (error) throw error

      const membershipInsert = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'leader',
      })

      if (membershipInsert.error) throw membershipInsert.error

      setCreateModalOpen(false)
      form.reset()
      await fetchData()
    } catch (error) {
      console.error('Error creating group:', error)
      setJoinMessage(error instanceof Error ? error.message : 'Unable to create the group')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (groupId: string) => {
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user?.id,
      role: 'member',
    })
    if (!error) {
      await fetchData()
      setJoinModalOpen(false)
      setJoinMessage('')
    } else {
      setJoinMessage(error.message || 'Unable to join this group.')
    }
  }

  const handleRequestJoin = async (groupId: string) => {
    const { error } = await supabase.from('group_join_requests').insert({
      group_id: groupId,
      user_id: user?.id,
    })
    if (!error) {
      setJoinModalOpen(false)
      setJoinMessage('')
    } else {
      setJoinMessage(error.message || 'Unable to request group access.')
    }
  }

  const handleAssignStudentToGroup = async (studentId: string, groupId: string) => {
    const targetGroup = groups.find((item) => item.id === groupId)
    if (!targetGroup || !targetGroup.coursework?.course_unit_id) return

    const targetCourseUnitId = targetGroup.coursework.course_unit_id
    const conflictingGroupIds = groupMembers
      .filter(
        (member) =>
          member.user_id === studentId &&
          groups.some(
            (item) => item.id === member.group_id && item.coursework?.course_unit_id === targetCourseUnitId && item.id !== groupId
          )
      )
      .map((member) => member.group_id)

    setAssigningIds((prev) => ({ ...prev, [`${studentId}-${groupId}`]: true }))

    try {
      if (conflictingGroupIds.length > 0) {
        const { error: removeError } = await supabase
          .from('group_members')
          .delete()
          .in('group_id', conflictingGroupIds)
          .eq('user_id', studentId)

        if (removeError) throw removeError
      }

      const { error } = await supabase
        .from('group_members')
        .upsert(
          { user_id: studentId, group_id: groupId, role: 'member' },
          { onConflict: 'group_id,user_id' }
        )

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error assigning student to group:', error)
      alert(error instanceof Error ? error.message : 'Unable to assign student to the group.')
    } finally {
      setAssigningIds((prev) => ({ ...prev, [`${studentId}-${groupId}`]: false }))
    }
  }

  const handleRemoveFromGroup = async (studentId: string, groupId: string) => {
    try {
      const { error } = await supabase.from('group_members').delete().eq('user_id', studentId).eq('group_id', groupId)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error removing student from group:', error)
      alert(error instanceof Error ? error.message : 'Unable to remove student from the group.')
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Group Name',
      render: (row: any) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-xs text-text-muted">
            {row.coursework?.course_unit?.code} - {row.coursework?.title}
          </p>
        </div>
      ),
    },
    {
      key: 'leader',
      header: 'Leader',
      render: (row: any) => row.leader?.full_name || 'Assigned Leader',
    },
    {
      key: 'members',
      header: 'Members',
      render: (row: any) => {
        const count = groupMembers.filter((m) => m.group_id === row.id).length
        return `${count} / ${row.max_members}`
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'forming' ? 'warning' : 'secondary'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => {
        const isMember = myGroupIds.has(row.id)
        const count = groupMembers.filter((m) => m.group_id === row.id).length
        const isFull = count >= row.max_members

        if (isMember) return <Badge variant="success">Joined Member</Badge>
        if (isFull) return <Badge variant="secondary">Full</Badge>
        return (
          <Button size="sm" variant={row.is_private ? 'outline' : 'primary'} onClick={() => { setSelectedGroup(row); setJoinModalOpen(true); }}>
            {row.is_private ? 'Request Access' : 'Join Group'}
          </Button>
        )
      },
    },
  ]

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  // DETAIL VIEW: a course unit has been selected
  if (selectedCourseUnitId && selectedCourseSummary) {
    return (
      <div className="space-y-6">
        {/* Back + Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedCourseUnitId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              All Course Units
            </Button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Course Unit</p>
              <h1 className="text-2xl font-bold text-text-primary">
                {selectedCourseSummary.code} • {selectedCourseSummary.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">{selectedCourseSummary.totalMembersAssigned} / {selectedCourseSummary.totalStudents} Grouped</Badge>
            <Badge variant="secondary">{selectedCourseSummary.totalGroups} Groups</Badge>
            {/* Grid / List toggle */}
            <div className="flex items-center rounded-xl border border-border bg-surface p-1">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${layoutMode === 'grid' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
                title="Grid Layout"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLayoutMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${layoutMode === 'table' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
                title="List/Table Layout"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={handleRandomizer} title="Randomly pair me with an open group">
              <Shuffle className="h-4 w-4 mr-1.5" />
              Randomizer
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} loading={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Group
            </Button>
          </div>
        </div>

        {joinMessage && (
          <div className="rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning flex items-center justify-between">
            <span>{joinMessage}</span>
            <button onClick={() => setJoinMessage('')} className="text-xs font-semibold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Group Formation Grid / Table */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Groups in {selectedCourseSummary.code}</h2>
            <span className="text-xs text-text-muted">{selectedGroups.length} groups found</span>
          </div>

          {layoutMode === 'table' ? (
            <DataTable
              columns={columns}
              data={selectedGroups}
              keyExtractor={(row) => row.id}
              loading={loading}
              emptyMessage="No groups formed yet in this course unit"
            />
          ) : selectedGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-text-muted">
                <p className="font-semibold text-text-primary">No groups formed yet for {selectedCourseSummary.code}.</p>
                <p className="text-xs mt-1">Be the first student to form a project group!</p>
                <Button size="sm" className="mt-4" onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Form New Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {selectedGroups.map((group) => {
                const members = groupMembers.filter((m) => m.group_id === group.id)
                const isMember = myGroupIds.has(group.id)
                const isLeader = group.leader_id === user?.id
                const memberCount = members.length
                const isFull = memberCount >= group.max_members
                const whatsappLink = group.whatsapp_group_link || group.coursework?.course_unit?.whatsapp_group_link

                return (
                  <Card key={group.id} className="flex flex-col justify-between p-5 hover:border-primary/40 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant={group.status === 'active' ? 'success' : group.status === 'forming' ? 'warning' : 'secondary'}>
                          {group.status}
                        </Badge>
                        <Badge variant={group.is_private ? 'secondary' : 'primary'} dot>
                          {group.is_private ? 'Private' : 'Public'}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-bold text-text-primary">{group.name}</h3>
                      <p className="text-xs text-text-muted mt-1">
                        {group.coursework?.title || selectedCourseSummary.code}
                      </p>

                      <p className="mt-3 text-xs text-text-secondary line-clamp-2">
                        {group.description || 'Collaborative student group for coursework assignments.'}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-xs text-text-muted border-t border-border/50 pt-3">
                        <span>Members: <strong className="text-text-primary font-bold">{memberCount} / {group.max_members}</strong></span>
                        <span>Leader: <strong className="text-text-primary font-semibold">{group.leader?.full_name || 'Student Leader'}</strong></span>
                      </div>

                      <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                        {members.map((m) => {
                          const canSeePhone = myGroupIds.has(group.id) && !!m.user?.whatsapp_phone
                          return (
                            <div key={m.id} className="flex items-center justify-between gap-2 text-[11px] rounded-lg border border-border/60 bg-surface-hover px-2.5 py-1">
                              <div className="min-w-0">
                                <span className="block truncate font-medium text-text-primary">{m.user?.full_name || 'Student'}</span>
                                <span className="text-text-muted text-[10px]">{m.user?.student_registration_number || ''}</span>
                              </div>
                              {canSeePhone ? (
                                <a
                                  href={buildWhatsAppLink(m.user.whatsapp_phone)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-1 font-medium text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400"
                                  title="Open WhatsApp"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  WhatsApp
                                </a>
                              ) : (
                                <span className="text-[10px] text-text-muted">Private</span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {isMember && whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Open WhatsApp Group
                        </a>
                      )}
                    </div>

                    <div className="mt-5 border-t border-border pt-3">
                      {isLeader ? (
                        <Badge variant="primary" className="w-full justify-center py-2">You are Group Leader</Badge>
                      ) : isMember ? (
                        <Badge variant="success" className="w-full justify-center py-2">Joined Member</Badge>
                      ) : isFull ? (
                        <Badge variant="secondary" className="w-full justify-center py-2">Capacity Reached</Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          variant={group.is_private ? 'outline' : 'primary'}
                          onClick={() => { setSelectedGroup(group); setJoinModalOpen(true); }}
                        >
                          {group.is_private ? 'Request Access' : 'Join Group'}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Orphan Students Table — Coordinator & Selected Coordinator Only */}
        {isCoordinatorOrSCForThisUnit && (
          <Card className="border-amber-500/30 shadow-sm mt-4">
            <CardHeader className="bg-amber-500/5 pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookCopy className="h-5 w-5 text-amber-600" />
                  <div>
                    <CardTitle className="text-base text-text-primary">
                      Orphan Students — {selectedCourseSummary.code}
                    </CardTitle>
                    <p className="text-xs text-text-secondary">
                      Restricted view for Course Coordinator / Selected Coordinator. Manually assign or override group assignments for orphan students.
                    </p>
                  </div>
                </div>
                <Badge variant={orphanStudents.length > 0 ? 'warning' : 'success'}>
                  {orphanStudents.length} {orphanStudents.length === 1 ? 'Orphan Student' : 'Orphan Students'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {orphanStudents.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <ShieldCheck className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-text-primary">All registered students are assigned!</p>
                  <p className="text-xs mt-1">There are no unassigned orphan students remaining in {selectedCourseSummary.code}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface-hover text-xs font-semibold uppercase tracking-wider text-text-muted">
                        <th className="py-3 px-4">Student Name & Email</th>
                        <th className="py-3 px-4">Reg Number</th>
                        <th className="py-3 px-4">WhatsApp Phone</th>
                        <th className="py-3 px-4">Target Group</th>
                        <th className="py-3 px-4 text-right">Coordinator Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orphanStudents.map((student) => {
                        const selectedTargetGroupId = assignmentTargets[student.id] || selectedGroups[0]?.id || ''
                        return (
                          <tr key={student.id} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-semibold text-text-primary">{student.full_name}</p>
                                <p className="text-xs text-text-muted">{student.email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs font-medium text-text-primary">
                              {student.student_registration_number || '—'}
                            </td>
                            <td className="py-3 px-4 text-xs text-text-secondary">
                              {student.whatsapp_phone || '—'}
                            </td>
                            <td className="py-3 px-4">
                              <Select
                                value={selectedTargetGroupId}
                                onChange={(value) => setAssignmentTargets((prev) => ({ ...prev, [student.id]: value }))}
                                options={selectedGroups.map((group) => {
                                  const currentCount = groupMembers.filter((m) => m.group_id === group.id).length
                                  return {
                                    value: group.id,
                                    label: `${group.name} (${currentCount}/${group.max_members})`,
                                  }
                                })}
                                placeholder="Select group..."
                                className="w-56 text-xs"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAssignStudentToGroup(student.id, selectedTargetGroupId)}
                                loading={!!assigningIds[`${student.id}-${selectedTargetGroupId}`]}
                                disabled={!selectedGroups.length || !selectedTargetGroupId}
                              >
                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                Assign / Override
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Form New Group Modal */}
        <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Form New Group" size="lg">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="courseworkId"
              control={form.control}
              render={({ field }) => (
                <Select
                  label="Coursework Assignment"
                  error={form.formState.errors.courseworkId?.message}
                  options={(selectedCourseworks.length > 0 ? selectedCourseworks : courseworks).map((cw) => ({
                    value: cw.id,
                    label: `${cw.course_unit?.code || ''} - ${cw.title}`,
                  }))}
                  placeholder="Select coursework assignment"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Input
              label="Group Name"
              error={form.formState.errors.name?.message}
              placeholder="e.g. Algo Knights"
              {...form.register('name')}
            />
            <Input
              label="Group Description"
              error={form.formState.errors.description?.message}
              placeholder="Brief goals for this coursework group"
              {...form.register('description')}
            />
            <Input
              label="Max Members"
              type="number"
              error={form.formState.errors.maxMembers?.message}
              placeholder="5"
              {...form.register('maxMembers', { valueAsNumber: true })}
            />
            <Controller
              name="isPrivate"
              control={form.control}
              render={({ field }) => (
                <Select
                  label="Group Privacy"
                  options={[
                    { value: 'false', label: 'Public - Open for fellow students' },
                    { value: 'true', label: 'Private - Request required' },
                  ]}
                  value={String(field.value)}
                  onChange={(value) => field.onChange(value === 'true')}
                />
              )}
            />
            <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-xs text-text-secondary">
              Note: Student WhatsApp phone numbers are protected and visible only to fellow group members.
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Create Group
              </Button>
            </div>
          </form>
        </Modal>

        {/* Join Group Modal */}
        <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title={selectedGroup?.is_private ? 'Request to Join' : 'Join Group'} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-text-primary">
              Are you sure you want to {selectedGroup?.is_private ? 'request to join' : 'join'} <strong>{selectedGroup?.name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setJoinModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => selectedGroup?.is_private ? handleRequestJoin(selectedGroup.id) : handleJoin(selectedGroup.id)}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // DEFAULT VIEW: Course Unit tiles only
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Groups</h1>
          <p className="text-text-secondary">Select a course unit to view groups, form teams, or find study partners.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} loading={loading}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Group
          </Button>
        </div>
      </div>

      {joinMessage && (
        <div className="rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning flex items-center justify-between">
          <span>{joinMessage}</span>
          <button onClick={() => setJoinMessage('')} className="text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search course unit code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Course Unit Tiles */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Select a Course Unit</h2>
          <span className="text-xs text-text-muted">{unitSummaries.length} active course units</span>
        </div>

        {loading && unitSummaries.length === 0 ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
            ))}
          </div>
        ) : unitSummaries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-text-muted">
              No active course units found matching search.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {unitSummaries.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => setSelectedCourseUnitId(unit.id)}
                className="group rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:border-primary/60 hover:bg-surface-hover hover:shadow-md"
              >
                {/* Unit Header */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                      {unit.code}
                    </span>
                    <h3 className="mt-1.5 text-lg font-bold text-text-primary group-hover:text-primary transition-colors">{unit.name}</h3>
                  </div>
                  <Badge variant={unit.is_active ? 'success' : 'secondary'}>
                    {unit.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Grouped vs Registered Progress */}
                <div className="mb-4 rounded-xl border border-border/60 bg-surface-hover/80 p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-text-secondary mb-1.5">
                    <span>Students in Groups</span>
                    <strong className="text-text-primary">
                      {unit.totalMembersAssigned} / {unit.totalStudents} ({unit.groupedPercentage}%)
                    </strong>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${unit.groupedPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Group Counts */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span>Groups Present</span>
                    <strong className="text-text-primary">{unit.totalGroups} {unit.totalGroups === 1 ? 'group' : 'groups'}</strong>
                  </div>

                  {unit.groupCounts.length > 0 ? (
                    <div>
                      <p className="mb-1 text-[11px] font-medium text-text-muted">Students per group:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.groupCounts.map((g: any) => (
                          <span
                            key={g.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-primary"
                          >
                            <Users className="h-3 w-3 text-primary" />
                            <span className="truncate max-w-[80px]">{g.name}:</span>
                            <strong className="text-primary">{g.count}</strong>/{g.max}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted italic">No groups formed yet.</p>
                  )}
                </div>

                {/* Click CTA */}
                <div className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View Groups & Formation
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form New Group Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Form New Group" size="lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="courseworkId"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Coursework Assignment"
                error={form.formState.errors.courseworkId?.message}
                options={(selectedCourseworks.length > 0 ? selectedCourseworks : courseworks).map((cw) => ({
                  value: cw.id,
                  label: `${cw.course_unit?.code || ''} - ${cw.title}`,
                }))}
                placeholder="Select coursework assignment"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Input
            label="Group Name"
            error={form.formState.errors.name?.message}
            placeholder="e.g. Algo Knights"
            {...form.register('name')}
          />
          <Input
            label="Group Description"
            error={form.formState.errors.description?.message}
            placeholder="Brief goals for this coursework group"
            {...form.register('description')}
          />
          <Input
            label="Max Members"
            type="number"
            error={form.formState.errors.maxMembers?.message}
            placeholder="5"
            {...form.register('maxMembers', { valueAsNumber: true })}
          />
          <Controller
            name="isPrivate"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Group Privacy"
                options={[
                  { value: 'false', label: 'Public - Open for fellow students' },
                  { value: 'true', label: 'Private - Request required' },
                ]}
                value={String(field.value)}
                onChange={(value) => field.onChange(value === 'true')}
              />
            )}
          />
          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-xs text-text-secondary">
            Note: Student WhatsApp phone numbers are protected and visible only to fellow group members.
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Group Modal */}
      <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title={selectedGroup?.is_private ? 'Request to Join' : 'Join Group'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            Are you sure you want to {selectedGroup?.is_private ? 'request to join' : 'join'} <strong>{selectedGroup?.name}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setJoinModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => selectedGroup?.is_private ? handleRequestJoin(selectedGroup.id) : handleJoin(selectedGroup.id)}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
