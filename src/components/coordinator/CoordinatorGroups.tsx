'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Users, UserPlus, UserMinus, RefreshCw, BookCopy, ShieldCheck, ArrowLeft, ArrowRight, Plus, Pencil, Shuffle, ArrowUpDown, Crown, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Textarea'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { groupCreationSchema } from '@/lib/validators'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const compareGroupNames = (firstName: string = '', secondName: string = '') =>
  firstName.localeCompare(secondName, undefined, { numeric: true, sensitivity: 'base' })

export function CoordinatorGroups() {
  const { user } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourseUnitId, setSelectedCourseUnitId] = useState<string | null>(null)
  const [assignmentTargets, setAssignmentTargets] = useState<Record<string, string>>({})
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [selectedCoordinators, setSelectedCoordinators] = useState<any[]>([])
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [assigningIds, setAssigningIds] = useState<Record<string, boolean>>({})
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({})
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [randomGroupModalOpen, setRandomGroupModalOpen] = useState(false)
  const [randomGroupCourseworkId, setRandomGroupCourseworkId] = useState('')
  const [randomMembersPerGroup, setRandomMembersPerGroup] = useState('')
  const [randomizing, setRandomizing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [groupEditName, setGroupEditName] = useState('')
  const [groupEditDescription, setGroupEditDescription] = useState('')
  const [groupEditStatus, setGroupEditStatus] = useState('forming')
  const [groupEditMaxMembers, setGroupEditMaxMembers] = useState('5')
  const [groupEditLeaderId, setGroupEditLeaderId] = useState('')
  const [groupEditMemberId, setGroupEditMemberId] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [bulkMaxMembers, setBulkMaxMembers] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [sortBy, setSortBy] = useState<string>('name-asc')

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
  }, [user])

  async function fetchData() {
    setLoading(true)
    try {
      const [unitsRes, usersRes, enrollmentsRes, groupsRes, membersRes, scRes, courseworksRes] = await Promise.all([
        supabase.from('course_units').select('*, course:courses(code, name)').eq('is_active', true).order('name'),
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('student_course_units').select('*').eq('status', 'active'),
        supabase.from('groups').select('*, leader:users!groups_leader_id_fkey(id, full_name, email), coursework:courseworks(id, title, course_unit_id)').order('created_at', { ascending: false }),
        supabase.from('group_members').select('*, user:users(id, full_name, email, student_registration_number)'),
        supabase.from('selected_coordinators').select('*'),
        supabase.from('courseworks').select('id, title, course_unit_id, min_group_size, max_group_size, allow_self_formation, lock_at, course_unit:course_units(code, name)').order('created_at', { ascending: false }),
      ])

      const units = unitsRes.data || []
      const unitStudents = usersRes.data || []
      const activeEnrollments = enrollmentsRes.data || []
      const groupRows = groupsRes.data || []
      const memberRows = membersRes.data || []
      const scRows = scRes.data || []
      const courseworksRows = courseworksRes.data || []

      setCourseUnits(units)
      setStudents(unitStudents)
      setStudentEnrollments(activeEnrollments)
      setGroups(groupRows)
      setGroupMembers(memberRows)
      setSelectedCoordinators(scRows)
      setCourseworks(courseworksRows)

      // Do not auto-select — user should click a Course Unit tile to navigate into it
    } catch (error) {
      console.error('Error fetching group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedCourseUnit = useMemo(
    () => courseUnits.find((unit) => unit.id === selectedCourseUnitId) || null,
    [courseUnits, selectedCourseUnitId]
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
    () => courseworks.filter((item) => item.course_unit_id === selectedCourseUnitId),
    [courseworks, selectedCourseUnitId]
  )

  useEffect(() => {
    const visibleGroupIds = new Set(selectedGroups.map((group) => group.id))
    setSelectedGroupIds((current) => current.filter((groupId) => visibleGroupIds.has(groupId)))
  }, [selectedCourseUnitId, groups])

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

  const orphanStudents = useMemo(() => {
    if (!selectedCourseUnitId) return []

    const assignedUserIds = new Set(
      groupMembers
        .filter((member) => selectedGroups.some((group) => group.id === member.group_id))
        .map((member) => member.user_id)
    )

    const enrolledUserIds = new Set(
      studentEnrollments
        .filter((enrollment) => enrollment.course_unit_id === selectedCourseUnitId && enrollment.status === 'active')
        .map((enrollment) => enrollment.user_id)
    )

    return students
      .filter((student) => {
        if (student.role === 'admin' || student.role === 'coordinator' || student.status === 'admin') {
          return false
        }
        const isEnrolled = enrolledUserIds.size > 0 ? enrolledUserIds.has(student.id) : true
        return isEnrolled && !assignedUserIds.has(student.id)
      })
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  }, [students, studentEnrollments, groupMembers, selectedCourseUnitId, selectedGroups])

  const currentUnitManagers = useMemo(() => {
    if (!selectedCourseUnitId) return false
    if (user?.role === 'coordinator' || user?.role === 'admin' || user?.status === 'admin' || user?.status === 'coordinator') return true
    return selectedCoordinators.some(
      (sc) => sc.user_id === user?.id && sc.course_unit_id === selectedCourseUnitId
    )
  }, [selectedCourseUnitId, user, selectedCoordinators])

  const [createModalError, setCreateModalError] = useState('')

  const onSubmit = async (values: any) => {
    setCreating(true)
    setCreateModalError('')
    try {
      if (!user?.id) {
        throw new Error('You need to be signed in before creating a group.')
      }

      const selectedCoursework = courseworks.find((coursework) => coursework.id === values.courseworkId)
      if (!selectedCoursework) throw new Error('Select a valid coursework assignment.')

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          coursework_id: values.courseworkId,
          name: values.name,
          description: values.description,
          leader_id: user.id,
          is_private: values.isPrivate,
          max_members: selectedCoursework.max_group_size,
          status: 'forming',
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'leader',
      })

      setCreateModalOpen(false)
      form.reset()
      await fetchData()
    } catch (error) {
      console.error('Error creating group:', error)
      const msg = error instanceof Error ? error.message : 'Unable to create the group.'
      setCreateModalError(msg)
    } finally {
      setCreating(false)
    }
  }

  const openRandomGroupModal = () => {
    const defaultCoursework = selectedCourseworks.length === 1 ? selectedCourseworks[0].id : ''
    setRandomGroupCourseworkId(defaultCoursework)
    setRandomMembersPerGroup('')
    setRandomGroupModalOpen(true)
  }

  const createRandomGroups = async () => {
    if (!user?.id) return

    const selectedCoursework = selectedCourseworks.find((item) => item.id === randomGroupCourseworkId)
    if (!selectedCoursework) {
      alert('Select the coursework these groups should belong to.')
      return
    }

    const requestedSize = randomMembersPerGroup.trim() ? Number(randomMembersPerGroup) : null
    if (requestedSize !== null && (!Number.isInteger(requestedSize) || requestedSize < 2)) {
      alert('Members per group must be at least 2, or leave it blank for balanced groups.')
      return
    }
    if (requestedSize !== null && requestedSize > selectedCoursework.max_group_size) {
      alert(`This coursework allows a maximum of ${selectedCoursework.max_group_size} members per group.`)
      return
    }

    const assignedUserIds = new Set(
      groupMembers
        .filter((member) => selectedGroups.some((group) => group.id === member.group_id))
        .map((member) => member.user_id)
    )
    const enrolledUserIds = new Set(
      studentEnrollments
        .filter((enrollment) => enrollment.course_unit_id === selectedCourseUnitId && enrollment.status === 'active')
        .map((enrollment) => enrollment.user_id)
    )
    const roster = students
      .filter((student) => {
        const isStudent = student.role === 'student' || student.status === 'normal' || student.status === 'selected_coordinator'
        const isEnrolled = enrolledUserIds.size > 0 ? enrolledUserIds.has(student.id) : true
        return isStudent && isEnrolled && !assignedUserIds.has(student.id)
      })
      .sort(() => Math.random() - 0.5)

    if (roster.length === 0) {
      alert('All enrolled students in this course unit are already assigned to groups.')
      return
    }

    const capacity = requestedSize || Number(selectedCoursework.max_group_size) || 5
    const groupCount = Math.ceil(roster.length / capacity)
    const baseSize = Math.floor(roster.length / groupCount)
    const extraStudents = roster.length % groupCount
    const chunks: any[][] = []
    let offset = 0
    for (let index = 0; index < groupCount; index += 1) {
      const size = baseSize + (index < extraStudents ? 1 : 0)
      chunks.push(roster.slice(offset, offset + size))
      offset += size
    }

    setRandomizing(true)
    try {
      const groupRows = chunks.map((members, index) => {
        const isFull = members.length >= capacity
        return {
          coursework_id: selectedCoursework.id,
          name: `${selectedCourseUnit?.code || 'Course'} Random Group ${index + 1}`,
          description: requestedSize
            ? `Randomly assigned group with ${requestedSize} member target.`
            : 'Randomly assigned and balanced group.',
          leader_id: members[0].id,
          is_private: false,
          max_members: capacity,
          status: isFull ? 'active' : 'forming',
        }
      })
      const { data: createdGroups, error: groupError } = await supabase
        .from('groups')
        .insert(groupRows)
        .select('id')
      if (groupError) throw groupError
      if (!createdGroups || createdGroups.length !== chunks.length) {
        throw new Error('The groups were not created completely.')
      }

      const memberRows = createdGroups.flatMap((group, index) =>
        chunks[index].map((student, memberIndex) => ({
          group_id: group.id,
          user_id: student.id,
          role: memberIndex === 0 ? 'leader' : 'member',
        }))
      )
      const { error: memberError } = await supabase.from('group_members').insert(memberRows)
      if (memberError) throw memberError

      setRandomGroupModalOpen(false)
      await fetchData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to create random groups.')
    } finally {
      setRandomizing(false)
    }
  }

  const handleAssignStudentToGroup = async (studentId: string, groupId: string) => {
    const group = groups.find((item) => item.id === groupId)
    if (!group || !group.coursework?.course_unit_id) return

    const targetCourseUnitId = group.coursework.course_unit_id
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

        // Revert any conflicting group that drops below max_members back to 'forming'
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

      // Automatically update group status to 'active' if max members capacity is reached
      const currentCount = groupMembers.filter((m) => m.group_id === groupId && m.user_id !== studentId).length
      const newCount = currentCount + 1
      if (group.max_members && newCount >= group.max_members && group.status === 'forming') {
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
    const group = groups.find((item) => item.id === groupId)
    if (group?.leader_id === studentId) {
      alert('The group leader cannot be removed. Assign another leader first.')
      return
    }

    setRemovingIds((prev) => ({ ...prev, [`${studentId}-${groupId}`]: true }))

    try {
      const { error } = await supabase.from('group_members').delete().eq('user_id', studentId).eq('group_id', groupId)
      if (error) throw error

      // Automatically update group status back to 'forming' if member count drops below max_members
      const currentCount = groupMembers.filter((m) => m.group_id === groupId).length
      const newCount = currentCount - 1
      if (group && group.status === 'active' && group.max_members && newCount < group.max_members) {
        await supabase.from('groups').update({ status: 'forming' }).eq('id', groupId)
      }

      await fetchData()
    } catch (error) {
      console.error('Error removing student from group:', error)
      alert(error instanceof Error ? error.message : 'Unable to remove student from the group.')
    } finally {
      setRemovingIds((prev) => ({ ...prev, [`${studentId}-${groupId}`]: false }))
    }
  }

  const handleChangeGroupLeader = async (groupId: string, newLeaderId: string) => {
    if (!groupId || !newLeaderId) return
    const targetGroup = groups.find((g) => g.id === groupId)
    if (!targetGroup) return

    const oldLeaderId = targetGroup.leader_id

    try {
      // 1. Ensure new leader is in group_members with role 'leader'
      const isMember = groupMembers.some((m) => m.group_id === groupId && m.user_id === newLeaderId)
      if (!isMember) {
        const { error: memberInsertError } = await supabase
          .from('group_members')
          .upsert(
            { group_id: groupId, user_id: newLeaderId, role: 'leader' },
            { onConflict: 'group_id,user_id' }
          )
        if (memberInsertError) throw memberInsertError
      } else {
        const { error: updateNewLeaderError } = await supabase
          .from('group_members')
          .update({ role: 'leader' })
          .eq('group_id', groupId)
          .eq('user_id', newLeaderId)

        if (updateNewLeaderError) throw updateNewLeaderError
      }

      // 2. Set previous leader's role to 'member' if they remain in group
      if (oldLeaderId && oldLeaderId !== newLeaderId) {
        await supabase
          .from('group_members')
          .update({ role: 'member' })
          .eq('group_id', groupId)
          .eq('user_id', oldLeaderId)
      }

      // 3. Update leader_id on group record
      const { error: groupUpdateError } = await supabase
        .from('groups')
        .update({ leader_id: newLeaderId })
        .eq('id', groupId)

      if (groupUpdateError) throw groupUpdateError

      await fetchData()
    } catch (error) {
      console.error('Error changing group leader:', error)
      alert(error instanceof Error ? error.message : 'Unable to change group leader.')
    }
  }

  const openGroupEditor = (group: any) => {
    setEditingGroup(group)
    setGroupEditName(group.name || '')
    setGroupEditDescription(group.description || '')
    setGroupEditStatus(group.status || 'forming')
    setGroupEditMaxMembers(String(group.max_members || 5))
    setGroupEditLeaderId(group.leader_id || '')
    setGroupEditMemberId('')
  }

  const saveGroupEdits = async () => {
    if (!editingGroup || !groupEditName.trim()) return

    const nextMaxMembers = Number(groupEditMaxMembers)
    const currentMemberCount = groupMembers.filter((member) => member.group_id === editingGroup.id).length
    const coursework = courseworks.find((item) => item.id === editingGroup.coursework_id)
    const courseworkMax = Number(coursework?.max_group_size || 20)

    if (!Number.isInteger(nextMaxMembers) || nextMaxMembers < 1) {
      alert('Maximum members must be a whole number of at least 1.')
      return
    }
    if (nextMaxMembers < currentMemberCount) {
      alert(`This group already has ${currentMemberCount} members. Remove members before lowering its capacity.`)
      return
    }
    if (nextMaxMembers > courseworkMax) {
      alert(`This coursework allows a maximum of ${courseworkMax} members per group.`)
      return
    }

    // Auto-update status if count reaches nextMaxMembers or falls below
    let targetStatus = groupEditStatus
    if (currentMemberCount >= nextMaxMembers && groupEditStatus === 'forming') {
      targetStatus = 'active'
    } else if (currentMemberCount < nextMaxMembers && groupEditStatus === 'active') {
      targetStatus = 'forming'
    }

    setSavingGroup(true)
    try {
      if (groupEditLeaderId && groupEditLeaderId !== editingGroup.leader_id) {
        await handleChangeGroupLeader(editingGroup.id, groupEditLeaderId)
      }

      const { error } = await supabase
        .from('groups')
        .update({
          name: groupEditName.trim(),
          description: groupEditDescription.trim() || null,
          status: targetStatus,
          max_members: nextMaxMembers,
          leader_id: groupEditLeaderId || editingGroup.leader_id,
        })
        .eq('id', editingGroup.id)

      if (error) throw error
      setEditingGroup(null)
      await fetchData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to update the group.')
    } finally {
      setSavingGroup(false)
    }
  }

  const addMemberFromEditor = async () => {
    if (!editingGroup || !groupEditMemberId) return
    const currentMemberCount = groupMembers.filter((member) => member.group_id === editingGroup.id).length
    const capacity = Number(groupEditMaxMembers)
    if (currentMemberCount >= capacity) {
      alert('The group is already at its maximum capacity.')
      return
    }

    await handleAssignStudentToGroup(groupEditMemberId, editingGroup.id)
    setGroupEditMemberId('')
  }

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds((current) => current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId])
  }

  const saveBulkGroupEdits = async () => {
    if (selectedGroupIds.length === 0) return

    const nextMaxMembers = bulkMaxMembers.trim() ? Number(bulkMaxMembers) : null
    if (nextMaxMembers !== null && (!Number.isInteger(nextMaxMembers) || nextMaxMembers < 1 || nextMaxMembers > 20)) {
      alert('Maximum members must be a whole number between 1 and 20.')
      return
    }
    if (!nextMaxMembers && !bulkStatus) {
      alert('Choose a new capacity, a new status, or both.')
      return
    }

    const selectedGroupsToUpdate = selectedGroups.filter((group) => selectedGroupIds.includes(group.id))
    if (nextMaxMembers !== null) {
      const tooSmall = selectedGroupsToUpdate.find((group) => (
        groupMembers.filter((member) => member.group_id === group.id).length > nextMaxMembers
      ))
      if (tooSmall) {
        alert(`${tooSmall.name} already has more members than the requested capacity. Remove members first.`)
        return
      }

      const exceedsCoursework = selectedGroupsToUpdate.find((group) => {
        const coursework = courseworks.find((item) => item.id === group.coursework_id)
        return nextMaxMembers > Number(coursework?.max_group_size || 20)
      })
      if (exceedsCoursework) {
        const coursework = courseworks.find((item) => item.id === exceedsCoursework.coursework_id)
        alert(`${exceedsCoursework.name} cannot exceed the coursework limit of ${coursework?.max_group_size || 20}.`)
        return
      }
    }

    const updates: Record<string, number | string> = {}
    if (nextMaxMembers !== null) updates.max_members = nextMaxMembers
    if (bulkStatus) updates.status = bulkStatus

    setBulkSaving(true)
    try {
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .in('id', selectedGroupIds)

      if (error) throw error
      setSelectedGroupIds([])
      setBulkMaxMembers('')
      setBulkStatus('')
      await fetchData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to update the selected groups.')
    } finally {
      setBulkSaving(false)
    }
  }

  const deleteGroup = async (group: any) => {
    if (!group?.id || deletingGroupId) return

    const memberCount = groupMembers.filter((member) => member.group_id === group.id).length
    const confirmed = window.confirm(
      `Delete ${group.name || 'this group'}? This will remove the group and its ${memberCount} member assignment${memberCount === 1 ? '' : 's'}. This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingGroupId(group.id)
    try {
      const { error: memberError } = await supabase.from('group_members').delete().eq('group_id', group.id)
      if (memberError) throw memberError

      const { error: groupError } = await supabase.from('groups').delete().eq('id', group.id)
      if (groupError) throw groupError

      setSelectedGroupIds((current) => current.filter((groupId) => groupId !== group.id))
      await fetchData()
    } catch (error) {
      console.error('Error deleting group:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete the group.')
    } finally {
      setDeletingGroupId(null)
    }
  }

  const selectedCourseSummary = unitSummaries.find((unit) => unit.id === selectedCourseUnitId)

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // DETAIL VIEW: a course unit has been selected
  if (selectedCourseUnitId && selectedCourseSummary) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedCourseUnitId(null)} className="shrink-0">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                All Units
              </Button>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Course Unit
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                  {selectedCourseSummary.code} <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">• {selectedCourseSummary.name}</span>
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" className="font-semibold">{selectedCourseSummary.totalMembersAssigned} / {selectedCourseSummary.totalStudents} Grouped</Badge>
              <Badge variant="secondary" className="font-semibold">{selectedCourseSummary.totalGroups} Groups</Badge>
              <Badge variant="warning" className="font-semibold">{orphanStudents.length} Orphans</Badge>
              <Button variant="outline" size="sm" onClick={fetchData} loading={loading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => {
                const defaultCw = selectedCourseworks.length > 0 ? selectedCourseworks[0].id : ''
                form.setValue('courseworkId', defaultCw)
                setCreateModalOpen(true)
              }}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Group
              </Button>
            {currentUnitManagers && (
              <Button variant="outline" onClick={openRandomGroupModal} disabled={selectedCourseworks.length === 0}>
                <Shuffle className="h-4 w-4 mr-1.5" />
                Random Groups
              </Button>
            )}
          </div>
        </div>
      </div>

        {/* Group Formation Tiles */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Groups in {selectedCourseSummary.code}</h2>
              <span className="text-xs text-text-muted">{selectedGroups.length} groups found</span>
            </div>
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
              {currentUnitManagers && selectedGroups.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-text-muted">
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.length === selectedGroups.length}
                      onChange={(event) => setSelectedGroupIds(event.target.checked ? selectedGroups.map((group) => group.id) : [])}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    Select all
                  </label>
                </div>
              )}
            </div>
          </div>

          {currentUnitManagers && selectedGroupIds.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  Bulk edit {selectedGroupIds.length} group{selectedGroupIds.length === 1 ? '' : 's'}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="Set maximum members"
                    type="number"
                    min={1}
                    max={20}
                    value={bulkMaxMembers}
                    onChange={(event) => setBulkMaxMembers(event.target.value)}
                    placeholder="Leave unchanged"
                  />
                  <Select
                    label="Set status"
                    value={bulkStatus}
                    onChange={setBulkStatus}
                    options={[
                      { value: 'forming', label: 'Forming' },
                      { value: 'active', label: 'Active' },
                      { value: 'locked', label: 'Locked' },
                    ]}
                    placeholder="Leave unchanged"
                  />
                </div>
              </div>
              <Button onClick={saveBulkGroupEdits} loading={bulkSaving}>
                Save selected
              </Button>
            </div>
          )}

          {selectedGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-text-muted">
                No groups have been formed for this course unit yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {sortedGroups.map((group) => {
                const members = groupMembers.filter((member) => member.group_id === group.id)
                const leaderName = group.leader?.full_name || 'Unassigned'
                const isFull = members.length >= group.max_members
                const isSelected = selectedGroupIds.includes(group.id)

                return (
                  <Card key={group.id} className="flex flex-col justify-between hover:border-primary/40 transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {currentUnitManagers && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleGroupSelection(group.id)}
                              aria-label={`Select ${group.name}`}
                              className="h-4 w-4 shrink-0 rounded border-border text-primary"
                            />
                          )}
                          <CardTitle className="truncate text-lg font-bold">{group.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentUnitManagers && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openGroupEditor(group)} title="Edit group">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {currentUnitManagers && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
                              onClick={() => deleteGroup(group)}
                              title="Delete group"
                              disabled={deletingGroupId === group.id}
                              loading={deletingGroupId === group.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Badge variant={group.status === 'active' ? 'success' : group.status === 'forming' ? 'warning' : 'secondary'}>
                            {group.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {group.description || 'Collaborative group for course unit assignments.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-border bg-surface-hover p-2.5">
                          <p className="text-text-muted">Leader</p>
                          <p className="font-semibold text-text-primary truncate">{leaderName}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-surface-hover p-2.5">
                          <p className="text-text-muted">Students</p>
                          <p className={`font-semibold ${isFull ? 'text-danger' : 'text-text-primary'}`}>
                            {members.length} / {group.max_members}{isFull ? ' (Full)' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Member Roster */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Assigned Members</span>
                          <span className="text-[11px] text-text-muted">{members.length} students</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {members.length === 0 ? (
                            <p className="text-xs text-text-muted italic">No students assigned yet.</p>
                          ) : (
                            members.map((member) => {
                              const isLeader = group.leader_id === member.user_id
                              return (
                                <div key={member.id} className="flex items-center justify-between rounded-xl border border-border bg-surface-hover px-3 py-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-semibold text-text-primary">{member.user?.full_name || 'Student'}</p>
                                      {isLeader && (
                                        <Badge variant="primary" className="px-1.5 py-0 text-[9px] gap-0.5">
                                          <Crown className="h-2.5 w-2.5" /> Leader
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-text-muted">{member.user?.student_registration_number || 'No Reg No'}</p>
                                  </div>
                                  {currentUnitManagers && (
                                    <div className="flex items-center gap-1">
                                      {!isLeader && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-amber-500 hover:bg-amber-500/10"
                                          title="Make this student Group Leader"
                                          onClick={() => handleChangeGroupLeader(group.id, member.user_id)}
                                        >
                                          <Crown className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 shrink-0 p-0 text-danger hover:bg-danger/10"
                                        title={isLeader ? 'Assign another leader before removing this student' : 'Remove student from group'}
                                        disabled={isLeader}
                                        loading={!!removingIds[`${member.user_id}-${group.id}`]}
                                        onClick={() => handleRemoveFromGroup(member.user_id, group.id)}
                                      >
                                        <UserMinus className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Orphan Students Spreadsheet Table — Coordinator & SC Only */}
        {currentUnitManagers && (
          <Card className="border-amber-500/30 shadow-sm">
            <CardHeader className="bg-amber-500/5 pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookCopy className="h-5 w-5 text-amber-600" />
                  <div>
                    <CardTitle className="text-base text-text-primary">
                      Orphan Students — {selectedCourseSummary.code}
                    </CardTitle>
                    <p className="text-xs text-text-secondary">
                      Restricted to coordinators and selected coordinators of this unit. Manually assign or override group placement.
                    </p>
                  </div>
                </div>
                <Badge variant={orphanStudents.length > 0 ? 'warning' : 'success'}>
                  {orphanStudents.length} {orphanStudents.length === 1 ? 'Orphan' : 'Orphans'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {orphanStudents.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <ShieldCheck className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-text-primary">All registered students are assigned!</p>
                  <p className="text-xs mt-1">No orphan students remain in {selectedCourseSummary.code}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface-hover text-xs font-semibold uppercase tracking-wider text-text-muted">
                        <th className="py-3 px-4">Student Name & Email</th>
                        <th className="py-3 px-4">Reg Number</th>
                        <th className="py-3 px-4">WhatsApp</th>
                        <th className="py-3 px-4">Target Group</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orphanStudents.map((student) => {
                        const targetGroupId = assignmentTargets[student.id] || selectedGroups[0]?.id || ''
                        return (
                          <tr key={student.id} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-semibold text-text-primary">{student.full_name}</p>
                              <p className="text-xs text-text-muted">{student.email}</p>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs font-medium text-text-primary">
                              {student.student_registration_number || '—'}
                            </td>
                            <td className="py-3 px-4 text-xs text-text-secondary">
                              {student.whatsapp_phone || '—'}
                            </td>
                            <td className="py-3 px-4">
                              <Select
                                value={targetGroupId}
                                onChange={(value) => setAssignmentTargets((prev) => ({ ...prev, [student.id]: value }))}
                                options={selectedGroups.map((group) => {
                                  const cnt = groupMembers.filter((m) => m.group_id === group.id).length
                                  return { value: group.id, label: `${group.name} (${cnt}/${group.max_members})` }
                                })}
                                placeholder="Select group..."
                                className="w-52 text-xs"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAssignStudentToGroup(student.id, targetGroupId)}
                                loading={!!assigningIds[`${student.id}-${targetGroupId}`]}
                                disabled={!selectedGroups.length || !targetGroupId}
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

        <Modal isOpen={editingGroup !== null} onClose={() => setEditingGroup(null)} title="Edit Group" size="md">
          <div className="space-y-4">
            <Input label="Group name" value={groupEditName} onChange={(event) => setGroupEditName(event.target.value)} />
            <Textarea label="Group description" value={groupEditDescription} onChange={(event) => setGroupEditDescription(event.target.value)} />
            <Input
              label="Maximum members"
              type="number"
              min={1}
              max={20}
              value={groupEditMaxMembers}
              onChange={(event) => setGroupEditMaxMembers(event.target.value)}
              helperText="The value cannot be lower than the current number of members or higher than the coursework limit."
            />
            <Select
              label="Group status"
              value={groupEditStatus}
              onChange={setGroupEditStatus}
              options={[
                { value: 'forming', label: 'Forming - members can still be added' },
                { value: 'active', label: 'Active - formation complete' },
                { value: 'locked', label: 'Locked - no further changes' },
              ]}
            />
            {editingGroup && (
              <Select
                label="Group Leader"
                value={groupEditLeaderId}
                onChange={setGroupEditLeaderId}
                options={groupMembers
                  .filter((member) => member.group_id === editingGroup.id)
                  .map((member) => ({
                    value: member.user_id,
                    label: member.user?.full_name ? `${member.user.full_name} (${member.user.email || 'No email'})` : 'Student',
                  }))}
                placeholder="Select group leader..."
              />
            )}
            {editingGroup && (
              <div className="space-y-3 rounded-xl border border-border bg-surface-hover/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Members</p>
                    <p className="text-xs text-text-muted">
                      {groupMembers.filter((member) => member.group_id === editingGroup.id).length} / {groupEditMaxMembers || '0'} assigned
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {groupMembers.filter((member) => member.group_id === editingGroup.id).map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-text-primary">{member.user?.full_name || 'Student'}</p>
                        {editingGroup.leader_id === member.user_id && (
                          <p className="text-[10px] text-primary">Group leader</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0 text-danger hover:bg-danger/10"
                        title={editingGroup.leader_id === member.user_id ? 'Assign another leader before removing this student' : 'Remove student from group'}
                        disabled={editingGroup.leader_id === member.user_id}
                        loading={!!removingIds[`${member.user_id}-${editingGroup.id}`]}
                        onClick={() => handleRemoveFromGroup(member.user_id, editingGroup.id)}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select
                    value={groupEditMemberId}
                    onChange={setGroupEditMemberId}
                    searchable
                    options={students
                      .filter((student) => student.role === 'student')
                      .filter((student) => !groupMembers.some((member) => member.group_id === editingGroup.id && member.user_id === student.id))
                      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
                      .map((student) => ({
                        value: student.id,
                        label: `${student.full_name}${student.student_registration_number ? ` (${student.student_registration_number})` : ''}`,
                        searchText: `${student.full_name || ''} ${student.student_registration_number || ''} ${student.email || ''}`,
                      }))}
                    placeholder="Search and add a student..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={addMemberFromEditor}
                    disabled={!groupEditMemberId || groupMembers.filter((member) => member.group_id === editingGroup.id).length >= Number(groupEditMaxMembers || 0)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditingGroup(null)}>Cancel</Button>
              <Button onClick={saveGroupEdits} loading={savingGroup} disabled={!groupEditName.trim()}>Save changes</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={randomGroupModalOpen} onClose={() => setRandomGroupModalOpen(false)} title="Create Random Groups" size="md">
          <div className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-text-secondary">
              Unassigned enrolled students will be shuffled and distributed as evenly as possible. Existing group members will not be moved.
            </div>
            <Select
              label="Coursework assignment"
              options={selectedCourseworks.map((cw) => ({ value: cw.id, label: `${cw.course_unit?.code || selectedCourseSummary.code} - ${cw.title}` }))}
              placeholder="Select coursework assignment"
              value={randomGroupCourseworkId}
              onChange={setRandomGroupCourseworkId}
            />
            <Input
              label="Members per group (optional)"
              type="number"
              min={2}
              value={randomMembersPerGroup}
              onChange={(event) => setRandomMembersPerGroup(event.target.value)}
              placeholder="Leave blank to balance automatically"
              helperText={randomGroupCourseworkId
                ? `Maximum allowed: ${selectedCourseworks.find((cw) => cw.id === randomGroupCourseworkId)?.max_group_size || 'coursework limit'}`
                : 'Leave blank to balance the roster automatically.'}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRandomGroupModalOpen(false)}>Cancel</Button>
              <Button onClick={createRandomGroups} loading={randomizing} disabled={!randomGroupCourseworkId}>
                <Shuffle className="h-4 w-4 mr-1.5" />
                Create Random Groups
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); setCreateModalError(''); }} title="Create New Group" size="lg">
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
                  label="Coursework assignment"
                  error={form.formState.errors.courseworkId?.message}
                  options={selectedCourseworks.map((cw) => ({ value: cw.id, label: `${cw.course_unit?.code || ''} - ${cw.title}` }))}
                  placeholder="Select coursework assignment"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Input
              label="Group name"
              error={form.formState.errors.name?.message}
              placeholder="e.g. Algo Knights"
              {...form.register('name')}
            />
            <Textarea
              label="Group description"
              error={form.formState.errors.description?.message}
              placeholder="Brief description of this group"
              {...form.register('description')}
            />
            <Controller
              name="isPrivate"
              control={form.control}
              render={({ field }) => (
                <Select
                  label="Group privacy"
                  options={[
                    { value: 'false', label: 'Public - Open for students' },
                    { value: 'true', label: 'Private - Request to join' },
                  ]}
                  value={String(field.value)}
                  onChange={(value) => field.onChange(value === 'true')}
                />
              )}
            />
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
      </div>
    )
  }

  // DEFAULT VIEW: Course Unit tiles only
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Coordinator Workspace
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Student <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Groups</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">Select a course unit to view its groups, rosters, and manage orphan student assignments.</p>
          </div>
          <Button variant="outline" onClick={fetchData} loading={loading} className="self-start sm:self-auto border-border/60 backdrop-blur-md">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

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
              No active course units found.
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
    </div>
  )
}