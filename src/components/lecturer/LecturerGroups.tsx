'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Users,
  RefreshCw,
  ArrowLeft,
  ArrowUpDown,
  Crown,
  AlertCircle,
  BookCopy,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  UserPlus,
  UserX,
  CheckCircle2,
  X,
  Layers3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Textarea'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const compareGroupNames = (a: string = '', b: string = '') =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

export function LecturerGroups() {
  const { user } = useAuth()
  const supabase = createClient()

  const [assignedCourseUnit, setAssignedCourseUnit] = useState<{ id: string; code: string; name: string } | null>(null)
  const [loadingUnit, setLoadingUnit] = useState(true)

  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [studentFilter, setStudentFilter] = useState<'all' | 'assigned' | 'orphans'>('all')
  const [sortBy, setSortBy] = useState('name-asc')

  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  // Group Creation/Editing state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [submittingGroup, setSubmittingGroup] = useState(false)
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    coursework_id: '',
    max_members: 5,
    status: 'forming',
  })

  // Assigning loading states
  const [assigningIds, setAssigningIds] = useState<Record<string, boolean>>({})

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

  // Step 2: Fetch data for that unit
  useEffect(() => {
    if (!assignedCourseUnit?.id) return
    fetchData(assignedCourseUnit.id)
  }, [assignedCourseUnit?.id])

  async function fetchData(courseUnitId: string) {
    setLoading(true)
    try {
      const [groupsRes, membersRes, usersRes, cwRes, enrollRes] = await Promise.all([
        supabase
          .from('groups')
          .select('*, leader:users!groups_leader_id_fkey(id, full_name, email), coursework:courseworks(id, title, course_unit_id)')
          .order('created_at', { ascending: false }),
        supabase.from('group_members').select('*, user:users(id, full_name, email, student_registration_number, whatsapp_phone)'),
        supabase.from('users').select('id, full_name, email, student_registration_number, whatsapp_phone, role, status').order('full_name'),
        supabase.from('courseworks').select('id, title, course_unit_id, max_group_size').eq('course_unit_id', courseUnitId),
        supabase.from('student_course_units').select('id, user_id, course_unit_id, status').eq('course_unit_id', courseUnitId).eq('status', 'active'),
      ])

      const cwIds = new Set((cwRes.data || []).map((c: any) => c.id))
      const filteredGroups = (groupsRes.data || []).filter((g: any) => cwIds.has(g.coursework_id))

      setGroups(filteredGroups)
      setGroupMembers(membersRes.data || [])
      setStudents(usersRes.data || [])
      setCourseworks(cwRes.data || [])
      setEnrollments(enrollRes.data || [])
    } catch (err) {
      console.error('Error fetching lecturer groups data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter & sort groups
  const sortedGroups = useMemo(() => {
    const filtered = groups.filter((g) => {
      const q = searchQuery.toLowerCase()
      if (!q) return true
      return (g.name || '').toLowerCase().includes(q) || (g.coursework?.title || '').toLowerCase().includes(q)
    })
    return [...filtered].sort((a, b) => {
      const aCount = groupMembers.filter((m) => m.group_id === a.id).length
      const bCount = groupMembers.filter((m) => m.group_id === b.id).length
      if (sortBy === 'name-asc') return compareGroupNames(a.name, b.name)
      if (sortBy === 'name-desc') return compareGroupNames(b.name, a.name)
      if (sortBy === 'members-desc') return bCount - aCount
      if (sortBy === 'members-asc') return aCount - bCount
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return 0
    })
  }, [groups, groupMembers, searchQuery, sortBy])

  // Enrolled students roster calculation
  const enrolledUserIds = useMemo(() => new Set(enrollments.map((e) => e.user_id)), [enrollments])

  const enrolledStudents = useMemo(() => {
    return students.filter((s) => s.role === 'student' && (enrolledUserIds.size === 0 || enrolledUserIds.has(s.id)))
  }, [students, enrolledUserIds])

  const studentGroupMap = useMemo(() => {
    const map: Record<string, any> = {}
    groupMembers.forEach((m) => {
      const g = groups.find((grp) => grp.id === m.group_id)
      if (g) {
        map[m.user_id] = { group: g, role: m.role }
      }
    })
    return map
  }, [groupMembers, groups])

  const filteredEnrolledStudents = useMemo(() => {
    return enrolledStudents.filter((student) => {
      const q = studentSearchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        (student.full_name || '').toLowerCase().includes(q) ||
        (student.email || '').toLowerCase().includes(q) ||
        (student.student_registration_number || '').toLowerCase().includes(q)

      const isAssigned = Boolean(studentGroupMap[student.id])

      if (!matchesSearch) return false
      if (studentFilter === 'assigned') return isAssigned
      if (studentFilter === 'orphans') return !isAssigned
      return true
    })
  }, [enrolledStudents, studentSearchQuery, studentFilter, studentGroupMap])

  const totalAssigned = useMemo(() => {
    const ids = new Set(groupMembers.filter((m) => groups.some((g) => g.id === m.group_id)).map((m) => m.user_id))
    return ids.size
  }, [groups, groupMembers])

  const orphanCount = useMemo(() => {
    return Math.max(0, enrolledStudents.length - totalAssigned)
  }, [enrolledStudents, totalAssigned])

  // Group Actions: Create, Edit, Lock, Delete
  const handleOpenCreateModal = () => {
    const defaultCwId = courseworks[0]?.id || ''
    const defaultCw = courseworks.find((cw) => cw.id === defaultCwId)
    setGroupFormData({
      name: '',
      description: '',
      coursework_id: defaultCwId,
      max_members: defaultCw?.max_group_size || 5,
      status: 'forming',
    })
    setCreateModalOpen(true)
  }

  const handleOpenEditModal = (group: any) => {
    setEditingGroup(group)
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      coursework_id: group.coursework_id,
      max_members: group.max_members || 5,
      status: group.status || 'forming',
    })
    setEditModalOpen(true)
  }

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupFormData.name.trim() || !groupFormData.coursework_id) {
      alert('Please fill in the group name and select a coursework.')
      return
    }

    setSubmittingGroup(true)
    try {
      if (editModalOpen && editingGroup) {
        const { error } = await supabase
          .from('groups')
          .update({
            name: groupFormData.name.trim(),
            description: groupFormData.description.trim() || null,
            coursework_id: groupFormData.coursework_id,
            max_members: groupFormData.max_members,
            status: groupFormData.status,
          })
          .eq('id', editingGroup.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('groups').insert({
          name: groupFormData.name.trim(),
          description: groupFormData.description.trim() || null,
          coursework_id: groupFormData.coursework_id,
          max_members: groupFormData.max_members,
          status: groupFormData.status,
        })

        if (error) throw error
      }

      setCreateModalOpen(false)
      setEditModalOpen(false)
      if (assignedCourseUnit) await fetchData(assignedCourseUnit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save group.')
    } finally {
      setSubmittingGroup(false)
    }
  }

  const handleToggleLockGroup = async (group: any) => {
    const nextStatus = group.status === 'locked' ? 'forming' : 'locked'
    const { error } = await supabase.from('groups').update({ status: nextStatus }).eq('id', group.id)
    if (error) {
      alert(`Status update failed: ${error.message}`)
      return
    }
    if (assignedCourseUnit) await fetchData(assignedCourseUnit.id)
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? All member assignments in this group will be removed.')) return
    const { error } = await supabase.from('groups').delete().eq('id', groupId)
    if (error) {
      alert(`Delete failed: ${error.message}`)
      return
    }
    if (selectedGroupId === groupId) setSelectedGroupId(null)
    if (assignedCourseUnit) await fetchData(assignedCourseUnit.id)
  }

  // Member Assign & Remove Actions
  const handleAssignStudentToGroup = async (studentId: string, groupId: string) => {
    if (!groupId) return
    setAssigningIds((prev) => ({ ...prev, [studentId]: true }))
    try {
      // Remove student from any conflicting group in this unit
      const existingMemberships = groupMembers.filter(
        (m) => m.user_id === studentId && groups.some((g) => g.id === m.group_id)
      )

      if (existingMemberships.length > 0) {
        await supabase
          .from('group_members')
          .delete()
          .in('id', existingMemberships.map((m) => m.id))
      }

      // Add to new group
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: studentId,
        role: 'member',
      })

      if (error) throw error

      if (assignedCourseUnit) await fetchData(assignedCourseUnit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to assign student to group.')
    } finally {
      setAssigningIds((prev) => ({ ...prev, [studentId]: false }))
    }
  }

  const handleRemoveFromGroup = async (studentId: string, groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (group?.leader_id === studentId) {
      alert('The group leader cannot be removed directly. Please set another leader first.')
      return
    }

    setAssigningIds((prev) => ({ ...prev, [studentId]: true }))
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', studentId)

      if (error) throw error
      if (assignedCourseUnit) await fetchData(assignedCourseUnit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to remove student from group.')
    } finally {
      setAssigningIds((prev) => ({ ...prev, [studentId]: false }))
    }
  }

  const handleSetLeader = async (groupId: string, newLeaderId: string) => {
    try {
      // 1. Update groups leader_id
      const { error: groupErr } = await supabase.from('groups').update({ leader_id: newLeaderId }).eq('id', groupId)
      if (groupErr) throw groupErr

      // 2. Update roles in group_members
      await supabase.from('group_members').update({ role: 'member' }).eq('group_id', groupId)
      await supabase.from('group_members').update({ role: 'leader' }).eq('group_id', groupId).eq('user_id', newLeaderId)

      if (assignedCourseUnit) await fetchData(assignedCourseUnit.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to update group leader.')
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

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null
  const selectedGroupMemberRows = groupMembers.filter((m) => m.group_id === selectedGroupId)

  // ─── GROUP DETAIL VIEW ───────────────────────────────────────────────────
  if (selectedGroupId && selectedGroup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedGroupId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              All Groups
            </Button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">Group Detail</p>
              <h1 className="text-xl font-bold text-text-primary">{selectedGroup.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleToggleLockGroup(selectedGroup)}>
              {selectedGroup.status === 'locked' ? <Unlock className="h-3.5 w-3.5 mr-1" /> : <Lock className="h-3.5 w-3.5 mr-1" />}
              {selectedGroup.status === 'locked' ? 'Unlock' : 'Lock'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(selectedGroup)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteGroup(selectedGroup.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500"><Users className="h-5 w-5" /></div>
            <div><p className="text-xs text-text-muted">Members</p><p className="font-bold text-text-primary">{selectedGroupMemberRows.length} / {selectedGroup.max_members || '—'}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Crown className="h-5 w-5" /></div>
            <div><p className="text-xs text-text-muted">Leader</p><p className="font-bold text-text-primary truncate">{selectedGroup.leader?.full_name || 'Unassigned'}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><BookCopy className="h-5 w-5" /></div>
            <div><p className="text-xs text-text-muted">Status</p><Badge variant={selectedGroup.status === 'active' ? 'success' : selectedGroup.status === 'locked' ? 'warning' : 'secondary'}>{selectedGroup.status}</Badge></div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Group Roster</CardTitle></CardHeader>
          <CardContent className="p-0">
            {selectedGroupMemberRows.length === 0 ? (
              <p className="p-6 text-center text-text-muted text-sm">No members in this group yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-surface-hover/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Student Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Reg No.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedGroupMemberRows.map((m) => {
                      const isLeader = selectedGroup.leader_id === m.user_id || m.role === 'leader'
                      return (
                        <tr key={m.id} className="hover:bg-surface-hover/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-text-primary">{m.user?.full_name || '—'}</td>
                          <td className="px-4 py-3 text-text-secondary font-mono text-xs">{m.user?.student_registration_number || '—'}</td>
                          <td className="px-4 py-3 text-text-secondary text-xs">{m.user?.email || '—'}</td>
                          <td className="px-4 py-3">
                            {isLeader
                              ? <Badge variant="warning" className="text-[11px]"><Crown className="h-3 w-3 mr-1 inline" />Leader</Badge>
                              : <Badge variant="secondary" className="text-[11px]">Member</Badge>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isLeader && (
                                <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleSetLeader(selectedGroup.id, m.user_id)}>
                                  <Crown className="h-3.5 w-3.5 mr-1" /> Make Leader
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-red-600" onClick={() => handleRemoveFromGroup(m.user_id, selectedGroup.id)}>
                                <UserX className="h-3.5 w-3.5 mr-1" /> Remove
                              </Button>
                            </div>
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
      </div>
    )
  }

  // ─── GROUPS MAIN VIEW ────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-violet-500" />
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-violet-500">Lecturer Portal</p>
          </div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Group Management</h1>
          <p className="mt-1 text-text-secondary text-sm">
            Assigned unit: <span className="font-bold text-violet-400">{assignedCourseUnit.code} · {assignedCourseUnit.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(assignedCourseUnit.id)} loading={loading}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={handleOpenCreateModal} disabled={courseworks.length === 0}>
            <Plus className="h-4 w-4 mr-1" /> Create Group
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500"><Users className="h-5 w-5" /></div>
          <div><p className="text-xs text-text-muted">Total Groups</p><p className="font-bold text-text-primary text-xl">{groups.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 className="h-5 w-5" /></div>
          <div><p className="text-xs text-text-muted">Assigned Students</p><p className="font-bold text-text-primary text-xl">{totalAssigned}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><UserX className="h-5 w-5" /></div>
          <div><p className="text-xs text-text-muted">Unassigned (Orphans)</p><p className="font-bold text-text-primary text-xl">{orphanCount}</p></div>
        </CardContent></Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search groups or coursework title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-text-muted shrink-0" />
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'name-asc', label: 'Name (A-Z)' },
              { value: 'name-desc', label: 'Name (Z-A)' },
              { value: 'members-desc', label: 'Most Members' },
              { value: 'members-asc', label: 'Fewest Members' },
              { value: 'status', label: 'Status' },
              { value: 'newest', label: 'Newest First' },
            ]}
            className="w-44 text-xs"
          />
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[20vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : sortedGroups.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-text-muted">No groups created for this course unit yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGroups.map((group) => {
            const members = groupMembers.filter((m) => m.group_id === group.id)
            const memberCount = members.length
            const capacity = group.max_members || 0
            const fillPct = capacity > 0 ? Math.min(100, Math.round((memberCount / capacity) * 100)) : 0
            const statusVariant = group.status === 'active' ? 'success' : group.status === 'locked' ? 'warning' : 'secondary'

            return (
              <Card key={group.id} hover className="h-full flex flex-col justify-between">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-text-primary text-base leading-snug">{group.name}</h3>
                      <p className="text-xs text-text-muted truncate mt-0.5">{group.coursework?.title || '—'}</p>
                    </div>
                    <Badge variant={statusVariant} className="shrink-0 text-[11px] capitalize">{group.status}</Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{memberCount} / {capacity} members</span>
                      <span>{fillPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', fillPct >= 100 ? 'bg-emerald-500' : fillPct >= 60 ? 'bg-primary' : 'bg-amber-500')}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-text-muted truncate">Leader: {group.leader?.full_name || 'Unassigned'}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <Button variant="ghost" size="sm" className="text-xs text-violet-400" onClick={() => setSelectedGroupId(group.id)}>
                      View Members ({memberCount})
                    </Button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleLockGroup(group)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                        title={group.status === 'locked' ? 'Unlock Group' : 'Lock Group'}
                      >
                        {group.status === 'locked' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(group)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                        title="Edit Group"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-surface-hover transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ─── ENROLLED STUDENTS ROSTER TABLE (BELOW GROUPS) ─────────────────── */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-violet-500" />
              Enrolled Students & Group Assignments
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Manage student group memberships directly for {assignedCourseUnit.code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'assigned', 'orphans'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStudentFilter(mode)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border',
                  studentFilter === mode
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-text-muted border-border hover:text-text-primary'
                )}
              >
                {mode === 'all' ? `All (${enrolledStudents.length})` : mode === 'assigned' ? `Assigned (${totalAssigned})` : `Unassigned / Orphans (${orphanCount})`}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search student by name, email, or registration number..."
            value={studentSearchQuery}
            onChange={(e) => setStudentSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2 text-xs focus:border-primary focus:outline-none"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {filteredEnrolledStudents.length === 0 ? (
              <p className="p-8 text-center text-text-muted text-xs">No students found matching current search and filter criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-surface-hover/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-text-muted uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left font-bold text-text-muted uppercase tracking-wider">Reg No.</th>
                      <th className="px-4 py-3 text-left font-bold text-text-muted uppercase tracking-wider">Email / WhatsApp</th>
                      <th className="px-4 py-3 text-left font-bold text-text-muted uppercase tracking-wider">Assigned Group</th>
                      <th className="px-4 py-3 text-right font-bold text-text-muted uppercase tracking-wider">Group Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEnrolledStudents.map((student) => {
                      const groupInfo = studentGroupMap[student.id]
                      const assignedGroup = groupInfo?.group
                      const isLeader = groupInfo?.role === 'leader'

                      return (
                        <tr key={student.id} className="hover:bg-surface-hover/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-text-primary">
                            {student.full_name}
                          </td>
                          <td className="px-4 py-3 text-text-secondary font-mono">
                            {student.student_registration_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-text-muted">
                            {student.email}
                            {student.whatsapp_phone && <span className="block text-[10px] text-emerald-400">WA: {student.whatsapp_phone}</span>}
                          </td>
                          <td className="px-4 py-3">
                            {assignedGroup ? (
                              <div className="flex items-center gap-1.5">
                                <Badge variant={isLeader ? 'warning' : 'primary'} className="text-[11px]">
                                  {isLeader && <Crown className="h-3 w-3 mr-1 inline" />}
                                  {assignedGroup.name}
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[11px] text-amber-500 border-amber-500/30">
                                Unassigned (Orphan)
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {assignedGroup ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs text-red-500 hover:text-red-600"
                                  onClick={() => handleRemoveFromGroup(student.id, assignedGroup.id)}
                                  loading={assigningIds[student.id]}
                                >
                                  <UserX className="h-3.5 w-3.5 mr-1" /> Remove from Group
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <select
                                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary focus:outline-none"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAssignStudentToGroup(student.id, e.target.value)
                                        e.target.value = ''
                                      }
                                    }}
                                    defaultValue=""
                                    disabled={groups.length === 0}
                                  >
                                    <option value="" disabled>Assign to Group...</option>
                                    {groups.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.name} ({groupMembers.filter((m) => m.group_id === g.id).length}/{g.max_members || '∞'})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
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
      </div>

      {/* Modal for Group Creation & Editing */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => { setCreateModalOpen(false); setEditModalOpen(false); }}
        title={editModalOpen ? 'Edit Group' : 'Create New Group'}
        size="md"
      >
        <form onSubmit={handleSaveGroup} className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Group 1 - Alpha"
            value={groupFormData.name}
            onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
            required
          />

          <Select
            label="Coursework"
            value={groupFormData.coursework_id}
            onChange={(val) => {
              const selectedCw = courseworks.find((cw) => cw.id === val)
              setGroupFormData({
                ...groupFormData,
                coursework_id: val,
                max_members: selectedCw?.max_group_size || groupFormData.max_members,
              })
            }}
            options={courseworks.map((cw) => ({ value: cw.id, label: cw.title }))}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Brief group description or topic..."
            value={groupFormData.description}
            onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Max Members Capacity"
              type="number"
              value={groupFormData.max_members}
              onChange={(e) => setGroupFormData({ ...groupFormData, max_members: Number(e.target.value) || 5 })}
              min={1}
            />

            <Select
              label="Group Status"
              value={groupFormData.status}
              onChange={(val) => setGroupFormData({ ...groupFormData, status: val })}
              options={[
                { value: 'forming', label: 'Forming' },
                { value: 'active', label: 'Active (Full)' },
                { value: 'locked', label: 'Locked' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }}>
              Cancel
            </Button>
            <Button type="submit" loading={submittingGroup}>
              {editModalOpen ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
