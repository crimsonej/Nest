'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, BookCopy, CheckCircle2, LayoutGrid, List } from 'lucide-react'
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

export function CoordinatorCourseUnits() {
  const { user } = useAuth()
  const supabase = createClient()
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('tile')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedCourseUnit, setSelectedCourseUnit] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formValues, setFormValues] = useState({
    courseId: '',
    code: '',
    name: '',
    description: '',
    coordinatorId: '',
    isActive: true,
  })

  useEffect(() => {
    fetchCourses()
    fetchCourseUnits()
  }, [user])

  async function fetchCourses() {
    const { data, error } = await supabase.from('courses').select('id, code, name').eq('is_active', true).order('name')
    if (!error) setCourses(data || [])
  }

  async function fetchCourseUnits() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('course_units')
        .select('*, course:courses(code, name), coordinator:users!course_units_coordinator_id_fkey(full_name)')
        .order('name')
      if (error) throw error
      setCourseUnits(data || [])
    } catch (error) {
      console.error('Error fetching course units:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => setFormValues({
    courseId: '',
    code: '',
    name: '',
    description: '',
    coordinatorId: user?.id || '',
    isActive: true,
  })

  const openCreateModal = () => {
    setSelectedCourseUnit(null)
    resetForm()
    setCreateModalOpen(true)
  }

  const openEditModal = (courseUnit: any) => {
    setSelectedCourseUnit(courseUnit)
    setFormValues({
      courseId: courseUnit.course_id || '',
      code: courseUnit.code,
      name: courseUnit.name,
      description: courseUnit.description || '',
      coordinatorId: courseUnit.coordinator_id || user?.id || '',
      isActive: courseUnit.is_active,
    })
    setEditModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formValues.courseId || !formValues.code.trim() || !formValues.name.trim()) {
      alert('Please select the course and fill in the course unit code and name.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        course_id: formValues.courseId,
        code: formValues.code.trim().toUpperCase(),
        name: formValues.name.trim(),
        description: formValues.description.trim() || null,
        coordinator_id: formValues.coordinatorId || user?.id,
        is_active: formValues.isActive,
      }

      let saveError: any = null
      if (editModalOpen && selectedCourseUnit) {
        const { error } = await supabase.from('course_units').update(payload).eq('id', selectedCourseUnit.id)
        saveError = error
      } else {
        const { error } = await supabase.from('course_units').insert(payload)
        saveError = error
      }

      if (saveError) {
        console.warn('Direct Supabase write returned error, trying server API route:', saveError.message)
        const isUpdate = Boolean(editModalOpen && selectedCourseUnit)
        const res = await fetch('/api/coordinator/course-units', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isUpdate ? { ...payload, id: selectedCourseUnit.id } : payload)
        })
        const apiData = await res.json()
        if (!res.ok || apiData.error) {
          throw new Error(apiData.error || saveError.message || 'Unable to save course unit.')
        }
      }

      setCreateModalOpen(false)
      setEditModalOpen(false)
      resetForm()
      await fetchCourseUnits()
    } catch (error) {
      console.error('Error saving course unit:', error)
      alert(error instanceof Error ? error.message : 'Unable to save course unit.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (courseUnitId: string) => {
    if (!confirm('Delete this course unit? It may still be linked to coursework and student registrations.')) return

    try {
      const { error } = await supabase.from('course_units').delete().eq('id', courseUnitId)
      if (error) {
        console.warn('Direct delete failed, calling server API endpoint:', error.message)
        const res = await fetch(`/api/coordinator/course-units?id=${courseUnitId}`, { method: 'DELETE' })
        const apiData = await res.json()
        if (!res.ok || apiData.error) throw new Error(apiData.error || error.message)
      }
      await fetchCourseUnits()
    } catch (error) {
      console.error('Error deleting course unit:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete course unit.')
    }
  }

  const filteredCourseUnits = useMemo(() => {
    return courseUnits.filter((courseUnit) => {
      const matchesSearch = `${courseUnit.code} ${courseUnit.name} ${courseUnit.course?.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && courseUnit.is_active) || (statusFilter === 'inactive' && !courseUnit.is_active)
      return matchesSearch && matchesStatus
    })
  }, [courseUnits, searchQuery, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Course Units</h1>
          <p className="text-text-secondary">Create and manage the academic units that feed coursework, registrations, and group formation.</p>
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
            Add Course Unit
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search course units..."
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
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
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
              <div key={index} className="h-52 rounded-2xl border border-border bg-surface animate-pulse" />
            ))
          ) : filteredCourseUnits.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-text-muted">
              No course units found.
            </div>
          ) : (
            filteredCourseUnits.map((courseUnit) => (
              <Card key={courseUnit.id} className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">{courseUnit.code}</p>
                      <CardTitle className="mt-1 text-xl">{courseUnit.name}</CardTitle>
                    </div>
                    <Badge variant={courseUnit.is_active ? 'success' : 'secondary'}>
                      {courseUnit.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Course</p>
                    <p className="mt-1 text-sm text-text-primary">{courseUnit.course?.name || 'Unassigned course'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Coordinator</p>
                    <p className="mt-1 text-sm text-text-primary">{courseUnit.coordinator?.full_name || 'Unassigned'}</p>
                  </div>

                  <p className="text-sm text-text-secondary">
                    {courseUnit.description || 'No description provided for this course unit.'}
                  </p>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(courseUnit)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(courseUnit.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Course Unit</th>
                  <th>Course</th>
                  <th>Coordinator</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourseUnits.map((courseUnit) => (
                  <tr key={courseUnit.id}>
                    <td>
                      <div>
                        <p className="font-medium text-text-primary">{courseUnit.code}</p>
                        <p className="text-sm text-text-muted">{courseUnit.name}</p>
                      </div>
                    </td>
                    <td>{courseUnit.course?.name || 'Unassigned course'}</td>
                    <td>{courseUnit.coordinator?.full_name || 'Unassigned'}</td>
                    <td>
                      <Badge variant={courseUnit.is_active ? 'success' : 'secondary'}>
                        {courseUnit.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(courseUnit)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(courseUnit.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditModalOpen(false)
          resetForm()
        }}
        title={editModalOpen ? 'Edit Course Unit' : 'Add Course Unit'}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Course"
            options={courses.map((course) => ({ value: course.id, label: `${course.code} - ${course.name}` }))}
            placeholder="Select course"
            value={formValues.courseId}
            onChange={(value) => setFormValues((prev) => ({ ...prev, courseId: value }))}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Course Unit Code"
              placeholder="e.g. CS101"
              value={formValues.code}
              onChange={(e) => setFormValues((prev) => ({ ...prev, code: e.target.value }))}
            />
            <Input
              label="Course Unit Name"
              placeholder="e.g. Introduction to Programming"
              value={formValues.name}
              onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Optional course unit summary"
            value={formValues.description}
            onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
          />
          <Checkbox
            label="Active"
            description="This course unit should be available for registration and coordination."
            checked={formValues.isActive}
            onCheckedChange={(checked) => setFormValues((prev) => ({ ...prev, isActive: checked }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => {
              setCreateModalOpen(false)
              setEditModalOpen(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} loading={submitting}>
              {editModalOpen ? 'Update Course Unit' : 'Save Course Unit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
