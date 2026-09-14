'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FileText,
  LayoutGrid,
  List,
  Mail,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Checkbox } from '../ui/Checkbox'
import { DataTable } from '../ui/DataTable'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { courseworkSchema } from '@/lib/validators'

const typeLabels: Record<string, string> = {
  assignment: 'Assignment',
  coursework: 'Course Work',
  presentation: 'Presentation',
  project: 'Project',
  lab: 'Lab',
}

const workStyleLabels: Record<string, string> = {
  group_work: 'Group work',
  personal: 'Personal (solo)',
}

const submissionModeLabels: Record<string, string> = {
  email: 'Via email',
  handwritten_copy: 'Handwritten copy',
  typed_printed: 'Typed and printed',
}

export function CoordinatorCoursework() {
  const { user } = useAuth()
  const supabase = createClient()
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('tile')
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
      workStyle: 'group_work',
      submissionMode: 'email',
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

  const openCreateModal = () => {
    setSelectedCoursework(null)
    form.reset({
      courseUnitId: '',
      title: '',
      description: '',
      type: 'assignment',
      workStyle: 'group_work',
      submissionMode: 'email',
      maxGroupSize: 5,
      minGroupSize: 2,
      allowSelfFormation: true,
      lockAt: '',
    })
    setCreateModalOpen(true)
  }

  const onSubmit = async (values: any) => {
    setSubmitting(true)
    try {
      const insertData = {
        ...values,
        lock_at: values.lockAt || null,
        course_unit_id: values.courseUnitId,
        work_style: values.workStyle,
        submission_mode: values.submissionMode,
      }
      delete insertData.lockAt
      delete insertData.courseUnitId
      delete insertData.workStyle
      delete insertData.submissionMode

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
      await fetchCourseworks()
    } catch (error) {
      console.error('Error saving coursework:', error)
      alert(error instanceof Error ? error.message : 'Unable to save the course work.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (coursework: any) => {
    setSelectedCoursework(coursework)
    form.setValue('courseUnitId', coursework.course_unit_id)
    form.setValue('title', coursework.title)
    form.setValue('description', coursework.description || '')
    form.setValue('type', coursework.type || 'assignment')
    form.setValue('workStyle', coursework.work_style || 'group_work')
    form.setValue('submissionMode', coursework.submission_mode || 'email')
    form.setValue('maxGroupSize', coursework.max_group_size ?? 5)
    form.setValue('minGroupSize', coursework.min_group_size ?? 2)
    form.setValue('allowSelfFormation', coursework.allow_self_formation ?? true)
    form.setValue('lockAt', coursework.lock_at ? new Date(coursework.lock_at).toISOString().slice(0, 16) : '')
    setEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course work?')) return
    const { error } = await supabase.from('courseworks').delete().eq('id', id)
    if (!error) fetchCourseworks()
  }

  const filteredCourseworks = courseworks.filter((cw) => {
    const matchesSearch = `${cw.title || ''} ${cw.course_unit?.code || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || cw.type === typeFilter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'published' && cw.is_published) ||
      (statusFilter === 'draft' && !cw.is_published)
    return matchesSearch && matchesType && matchesStatus
  })

  const columns = [
    {
      key: 'title',
      header: 'Course work',
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
      render: (row: any) => <Badge variant="secondary">{typeLabels[row.type] || 'Assignment'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <Badge variant={row.work_style === 'personal' ? 'secondary' : 'primary'}>
          {workStyleLabels[row.work_style] || 'Group work'}
        </Badge>
      ),
    },
    {
      key: 'submission_mode',
      header: 'Submission',
      render: (row: any) => submissionModeLabels[row.submission_mode] || 'Via email',
    },
    {
      key: 'deadline',
      header: 'Deadline',
      render: (row: any) => row.lock_at ? formatDate(row.lock_at) : 'No deadline',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <Pencil className="h-3.5 w-3.5" />
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Course Work</h1>
          <p className="text-text-secondary">Create and manage course work, assignments, and submission requirements for each unit.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode('tile')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${viewMode === 'tile' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <LayoutGrid className="h-4 w-4" />
              Tiles
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Course Work
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search course work..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'assignment', label: 'Assignment' },
                { value: 'coursework', label: 'Course Work' },
                { value: 'presentation', label: 'Presentation' },
                { value: 'project', label: 'Project' },
                { value: 'lab', label: 'Lab' },
              ]}
              className="w-40"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
              ]}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {viewMode === 'tile' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 rounded-2xl border border-border bg-surface animate-pulse" />
            ))
          ) : filteredCourseworks.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-text-muted">
              No course work found.
            </div>
          ) : (
            filteredCourseworks.map((cw) => (
              <Card key={cw.id} className="h-full" hover>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{cw.course_unit?.code || 'Unit'}</p>
                      <CardTitle className="mt-2 text-xl">{cw.title}</CardTitle>
                    </div>
                    <Badge variant={cw.is_published ? 'success' : 'warning'}>{cw.is_published ? 'Published' : 'Draft'}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-text-secondary">{cw.description || 'No description provided for this course work yet.'}</p>

                  <div className="grid gap-2 text-sm text-text-primary">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-text-muted" />
                      <span>{typeLabels[cw.type] || 'Assignment'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-text-muted" />
                      <span>{workStyleLabels[cw.work_style] || 'Group work'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cw.submission_mode === 'email' ? <Mail className="h-4 w-4 text-text-muted" /> : cw.submission_mode === 'typed_printed' ? <Printer className="h-4 w-4 text-text-muted" /> : <CheckCircle2 className="h-4 w-4 text-text-muted" />}
                      <span>{submissionModeLabels[cw.submission_mode] || 'Via email'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-text-muted" />
                      <span>{cw.lock_at ? formatDate(cw.lock_at) : 'No deadline set'}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cw)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cw.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCourseworks}
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage="No course work found"
        />
      )}

      <Modal isOpen={createModalOpen || editModalOpen} onClose={() => { setCreateModalOpen(false); setEditModalOpen(false); }} title={editModalOpen ? 'Edit Course Work' : 'Create Course Work'} size="lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Course unit"
            error={form.formState.errors.courseUnitId?.message}
            options={courseUnits.map((cu) => ({ value: cu.id, label: `${cu.code} - ${cu.name}` }))}
            placeholder="Select course unit"
            value={form.watch('courseUnitId')}
            onChange={(value) => form.setValue('courseUnitId', value, { shouldValidate: true })}
          />

          <Input
            label="Course work"
            error={form.formState.errors.title?.message}
            placeholder="Enter the course work title"
            {...form.register('title')}
          />

          <Textarea
            label="Description"
            placeholder="Add a clear description of the task or assignment"
            {...form.register('description')}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Status"
              error={form.formState.errors.workStyle?.message}
              options={[
                { value: 'group_work', label: 'Group work' },
                { value: 'personal', label: 'Personal (solo)' },
              ]}
              value={form.watch('workStyle')}
              onChange={(value) => form.setValue('workStyle', value as 'group_work' | 'personal', { shouldValidate: true })}
            />

            <Select
              label="Type"
              error={form.formState.errors.type?.message}
              options={[
                { value: 'assignment', label: 'Assignment' },
                { value: 'coursework', label: 'Course Work' },
                { value: 'presentation', label: 'Presentation' },
                { value: 'project', label: 'Project' },
                { value: 'lab', label: 'Lab' },
              ]}
              value={form.watch('type')}
              onChange={(value) => form.setValue('type', value as 'assignment' | 'coursework' | 'presentation' | 'project' | 'lab', { shouldValidate: true })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Mode of handing in"
              error={form.formState.errors.submissionMode?.message}
              options={[
                { value: 'email', label: 'Via email' },
                { value: 'handwritten_copy', label: 'Handwritten copy' },
                { value: 'typed_printed', label: 'Typed and printed' },
              ]}
              value={form.watch('submissionMode')}
              onChange={(value) => form.setValue('submissionMode', value as 'email' | 'handwritten_copy' | 'typed_printed', { shouldValidate: true })}
            />

            <Input
              label="Deadline"
              type="datetime-local"
              placeholder="Select submission deadline"
              {...form.register('lockAt')}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Min group size"
              type="number"
              error={form.formState.errors.minGroupSize?.message}
              placeholder="2"
              {...form.register('minGroupSize', { valueAsNumber: true })}
            />
            <Input
              label="Max group size"
              type="number"
              error={form.formState.errors.maxGroupSize?.message}
              placeholder="5"
              {...form.register('maxGroupSize', { valueAsNumber: true })}
            />
          </div>

          <Checkbox
            label="Allow self-formation"
            description="Students can create and join groups themselves"
            checked={form.watch('allowSelfFormation')}
            onCheckedChange={(checked) => form.setValue('allowSelfFormation', checked)}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editModalOpen ? 'Update' : 'Create'} Course Work
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
