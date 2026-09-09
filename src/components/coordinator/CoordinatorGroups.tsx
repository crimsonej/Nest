'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, ChevronDown, Users, Lock, Globe, Edit, Trash2, Plus, Download, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'

export function CoordinatorGroups() {
  const { user } = useAuth()
  const supabase = createClient()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseworkFilter, setCourseworkFilter] = useState('all')
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [locking, setLocking] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchCourseworks()
    fetchGroups()
  }, [user])

  async function fetchCourseworks() {
    const { data } = await supabase
      .from('courseworks')
      .select('id, title, course_unit:course_units(code)')
      .order('created_at', { ascending: false })
    setCourseworks(data || [])
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
          leader:users!groups_leader_id_fkey(full_name, email),
          members:group_members(count)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (courseworkFilter !== 'all') {
        query = query.eq('coursework_id', courseworkFilter)
      }
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }

      const { data } = await query
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLockGroup = async (groupId: string, currentStatus: string) => {
    setLocking(groupId)
    const newStatus = currentStatus === 'locked' ? 'active' : 'locked'
    const { error } = await supabase.from('groups').update({ status: newStatus }).eq('id', groupId)
    if (!error) {
      fetchGroups()
    }
    setLocking(null)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const csv = groups.map(g => ({
        'Course Code': g.coursework?.course_unit?.code,
        'Coursework': g.coursework?.title,
        'Group Name': g.name,
        'Leader': g.leader?.full_name,
        'Leader Email': g.leader?.email,
        'Member Count': g.members?.[0]?.count || 1,
        'Max Members': g.max_members,
        'Status': g.status,
        'Visibility': g.is_private ? 'Private' : 'Public',
        'Created': formatDate(g.created_at),
      })).reduce((acc, row) => {
        if (acc === '') return Object.keys(row).join(',')
        return acc + '\n' + Object.values(row).map(v => `"${v}"`).join(',')
      }, '')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `groups-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const filteredGroups = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.leader?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter
    const matchesCoursework = courseworkFilter === 'all' || g.coursework_id === courseworkFilter
    return matchesSearch && matchesStatus && matchesCoursework
  })

  const columns = [
    {
      key: 'course_code',
      header: 'Course Code',
      render: (row: any) => row.coursework?.course_unit?.code || 'N/A',
    },
    {
      key: 'coursework',
      header: 'Coursework',
      render: (row: any) => row.coursework?.title || 'N/A',
    },
    {
      key: 'name',
      header: 'Group Name',
      render: (row: any) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-sm text-text-muted">Leader: {row.leader?.full_name}</p>
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
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'forming' ? 'warning' : row.status === 'locked' ? 'secondary' : 'danger'}>
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
      render: (row: any) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLockGroup(row.id, row.status)}
            loading={locking === row.id}
            className={row.status === 'locked' ? 'text-success' : 'text-warning'}
          >
            {row.status === 'locked' ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Group Monitor</h1>
          <p className="text-text-secondary">Real-time view of all active groups across course units</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} loading={exporting}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={fetchGroups} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search groups, leaders..."
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
                { value: 'completed', label: 'Completed' },
                { value: 'disbanded', label: 'Disbanded' },
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
    </div>
  )
}