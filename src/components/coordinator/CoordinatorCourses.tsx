'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, FolderOpen } from 'lucide-react'
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

export function CoordinatorCourses() {
  const { user } = useAuth()
  const supabase = createClient()
  const [courses, setCourses] = useState<any[]>([])
  const [faculties, setFaculties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formValues, setFormValues] = useState({
    facultyId: '',
    code: '',
    name: '',
    description: '',
    isActive: true,
  })

  useEffect(() => {
    fetchFaculties()
    fetchCourses()
  }, [user])

  async function fetchFaculties() {
    const { data, error } = await supabase.from('faculties').select('id, code, name').order('name')
    if (!error) setFaculties(data || [])
  }

  async function fetchCourses() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*, faculty:faculties(code, name)')
        .order('name')
      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => setFormValues({ facultyId: '', code: '', name: '', description: '', isActive: true })

  const openCreateModal = () => {
    setSelectedCourse(null)
    resetForm()
    setCreateModalOpen(true)
  }

  const openEditModal = (course: any) => {
    setSelectedCourse(course)
    setFormValues({
      facultyId: course.faculty_id,
      code: course.code,
      name: course.name,
      description: course.description || '',
      isActive: course.is_active,
    })
    setEditModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formValues.facultyId || !formValues.code.trim() || !formValues.name.trim()) {
      alert('Please fill in all required fields before saving.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        faculty_id: formValues.facultyId,
        code: formValues.code.trim().toUpperCase(),
        name: formValues.name.trim(),
        description: formValues.description.trim() || null,
        is_active: formValues.isActive,
        created_by: user?.id,
      }

      if (editModalOpen && selectedCourse) {
        const { error } = await supabase.from('courses').update(payload).eq('id', selectedCourse.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('courses').insert(payload)
        if (error) throw error
      }

      setCreateModalOpen(false)
      setEditModalOpen(false)
      resetForm()
      await fetchCourses()
    } catch (error) {
      console.error('Error saving course:', error)
      alert(error instanceof Error ? error.message : 'Unable to save course.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (courseId: string) => {
    if (!confirm('Delete this course? This will fail if linked course units still exist.')) return

    try {
      const { data: linkedUnits, error: unitsError } = await supabase
        .from('course_units')
        .select('id')
        .eq('course_id', courseId)
        .limit(1)

      if (unitsError) throw unitsError
      if ((linkedUnits || []).length > 0) {
        alert('This course still has linked course units. Remove or reassign those units before deleting the course.')
        return
      }

      const { error } = await supabase.from('courses').delete().eq('id', courseId)
      if (error) throw error
      await fetchCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete course.')
    }
  }

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = `${course.code} ${course.name}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && course.is_active) || (statusFilter === 'inactive' && !course.is_active)
    return matchesSearch && matchesStatus
  })

  const columns = [
    {
      key: 'name',
      header: 'Course',
      render: (row: any) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-sm text-text-muted">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'faculty',
      header: 'Faculty',
      render: (row: any) => row.faculty?.name || row.faculty_id || 'Unassigned',
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
          <h1 className="text-2xl font-bold text-text-primary">Courses</h1>
          <p className="text-text-secondary">Manage the academic programmes that appear in the system and can be linked to course units.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Add Course
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search courses..."
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
        data={filteredCourses}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No courses found"
      />

      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditModalOpen(false)
          resetForm()
        }}
        title={editModalOpen ? 'Edit Course' : 'Add Course'}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Faculty"
            options={faculties.map((faculty) => ({ value: faculty.id, label: `${faculty.code} - ${faculty.name}` }))}
            placeholder="Select faculty"
            value={formValues.facultyId}
            onChange={(value) => setFormValues((prev) => ({ ...prev, facultyId: value }))}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Course Code"
              placeholder="e.g. BSCS"
              value={formValues.code}
              onChange={(e) => setFormValues((prev) => ({ ...prev, code: e.target.value }))}
            />
            <Input
              label="Course Name"
              placeholder="e.g. BSc Computer Science"
              value={formValues.name}
              onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Optional course summary"
            value={formValues.description}
            onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
          />
          <Checkbox
            label="Active"
            description="This course should be available for matching course units and student registration."
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
              {editModalOpen ? 'Update Course' : 'Save Course'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
