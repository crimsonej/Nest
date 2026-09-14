'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, BookCopy, CheckCircle2 } from 'lucide-react'
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
import { DataTable } from '../ui/DataTable'

export function CoordinatorCourseUnits() {
  const { user } = useAuth()
  const supabase = createClient()
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
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
    maxGroupSize: 5,
    minGroupSize: 2,
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
    maxGroupSize: 5,
    minGroupSize: 2,
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
      maxGroupSize: courseUnit.max_group_size || 5,
      minGroupSize: courseUnit.min_group_size || 2,
      isActive: courseUnit.is_active,
    })
    setEditModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formValues.courseId || !formValues.code.trim() || !formValues.name.trim()) {
      alert('Please select the course and fill in the course unit code and name.')
      return
    }

    if (formValues.minGroupSize < 1 || formValues.maxGroupSize < formValues.minGroupSize) {
      alert('Minimum group size must be at least 1 and cannot exceed the maximum group size.')
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
        max_group_size: formValues.maxGroupSize,
        min_group_size: formValues.minGroupSize,
        is_active: formValues.isActive,
      }

      if (editModalOpen && selectedCourseUnit) {
        const { error } = await supabase.from('course_units').update(payload).eq('id', selectedCourseUnit.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('course_units').insert(payload)
        if (error) throw error
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
      if (error) throw error
      await fetchCourseUnits()
    } catch (error) {
      console.error('Error deleting course unit:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete course unit.')
    }
  }

  const filteredCourseUnits = courseUnits.filter((courseUnit) => {
    const matchesSearch = `${courseUnit.code} ${courseUnit.name} ${courseUnit.course?.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && courseUnit.is_active) || (statusFilter === 'inactive' && !courseUnit.is_active)
    return matchesSearch && matchesStatus
  })

  const columns = [
    {
      key: 'code',
      header: 'Course Unit',
      render: (row: any) => (
        <div>
          <p className="font-medium text-text-primary">{row.code}</p>
          <p className="text-sm text-text-muted">{row.name}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row: any) => row.course?.name || row.course_id || 'Unassigned',
    },
    {
      key: 'group_size',
      header: 'Group Size',
      render: (row: any) => `${row.min_group_size || 2} - ${row.max_group_size || 5}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => row.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: any) => row.description || 'No description',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row)}>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Course Units</h1>
          <p className="text-text-secondary">Create and manage the units students can register for and that feed into coursework and groups.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Add Course Unit
        </Button>
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

      <DataTable
        columns={columns}
        data={filteredCourseUnits}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No course units found"
      />

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
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Min Group Size"
              type="number"
              min={1}
              value={formValues.minGroupSize}
              onChange={(e) => setFormValues((prev) => ({ ...prev, minGroupSize: Number(e.target.value || 1) }))}
            />
            <Input
              label="Max Group Size"
              type="number"
              min={1}
              value={formValues.maxGroupSize}
              onChange={(e) => setFormValues((prev) => ({ ...prev, maxGroupSize: Number(e.target.value || 1) }))}
            />
          </div>
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
