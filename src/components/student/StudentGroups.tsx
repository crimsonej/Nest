'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Filter, ChevronDown, Users, Lock, Globe, LayoutGrid, List, Shuffle, MessageSquare } from 'lucide-react'
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
import { isLocalDataMode, subscribeLocalData } from '@/lib/local-data'

export function StudentGroups() {
  const { user } = useAuth()
  const supabase = createClient()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseworkFilter, setCourseworkFilter] = useState('all')
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set())
  const [myCourseworkGroups, setMyCourseworkGroups] = useState<Record<string, string[]>>({})
  const [randomizerUses, setRandomizerUses] = useState<number>(0)
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
    fetchCourseworks()
    fetchGroups()
  }, [user, dataVersion])

  async function fetchCourseworks() {
    const { data } = await supabase
      .from('courseworks')
      .select('id, title, course_unit:course_units(code, name, whatsapp_group_link)')
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
            course_unit:course_units(code, name, whatsapp_group_link)
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

      const [groupsResponse] = await Promise.all([
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

  const handleRandomizer = async () => {
    if (!user) return
    if (randomizerUses >= 2) {
      setJoinMessage('You have reached the maximum limit of 2 randomizer pairings.')
      return
    }

    const targetCourseworkId = courseworkFilter !== 'all' ? courseworkFilter : courseworks[0]?.id
    if (!targetCourseworkId) {
      setJoinMessage('Please select a specific coursework to run the randomizer.')
      return
    }

    if (myCourseworkGroups[targetCourseworkId]?.length) {
      setJoinMessage('You are already assigned to a group for this coursework.')
      return
    }

    const availableGroups = groups.filter((g) => {
      const isFull = (g.members?.[0]?.count || 1) >= g.max_members
      return g.coursework_id === targetCourseworkId && g.status === 'forming' && !isFull && !g.is_private
    })

    if (availableGroups.length === 0) {
      setJoinMessage('No open forming groups available for random pairing in this coursework.')
      return
    }

    const randomGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)]
    await handleJoin(randomGroup.id)
    setRandomizerUses((prev) => prev + 1)
    setJoinMessage(`Randomizer paired you with "${randomGroup.name}"!`)
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
      render: (row: any) => row.leader?.full_name || 'Assigned Leader',
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
      key: 'actions',
      header: 'Actions',
      render: (row: any) => {
        const isMember = myGroupIds.has(row.id)
        const isLeader = row.leader_id === user?.id
        const isFull = (row.members?.[0]?.count || 1) >= row.max_members

        if (isMember) return <Badge variant="success">Member</Badge>
        if (isFull) return <Badge variant="secondary">Full</Badge>
        return (
          <Button size="sm" variant={row.is_private ? 'outline' : 'primary'} onClick={() => { setSelectedGroup(row); setJoinModalOpen(true); }}>
            {row.is_private ? 'Request' : 'Join'}
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Course Groups</h1>
          <p className="text-text-secondary">Browse, join, or form coursework groups for Ndejje University</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRandomizer} disabled={randomizerUses >= 2}>
            <Shuffle className="h-4 w-4 mr-1.5" />
            Randomizer Auto-Pair ({2 - randomizerUses} left)
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Form New Group
          </Button>
        </div>
      </div>

      {joinMessage && (
        <div className="rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning">
          {joinMessage}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search group name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'forming', label: 'Forming' },
                  { value: 'active', label: 'Active' },
                  { value: 'locked', label: 'Locked' },
                ]}
                className="w-36"
              />
              <Select
                value={courseworkFilter}
                onChange={setCourseworkFilter}
                options={[
                  { value: 'all', label: 'All Courseworks' },
                  ...courseworks.map((cw) => ({ value: cw.id, label: `${cw.course_unit?.code} - ${cw.title}` })),
                ]}
                className="w-48"
              />

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
            </div>
          </div>
        </CardContent>
      </Card>

      {layoutMode === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredGroups}
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage="No groups found matching your criteria"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => {
            const isMember = myGroupIds.has(group.id)
            const isLeader = group.leader_id === user?.id
            const memberCount = group.members?.[0]?.count || 1
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
                    {group.coursework?.course_unit?.code} - {group.coursework?.title}
                  </p>

                  <p className="mt-3 text-xs text-text-secondary line-clamp-2">
                    {group.description || 'Collaborative student group for coursework assignments.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-xs text-text-muted border-t border-border/50 pt-3">
                    <span>Members: <strong className="text-text-primary">{memberCount} / {group.max_members}</strong></span>
                    <span>Leader: <strong className="text-text-primary">{group.leader?.full_name || 'Leader'}</strong></span>
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
                    <Badge variant="secondary" className="w-full justify-center py-2">Group Capacity Reached</Badge>
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

      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Form New Group" size="lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="courseworkId"
            control={form.control}
            render={({ field }) => (
              <Select
                label="Coursework Assignment"
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

