'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Eye, Calendar, Users, BookOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Checkbox } from '../ui/Checkbox'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { courseworkSchema } from '@/lib/validators'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DataTable } from '../ui/DataTable'

export function CoordinatorCoursework() {
  const { user } = useAuth()
  const supabase = createClient()
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedCoursework, setSelectedCoursework] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(courseworkSchema),
    defaultValues: {
      courseUnitId: '',
      title: '',
      description: '',
      type: 'assignment',
      maxGroupSize: 5,
      minGroupSize: 2,
      allowSelfFormation: true,
      lockAt: '',
    },
  })

  useEffect(() => {
    fetchCourseUnits()
    fetchCourseworks()
  }, [user])

  async function fetchCourseUnits() {
    const { data } = await supabase
      .from('course_units')
      .select('id, code, name')
      .eq('coordinator_id', user?.id)
      .eq('is_active', true)
    setCourseUnits(data || [])
  }

  async function fetchCourseworks() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('courseworks')
        .select(`
          *,
          course_unit:course_units(code, name),
          groups:groups(count)
        `)
        .eq('course_unit.coordinator_id', user?.id)
        .order('created_at', { ascending: false })
      setCourseworks(data || [])
    } catch (error) {
      console.error('Error fetching courseworks:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: any) => {
    setSubmitting(true)
    try {
      const insertData = {
        ...values,
        lock_at: values.lockAt || null,
        course_unit_id: values.courseUnitId,
      }
      delete insertData.lockAt
      delete insertData.courseUnitId

      if (editModalOpen && selectedCoursework) {
        const { error } = await supabase
          .from('courseworks')
          .update(insertData)
          .eq('id', selectedCoursework.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('courseworks').insert(insertData)
        if (error) throw error
      }

      setCreateModalOpen(false)
      setEditModalOpen(false)
      form.reset()
      fetchCourseworks()
    } catch (error) {
      console.error('Error saving coursework:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (coursework: any) => {
    setSelectedCoursework(coursework)
    form.setValue('courseUnitId', coursework.course_unit_id)
    form.setValue('title', coursework.title)
    form.setValue('description', coursework.description || '')
    form.setValue('type', coursework.type)
    form.setValue('maxGroupSize', coursework.max_group_size)
    form.setValue('minGroupSize', coursework.min_group_size)
    form.setValue('allowSelfFormation', coursework.allow_self_formation)
    form.setValue('lockAt', coursework.lock_at ? new Date(coursework.lock_at).toISOString().slice(0, 16) : '')
    setEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coursework?')) return
    const { error } = await supabase.from('courseworks').delete().eq('id', id)
    if (!error) fetchCourseworks()
  }

  const filteredCourseworks = courseworks.filter((cw) => {
    const matchesSearch = cw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cw.course_unit?.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || cw.type === typeFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'published' && cw.is_published) ||
      (statusFilter === 'draft' && !cw.is_published)
    return matchesSearch && matchesType && matchesStatus
  })

  const columns = [
    {
      key: 'title',
      header: 'Coursework',
      render: (row: any) => (
        <div>
          <p className="font-medium text-text-primary">{row.title}</p>
          <p className="text-sm text-text-muted">{row.course_unit?.code} - {row.course_unit?.name}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => <Badge variant="secondary" dot>{row.type}</Badge>,
    },
    {
      key: 'group_size',
      header: 'Group Size',
      render: (row: any) => `${row.min_group_size} - ${row.max_group_size}`,
    },
    {
      key: 'allow_self_formation',
      header: 'Self-Formation',
      render: (row: any) => row.allow_self_formation ? <Badge variant="success">Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => row.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge>,
    },
    {
      key: 'lock_at',
      header: 'Lock Date',
      render: (row: any) => row.lock_at ? formatDate(row.lock_at) : 'No lock',
    },
    {
      key: 'groups_count',
      header: 'Groups',
      render: (row: any) => row.groups?.[0]?.count || 0,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Coursework Manager</h1>
          <p className="text-text-secondary">Create and manage coursework assignments for your course units</p>
        </div>
        <Button onClick={() => { form.reset(); setCreateModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Create Coursework
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search coursework..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'assignment', label: 'Assignment' },
                { value: 'project', label: 'Project' },
                { value: 'presentation', label: 'Presentation' },
                { value: 'lab', label: 'Lab' },
              ]}
              className="w-40"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
              ]}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filteredCourseworks}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No coursework found"
      />

      <Modal isOpen={createModalOpen || editModalOpen} onClose={() => { setCreateModalOpen(false); setEditModalOpen(false); }} title={editModalOpen ? 'Edit Coursework' : 'Create Coursework'} size="lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Course Unit"
            error={form.formState.errors.courseUnitId?.message}
            options={courseUnits.map((cu) => ({ value: cu.id, label: `${cu.code} - ${cu.name}` }))}
            placeholder="Select course unit"
            value={form.watch('courseUnitId')}
            onChange={(value) => form.setValue('courseUnitId', value, { shouldValidate: true })}
          />
          <Input
            label="Title"
            error={form.formState.errors.title?.message}
            placeholder="Enter coursework title"
            {...form.register('title')}
          />
          <Textarea
            label="Description"
            placeholder="Optional description"
            {...form.register('description')}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Type"
              error={form.formState.errors.type?.message}
              options={[
                { value: 'assignment', label: 'Assignment' },
                { value: 'project', label: 'Project' },
                { value: 'presentation', label: 'Presentation' },
                { value: 'lab', label: 'Lab' },
              ]}
              value={form.watch('type')}
              onChange={(value) => form.setValue('type', value as 'assignment' | 'project' | 'presentation' | 'lab', { shouldValidate: true })}
            />
            <Input
              label="Lock Date & Time"
              type="datetime-local"
              placeholder="Optional auto-lock deadline"
              {...form.register('lockAt')}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Min Group Size"
              type="number"
              error={form.formState.errors.minGroupSize?.message}
              placeholder="2"
              {...form.register('minGroupSize', { valueAsNumber: true })}
            />
            <Input
              label="Max Group Size"
              type="number"
              error={form.formState.errors.maxGroupSize?.message}
              placeholder="5"
              {...form.register('maxGroupSize', { valueAsNumber: true })}
            />
          </div>
          <Checkbox
            label="Allow Self-Formation"
            description="Students can create and join groups themselves"
            checked={form.watch('allowSelfFormation')}
            onCheckedChange={(checked) => form.setValue('allowSelfFormation', checked)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editModalOpen ? 'Update' : 'Create'} Coursework
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}