'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Filter, ChevronDown, Users, Lock, Globe } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { groupCreationSchema } from '@/lib/validators'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DataTable } from '../ui/DataTable'

export function StudentGroups() {
  const { user } = useAuth()
  const supabase = createClient()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseworkFilter, setCourseworkFilter] = useState('all')
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set())
  const [myCourseworkGroups, setMyCourseworkGroups] = useState<Record<string, string[]>>({})
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [joinMessage, setJoinMessage] = useState('')

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
    fetchCourseworks()
    fetchGroups()
  }, [user])

  async function fetchCourseworks() {
    const { data } = await supabase
      .from('courseworks')
      .select('id, title, course_unit:course_units(code)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    setCourseworks(data || [])
  }

  async function fetchMyMemberships() {
    if (!user?.id) {
      setMyGroupIds(new Set())
      setMyCourseworkGroups({})
      return
    }

    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups!inner(coursework_id)')
      .eq('user_id', user.id)

    const nextGroupIds = new Set<string>()
    const nextMyCourseworkGroups: Record<string, string[]> = {}

    for (const member of data || []) {
      if (member.group_id) nextGroupIds.add(member.group_id)
      const courseworkId = (member as any).groups?.coursework_id
      if (courseworkId) {
        nextMyCourseworkGroups[courseworkId] = [...(nextMyCourseworkGroups[courseworkId] || []), member.group_id].filter(Boolean)
      }
    }

    setMyGroupIds(nextGroupIds)
    setMyCourseworkGroups(nextMyCourseworkGroups)
  }

  async function fetchGroups() {
    setLoading(true)
    try {
      let query = supabase
        .from('groups')
        .select(`
          *,
          coursework:courseworks(
            id,
            title,
            course_unit:course_units(code, name)
          ),
          leader:users!groups_leader_id_fkey(full_name),
          members:group_members(count)
        `)
        .in('status', ['forming', 'active', 'locked'])

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (courseworkFilter !== 'all') {
        query = query.eq('coursework_id', courseworkFilter)
      }
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }

      const [groupsResponse, membershipsResponse] = await Promise.all([
        query.order('created_at', { ascending: false }),
        fetchMyMemberships(),
      ])

      setGroups(groupsResponse.data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: any) => {
    setCreating(true)
    setJoinMessage('')
    try {
      if (!user?.id) {
        throw new Error('You need to be signed in before creating a group.')
      }

      const existingCourseworkGroups = myCourseworkGroups[values.courseworkId] || []
      if (existingCourseworkGroups.length > 0) {
        throw new Error('You are already in a group for this coursework. One group per course unit is allowed.')
      }

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          coursework_id: values.courseworkId,
          name: values.name,
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
      await fetchGroups()
    } catch (error) {
      console.error('Error creating group:', error)
      setJoinMessage(error instanceof Error ? error.message : 'Unable to create the group')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (groupId: string) => {
    const selectedCourseworkId = groups.find((group) => group.id === groupId)?.coursework_id
    if (selectedCourseworkId && myCourseworkGroups[selectedCourseworkId]?.length) {
      setJoinMessage('You already belong to a group in this coursework. One group per course unit is allowed.')
      return
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user?.id,
      role: 'member',
    })
    if (!error) {
      fetchGroups()
      setJoinModalOpen(false)
      setJoinMessage('')
    } else {
      setJoinMessage(error.message || 'Unable to join this group.')
    }
  }

  const handleRequestJoin = async (groupId: string) => {
    const selectedCourseworkId = groups.find((group) => group.id === groupId)?.coursework_id
    if (selectedCourseworkId && myCourseworkGroups[selectedCourseworkId]?.length) {
      setJoinMessage('You already belong to a group in this coursework, so this request is blocked.')
      return
    }

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

  const filteredGroups = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter
    const matchesCoursework = courseworkFilter === 'all' || g.coursework_id === courseworkFilter
    return matchesSearch && matchesStatus && matchesCoursework
  })

  const columns = [
    {
      key: 'name',
      header: 'Group Name',
      render: (row: any) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-sm text-text-muted">
            {row.coursework?.course_unit?.code} - {row.coursework?.title}
          </p>
        </div>
      ),
    },
    {
      key: 'leader',
      header: 'Leader',
      render: (row: any) => row.leader?.full_name || 'Unknown',
    },
    {
      key: 'members',
      header: 'Members',
      render: (row: any) => `${row.members?.[0]?.count || 1} / ${row.max_members}`,
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
      key: 'visibility',
      header: 'Visibility',
      render: (row: any) => (
        <Badge variant={row.is_private ? 'secondary' : 'primary'} dot>
          {row.is_private ? 'Private' : 'Public'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => {
        const isMember = myGroupIds.has(row.id)
        const isLeader = row.leader_id === user?.id
        const isFull = (row.members?.[0]?.count || 1) >= row.max_members

        if (isLeader) {
          return (
            <Button variant="ghost" size="sm" className="text-text-secondary">
              Manage
            </Button>
          )
        }

        if (isMember) {
          return <Badge variant="success" className="text-xs">Joined</Badge>
        }

        if (isFull) {
          return <Badge variant="secondary" className="text-xs">Full</Badge>
        }

        if (row.is_private) {
          return (
            <Button variant="outline" size="sm" onClick={() => { setSelectedGroup(row); setJoinModalOpen(true); }}>
              Request
            </Button>
          )
        }

        return (
          <Button variant="primary" size="sm" onClick={() => handleJoin(row.id)}>
            Join
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Groups</h1>
          <p className="text-text-secondary">Browse, join, or create groups for your coursework</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {joinMessage && (
        <div className="rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning">
          {joinMessage}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'forming', label: 'Forming' },
                { value: 'active', label: 'Active' },
                { value: 'locked', label: 'Locked' },
              ]}
              className="w-40"
            />
            <Select
              value={courseworkFilter}
              onChange={setCourseworkFilter}
              options={[
                { value: 'all', label: 'All Coursework' },
                ...courseworks.map((cw) => ({ value: cw.id, label: `${cw.course_unit?.code} - ${cw.title}` })),
              ]}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filteredGroups}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No groups found matching your criteria"
      />

      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Group" size="lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="courseworkId"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Coursework"
                error={form.formState.errors.courseworkId?.message}
                options={courseworks.map((cw) => ({ value: cw.id, label: `${cw.course_unit?.code} - ${cw.title}` }))}
                placeholder="Select coursework"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Input
            label="Group Name"
            error={form.formState.errors.name?.message}
            placeholder="Enter group name"
            {...form.register('name')}
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
                label="Visibility"
                options={[
                  { value: 'false', label: 'Public - Anyone can join' },
                  { value: 'true', label: 'Private - Requires approval' },
                ]}
                value={String(field.value)}
                onChange={(value) => field.onChange(value === 'true')}
              />
            )}
          />
          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-sm text-text-secondary">
            WhatsApp visibility stays private to group members only and coordinator-managed group links are added to the course or faculty space.
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

      <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title={selectedGroup?.is_private ? 'Request to Join' : 'Join Group'} size="sm">
        <div className="space-y-4">
          <p>Are you sure you want to {selectedGroup?.is_private ? 'request to join' : 'join'} <strong>{selectedGroup?.name}</strong>?</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setJoinModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => selectedGroup?.is_private ? handleRequestJoin(selectedGroup.id) : handleJoin(selectedGroup.id)}>
              {selectedGroup?.is_private ? 'Request' : 'Join'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
