'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Filter, Users, Lock, Globe, LayoutGrid, List, Shuffle, MessageSquare, UserPlus, UserMinus, ShieldCheck, BookCopy, RefreshCw, ArrowLeft, ArrowRight, ArrowUpDown } from 'lucide-react'
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
import { getStudentCourseUnitIds } from '@/lib/faculty-access'

const compareGroupNames = (firstName: string = '', secondName: string = '') =>
  firstName.localeCompare(secondName, undefined, { numeric: true, sensitivity: 'base' })

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
  const [sortBy, setSortBy] = useState<string>('name-asc')
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
  const [addMembersModalOpen, setAddMembersModalOpen] = useState(false)
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
    fetchData()
  }, [user, dataVersion])

  async function fetchData() {
    setLoading(true)
    try {
      const allowedCourseUnitIds = user ? await getStudentCourseUnitIds(supabase, user) : []
      const allowedIds = new Set(allowedCourseUnitIds)
      const [unitsRes, cwRes, groupsRes, membersRes, usersRes, enrollmentsRes, scRes] = await Promise.all([
        supabase.from('course_units').select('*, course:courses(code, name)').eq('is_active', true).order('name'),
        supabase.from('courseworks').select('id, title, course_unit_id, min_group_size, max_group_size, allow_self_formation, lock_at, course_unit:course_units(code, name, whatsapp_group_link)').eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('groups').select(`
          *,
          coursework:courseworks(
            id,
            title,
            course_unit_id,
            course_unit:course_units(code, name, whatsapp_group_link)
          ),
          leader:users!groups_leader_id_fkey(id, full_name, email, whatsapp_phone),
          members:group_members(count)
        `).in('status', ['forming', 'active', 'locked']).order('created_at', { ascending: false }),
        supabase.from('group_members').select('*, user:users(id, full_name, email, student_registration_number, whatsapp_phone)'),
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('student_course_units').select('*').eq('status', 'active'),
        supabase.from('selected_coordinators').select('*'),
      ])

      const units = (unitsRes.data || []).filter((unit: any) => allowedIds.has(unit.id))
      const cws = (cwRes.data || []).filter((coursework: any) => allowedIds.has(coursework.course_unit_id))
      const grps = (groupsRes.data || []).filter((group: any) => allowedIds.has(group.coursework?.course_unit_id))
      const groupIds = new Set(grps.map((group: any) => group.id))
      const mbrs = (membersRes.data || []).filter((member: any) => groupIds.has(member.group_id))
      const stus = (usersRes.data || []).filter((student: any) => !student.faculty_id || student.faculty_id === user?.faculty_id)
      const enrs = (enrollmentsRes.data || []).filter((enrollment: any) => allowedIds.has(enrollment.course_unit_id))
      const scs = (scRes.data || []).filter((selection: any) => allowedIds.has(selection.course_unit_id))

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
            const groupObj = grps.find((g: any) => g.id === m.group_id)
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

  const sortedGroups = useMemo(() => {
    const list = [...selectedGroups]
    return list.sort((a, b) => {
      const aCount = groupMembers.filter((m) => m.group_id === a.id).length
      const bCount = groupMembers.filter((m) => m.group_id === b.id).length
      const aFullness = a.max_members ? aCount / a.max_members : 0
      const bFullness = b.max_members ? bCount / b.max_members : 0

      if (sortBy === 'name-asc') return compareGroupNames(a.name || '', b.name || '')
      if (sortBy === 'name-desc') return compareGroupNames(b.name || '', a.name || '')
      if (sortBy === 'members-desc') return bFullness - aFullness || bCount - aCount
      if (sortBy === 'members-asc') return aFullness - bFullness || aCount - bCount
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      return 0
    })
  }, [selectedGroups, groupMembers, sortBy])

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

  const getGroupMemberCount = (groupId: string) =>
    groupMembers.filter((member) => member.group_id === groupId).length

  const [createModalError, setCreateModalError] = useState('')

  const onSubmit = async (values: any) => {
    setCreating(true)
    setJoinMessage('')
    setCreateModalError('')
    try {
      if (!user?.id) {
        throw new Error('You need to be signed in before creating a group.')
      }

      const trimmedName = String(values.name || '').trim()
      if (!trimmedName) {
        throw new Error('Group name is required.')
      }

      const selectedCoursework = courseworks.find((coursework) => coursework.id === values.courseworkId)
      if (!selectedCoursework) throw new Error('Select a valid coursework assignment.')

      const isEnrolled = studentEnrollments.some(
        (enrollment) => enrollment.user_id === user.id && enrollment.course_unit_id === selectedCoursework.course_unit_id && enrollment.status === 'active'
      )
      if (!isEnrolled) {
        try {
          await supabase.from('student_course_units').upsert({
            user_id: user.id,
            course_unit_id: selectedCoursework.course_unit_id,
            status: 'active',
          }, { onConflict: 'user_id,course_unit_id' })
        } catch (e) {
          console.warn('Auto enrollment attempt:', e)
        }
      }

      if (!selectedCoursework.allow_self_formation) throw new Error('Self-formed groups are disabled for this coursework.')
      if (selectedCoursework.lock_at && new Date(selectedCoursework.lock_at) <= new Date()) throw new Error('Group formation is locked for this coursework.')

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
          max_members: selectedCoursework.max_group_size,
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
      const msg = error instanceof Error ? error.message : 'Unable to create the group'
      setCreateModalError(msg)
      setJoinMessage(msg)
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (groupId: string) => {
    if (!user?.id) {
      setJoinMessage('You need to sign in before requesting to join a group.')
      return
    }

    const targetGroup = groups.find((group) => group.id === groupId)
    const targetCourseUnitId = targetGroup?.coursework?.course_unit_id

    if (!targetGroup || !targetCourseUnitId) {
      setJoinMessage('This group could not be resolved for the selected course unit.')
      return
    }

    const existingMembership = groupMembers.find(
      (member) =>
        member.user_id === user.id &&
        groups.some(
          (group) =>
            group.id === member.group_id &&
            group.coursework?.course_unit_id === targetCourseUnitId &&
            group.id !== groupId
        )
    )

    if (existingMembership) {
      setJoinMessage('You are already in another group for this course unit. One group per course unit is allowed.')
      return
    }

    const currentCount = getGroupMemberCount(groupId)
    if (targetGroup.max_members && currentCount >= targetGroup.max_members) {
      setJoinMessage('This group has reached its maximum capacity.')
      return
    }

    const { error } = await supabase.from('group_join_requests').insert({
      group_id: groupId,
      user_id: user.id,
      status: 'pending',
    })
    if (!error) {
      setJoinModalOpen(false)
      setJoinMessage('Your request has been sent to the group leader for approval.')
    } else {
      setJoinMessage(error.message || 'Unable to request group access.')
    }
  }

  const handleRequestJoin = async (groupId: string) => {
    await handleJoin(groupId)
  }

  const eligibleStudentsForGroup = (groupId: string) => {
    const group = groups.find((item) => item.id === groupId)
    if (!group || !group.coursework?.course_unit_id) return []

    const targetCourseUnitId = group.coursework.course_unit_id
    const alreadyInThisGroup = new Set(
      groupMembers.filter((member) => member.group_id === groupId).map((member) => member.user_id)
    )
    const alreadyAssignedInCourse = new Set(
      groupMembers
        .filter((member) => {
          const memberGroup = groups.find((item) => item.id === member.group_id)
          return memberGroup?.coursework?.course_unit_id === targetCourseUnitId && member.group_id !== groupId
        })
        .map((member) => member.user_id)
    )

    return students
      .filter((student) => {
        if (student.id === user?.id) return false
        if (student.role !== 'student' && student.status !== 'normal' && student.status !== 'selected_coordinator') return false
        if (alreadyInThisGroup.has(student.id)) return false
        if (alreadyAssignedInCourse.has(student.id)) return false

        const enrolled = studentEnrollments.some(
          (enrollment) =>
            enrollment.user_id === student.id &&
            enrollment.course_unit_id === targetCourseUnitId &&
            enrollment.status === 'active'
        )
        return enrolled
      })
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  }

  const handleAddStudentToGroup = async (studentId: string, groupId: string) => {
    const group = groups.find((item) => item.id === groupId)
    if (!group) return

    const currentCount = getGroupMemberCount(groupId)
    if (group.max_members && currentCount >= group.max_members) {
      setJoinMessage('This group has reached its maximum capacity.')
      return
    }

    const alreadyAssigned = groupMembers.some(
      (member) => member.group_id === groupId && member.user_id === studentId
    )
    if (alreadyAssigned) {
      setJoinMessage('This student is already in the group.')
      return
    }

    const targetCourseUnitId = group.coursework?.course_unit_id
    const hasOtherGroupInCourse = groupMembers.some(
      (member) =>
        member.user_id === studentId &&
        groups.some(
          (item) =>
            item.id === member.group_id &&
            item.coursework?.course_unit_id === targetCourseUnitId &&
            item.id !== groupId
        )
    )

    if (hasOtherGroupInCourse) {
      setJoinMessage('This student already belongs to another group in this course unit.')
      return
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: studentId,
      role: 'member',
    })

    if (!error) {
      // Auto-update status to 'active' if group capacity is reached
      const newCount = currentCount + 1
      if (group.max_members && newCount >= group.max_members && group.status === 'forming') {
        await supabase.from('groups').update({ status: 'active' }).eq('id', groupId)
      }

      await fetchData()
      setAddMembersModalOpen(false)
      setJoinMessage('Student added to the group.')
    } else {
      setJoinMessage(error.message || 'Unable to add this student to the group.')
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

        // Auto revert conflicting group status to 'forming' if member count drops below capacity
        for (const confId of conflictingGroupIds) {
          const confGroup = groups.find((g) => g.id === confId)
          const remMembersCount = groupMembers.filter((m) => m.group_id === confId && m.user_id !== studentId).length
          if (confGroup && confGroup.status === 'active' && confGroup.max_members && remMembersCount < confGroup.max_members) {
            await supabase.from('groups').update({ status: 'forming' }).eq('id', confId)
          }
        }
      }

      const { error } = await supabase
        .from('group_members')
        .upsert(
          { user_id: studentId, group_id: groupId, role: 'member' },
          { onConflict: 'group_id,user_id' }
        )

      if (error) throw error

      // Auto-update target group status to 'active' if capacity reached
      const currentCount = groupMembers.filter((m) => m.group_id === groupId && m.user_id !== studentId).length
      const newCount = currentCount + 1
      if (targetGroup.max_members && newCount >= targetGroup.max_members && targetGroup.status === 'forming') {
        await supabase.from('groups').update({ status: 'active' }).eq('id', groupId)
      }

      await fetchData()
    } catch (error) {
      console.error('Error assigning student to group:', error)
      alert(error instanceof Error ? error.message : 'Unable to assign student to the group.')
    } finally {
      setAssigningIds((prev) => ({ ...prev, [`${studentId}-${groupId}`]: false }))
    }
  }

  const handleRemoveFromGroup = async (studentId: string, groupId: string) => {
    const targetGroup = groups.find((g) => g.id === groupId)
    try {
      const { error } = await supabase.from('group_members').delete().eq('user_id', studentId).eq('group_id', groupId)
      if (error) throw error

      // Auto revert status to 'forming' if member count drops below capacity
      const currentCount = groupMembers.filter((m) => m.group_id === groupId).length
      const newCount = currentCount - 1
      if (targetGroup && targetGroup.status === 'active' && targetGroup.max_members && newCount < targetGroup.max_members) {
        await supabase.from('groups').update({ status: 'forming' }).eq('id', groupId)
      }

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
          <Button size="sm" variant="outline" onClick={() => { setSelectedGroup(row); setJoinModalOpen(true); }}>
            Request Invite
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
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedCourseUnitId(null)} className="shrink-0">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                All Units
              </Button>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Course Unit
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                  {selectedCourseSummary.code} <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">• {selectedCourseSummary.name}</span>
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
            <Button size="sm" onClick={() => {
              const defaultCw = selectedCourseworks.length > 0 ? selectedCourseworks[0].id : ''
              form.setValue('courseworkId', defaultCw)
              setCreateModalOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Group
            </Button>
          </div>
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Groups in {selectedCourseSummary.code}</h2>
            <div className="flex flex-wrap items-center gap-3">
              {selectedGroups.length > 0 && (
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-text-muted shrink-0" />
                  <Select
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { value: 'name-asc', label: 'Name (A-Z)' },
                      { value: 'name-desc', label: 'Name (Z-A)' },
                      { value: 'members-desc', label: 'Capacity: Most Full' },
                      { value: 'members-asc', label: 'Capacity: Least Full' },
                      { value: 'status', label: 'Status' },
                      { value: 'newest', label: 'Date: Newest First' },
                      { value: 'oldest', label: 'Date: Oldest First' },
                    ]}
                    className="w-48 text-xs"
                  />
                </div>
              )}
              <span className="text-xs text-text-muted">{selectedGroups.length} groups found</span>
            </div>
          </div>

          {layoutMode === 'table' ? (
            <DataTable
              columns={columns}
              data={sortedGroups}
              keyExtractor={(row) => row.id}
              loading={loading}
              emptyMessage="No groups formed yet in this course unit"
            />
          ) : selectedGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-text-muted">
                <p className="font-semibold text-text-primary">No groups formed yet for {selectedCourseSummary.code}.</p>
                <p className="text-xs mt-1">Students will form and register groups within this course unit once the assignment is open.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedGroups.map((group) => {
                const members = groupMembers.filter((m) => m.group_id === group.id)
                const isMember = myGroupIds.has(group.id)
                const isLeader = group.leader_id === user?.id
                const memberCount = members.length
                const isFull = memberCount >= group.max_members
                const leaderWhatsApp = buildWhatsAppLink(group.leader?.whatsapp_phone)
                const whatsappLink = group.whatsapp_group_link || group.coursework?.course_unit?.whatsapp_group_link
                const canSeeMemberDetails = isMember || isLeader

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
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-primary">
                        {group.coursework?.title || selectedCourseSummary.code}
                      </p>

                      <div className="mt-4 rounded-xl border border-border/70 bg-surface-hover/80 p-3">
                        <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                          <span>Members</span>
                          <strong className="text-text-primary font-bold">{memberCount} / {group.max_members}</strong>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-text-secondary">
                          <span>Leader</span>
                          <div className="flex items-center gap-2 text-right">
                            <span className="font-semibold text-text-primary">{group.leader?.full_name || 'Student Leader'}</span>
                            {leaderWhatsApp !== '#' && (
                              <a
                                href={leaderWhatsApp}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400"
                                title="Contact group leader on WhatsApp"
                              >
                                <MessageSquare className="h-3 w-3" />
                                Contact
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {!canSeeMemberDetails ? (
                        <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-hover/60 px-3 py-2 text-[11px] text-text-muted">
                          Members and private contact details are only visible to students already in this group.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {members.map((m) => {
                            const canSeePhone = !!m.user?.whatsapp_phone
                            return (
                              <div key={m.id} className="flex items-center justify-between gap-2 text-[11px] rounded-lg border border-border/60 bg-surface-hover px-2.5 py-1">
                                <div className="min-w-0">
                                  <span className="block truncate font-medium text-text-primary">{m.user?.full_name || 'Student'}</span>
                                  <span className="text-text-muted text-[10px]">{m.user?.student_registration_number || 'Registered student'}</span>
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
                                  <span className="text-[10px] text-text-muted">No contact</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {isMember && whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Open WhatsApp Group
                        </a>
                      )}
                    </div>

                    <div className="mt-5 border-t border-border pt-3">
                      {isLeader ? (
                        <div className="space-y-2">
                          <Badge variant="primary" className="w-full justify-center py-2">You are Group Leader</Badge>
                          <Button
                            size="sm"
                            className="w-full"
                            variant="outline"
                            onClick={() => {
                              setSelectedGroup(group)
                              setAddMembersModalOpen(true)
                            }}
                            disabled={isFull}
                          >
                            {isFull ? 'Group Full' : 'Add Members'}
                          </Button>
                        </div>
                      ) : isMember ? (
                        <Badge variant="success" className="w-full justify-center py-2">Joined Member</Badge>
                      ) : isFull ? (
                        <Badge variant="secondary" className="w-full justify-center py-2">Capacity Reached</Badge>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border bg-surface-hover/60 px-3 py-2 text-center text-[11px] font-medium text-text-muted">
                          Leader-managed group
                        </div>
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
        <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title="Group is Leader-Managed" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-text-primary">
              This group is created and managed by the group leader. Students are added by the leader after the group is formed.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setJoinModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={addMembersModalOpen} onClose={() => setAddMembersModalOpen(false)} title={`Add Members to ${selectedGroup?.name || 'Group'}`} size="lg">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Add students from this course unit to your group, up to the group limit set for the assignment.
            </p>

            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {selectedGroup && eligibleStudentsForGroup(selectedGroup.id).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface-hover/60 p-5 text-center text-sm text-text-muted">
                  No eligible students are available to add right now.
                </div>
              ) : (
                selectedGroup && eligibleStudentsForGroup(selectedGroup.id).map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                    <div>
                      <p className="font-medium text-text-primary">{student.full_name}</p>
                      <p className="text-xs text-text-muted">{student.student_registration_number || student.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAddStudentToGroup(student.id, selectedGroup.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setAddMembersModalOpen(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // DEFAULT VIEW: Course Unit tiles only
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Student Portal
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Student <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Groups</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">Select a course unit to view the available groups and team setup for each assignment.</p>
          </div>
          <Button variant="outline" onClick={fetchData} loading={loading} className="self-start sm:self-auto border-border/60 backdrop-blur-md">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
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
      <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); setCreateModalError(''); }} title="Form New Group" size="lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {createModalError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium flex items-center justify-between">
              <span>{createModalError}</span>
              <button type="button" onClick={() => setCreateModalError('')} className="text-xs hover:underline ml-2">Dismiss</button>
            </div>
          )}
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
      <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title="Group is Leader-Managed" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-primary">
            This group is created and managed by the group leader. Students are added by the leader after the group is formed.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setJoinModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={addMembersModalOpen} onClose={() => setAddMembersModalOpen(false)} title={`Add Members to ${selectedGroup?.name || 'Group'}`} size="lg">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Add students from this course unit to your group, up to the configured group size for the assignment.
          </p>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {selectedGroup && eligibleStudentsForGroup(selectedGroup.id).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-hover/60 p-5 text-center text-sm text-text-muted">
                No eligible students are available to add right now.
              </div>
            ) : (
              selectedGroup && eligibleStudentsForGroup(selectedGroup.id).map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                  <div>
                    <p className="font-medium text-text-primary">{student.full_name}</p>
                    <p className="text-xs text-text-muted">{student.student_registration_number || student.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleAddStudentToGroup(student.id, selectedGroup.id)}
                  >
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setAddMembersModalOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
