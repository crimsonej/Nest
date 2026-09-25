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
      isPublished: true,
      lockAt: '',
    },
  })

  useEffect(() => {
    fetchCourseUnits()
    fetchCourseworks()
  }, [user])

  async function fetchCourseUnits() {
    if (!user?.id) return
    let { data } = await supabase
      .from('course_units')
      .select('id, code, name')
      .eq('coordinator_id', user.id)
      .eq('is_active', true)

    if (!data || data.length === 0) {
      const fallback = await supabase
        .from('course_units')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code', { ascending: true })
      data = fallback.data
    }
    setCourseUnits(data || [])
  }

  async function fetchCourseworks() {
    setLoading(true)
    try {
      if (!user?.id) {
        setCourseworks([])
        return
      }

      const { data, error } = await supabase
        .from('courseworks')
        .select(`
          *,
          course_unit:course_units!inner(code, name, coordinator_id),
          groups:groups(count)
        `)
        .eq('course_unit.coordinator_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback to fetch all active courseworks if inner join by coordinator_id is restricted
        const { data: allData } = await supabase
          .from('courseworks')
          .select(`
            *,
            course_unit:course_units(code, name),
            groups:groups(count)
          `)
          .order('created_at', { ascending: false })
        setCourseworks(allData || [])
      } else {
        setCourseworks(data || [])
      }
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
      isPublished: true,
      lockAt: '',
    })
    setCreateModalOpen(true)
  }

  const handleTogglePublish = async (cw: any) => {
    const nextStatus = !cw.is_published
    let saveError: any = null
    const { error } = await supabase
      .from('courseworks')
      .update({ is_published: nextStatus })
      .eq('id', cw.id)
    saveError = error

    if (saveError) {
      console.warn('Direct publish update failed, trying server API route:', saveError.message)
      const res = await fetch('/api/coordinator/courseworks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cw, is_published: nextStatus, id: cw.id })
      })
      const apiData = await res.json()
      if (!res.ok || apiData.error) {
        alert(apiData.error || saveError.message || 'Unable to update status.')
        return
      }
    }
    await fetchCourseworks()
  }

  const onSubmit = async (values: any) => {
    setSubmitting(true)
    try {
      const isPersonal = values.workStyle === 'personal'
      const insertData = {
        title: values.title,
        description: values.description || null,
        type: values.type,
        max_group_size: isPersonal ? 1 : values.maxGroupSize,
        min_group_size: isPersonal ? 1 : values.minGroupSize,
        allow_self_formation: isPersonal ? false : values.allowSelfFormation,
        is_published: values.isPublished ?? true,
        lock_at: values.lockAt || null,
        course_unit_id: values.courseUnitId,
        work_style: values.workStyle,
        submission_mode: values.submissionMode,
      }

      let saveError: any = null
      if (editModalOpen && selectedCoursework) {
        const { error } = await supabase
          .from('courseworks')
          .update(insertData)
          .eq('id', selectedCoursework.id)
        saveError = error
      } else {
        const { error } = await supabase.from('courseworks').insert(insertData)
        saveError = error
      }

      // Fallback to server API endpoint if direct client insert/update fails due to RLS/permissions
      if (saveError) {
        console.warn('Direct Supabase write returned error, trying server API route:', saveError.message)
        const isUpdate = Boolean(editModalOpen && selectedCoursework)
        const res = await fetch('/api/coordinator/courseworks', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isUpdate ? { ...insertData, id: selectedCoursework.id } : insertData)
        })
        const apiData = await res.json()
        if (!res.ok || apiData.error) {
          throw new Error(apiData.error || saveError.message || 'Unable to save course work.')
        }
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
    const workStyle = coursework.work_style || 'group_work'
    form.setValue('workStyle', workStyle)
    form.setValue('submissionMode', coursework.submission_mode || 'email')
    form.setValue('maxGroupSize', workStyle === 'personal' ? 1 : coursework.max_group_size ?? 5)
    form.setValue('minGroupSize', workStyle === 'personal' ? 1 : coursework.min_group_size ?? 2)
    form.setValue('allowSelfFormation', workStyle === 'personal' ? false : coursework.allow_self_formation ?? true)
    form.setValue('isPublished', coursework.is_published ?? true)
    form.setValue('lockAt', coursework.lock_at ? new Date(coursework.lock_at).toISOString().slice(0, 16) : '')
    setEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course work?')) return
    const { error } = await supabase.from('courseworks').delete().eq('id', id)
    if (error) {
      console.warn('Direct delete failed, calling server API endpoint:', error.message)
      await fetch(`/api/coordinator/courseworks?id=${id}`, { method: 'DELETE' })
    }
    await fetchCourseworks()
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
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Coordinator Workspace
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Course <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Work</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">Create and manage course work, assignments, and submission requirements for each unit.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl border border-border/60 bg-surface/80 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setViewMode('tile')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'tile' ? 'bg-emerald-600 text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Tiles
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>
            <Button onClick={openCreateModal} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md">
              <Plus className="h-4 w-4" />
              Add Course Work
            </Button>
          </div>
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

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant={cw.is_published ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleTogglePublish(cw)}
                    >
                      {cw.is_published ? 'Unpublish' : 'Publish Now'}
                    </Button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cw)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cw.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
              label="Work style"
              error={form.formState.errors.workStyle?.message}
              options={[
                { value: 'group_work', label: 'Group work' },
                { value: 'personal', label: 'Personal (solo)' },
              ]}
              value={form.watch('workStyle')}
              onChange={(value) => {
                const nextWorkStyle = value as 'group_work' | 'personal'
                form.setValue('workStyle', nextWorkStyle, { shouldValidate: true })
                if (nextWorkStyle === 'personal') {
                  form.setValue('minGroupSize', 1, { shouldValidate: true })
                  form.setValue('maxGroupSize', 1, { shouldValidate: true })
                  form.setValue('allowSelfFormation', false, { shouldValidate: true })
                } else {
                  form.setValue('minGroupSize', 2, { shouldValidate: true })
                  form.setValue('maxGroupSize', 5, { shouldValidate: true })
                  form.setValue('allowSelfFormation', true, { shouldValidate: true })
                }
              }}
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

          <div className="grid gap-4 md:grid-cols-3">
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

            <Select
              label="Publication status"
              options={[
                { value: 'true', label: 'Published (Visible to students)' },
                { value: 'false', label: 'Draft (Hidden from students)' },
              ]}
              value={form.watch('isPublished') ? 'true' : 'false'}
              onChange={(value) => form.setValue('isPublished', value === 'true', { shouldValidate: true })}
            />

            <Input
              label="Deadline"
              type="datetime-local"
              placeholder="Select submission deadline"
              {...form.register('lockAt')}
            />
          </div>

          {form.watch('workStyle') === 'group_work' && (
            <>
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
            </>
          )}

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
