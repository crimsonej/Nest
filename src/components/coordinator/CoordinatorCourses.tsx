'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, FolderOpen, LayoutGrid, List } from 'lucide-react'
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
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('tile')
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

  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})

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
      const [coursesRes, studentsRes] = await Promise.all([
        supabase.from('courses').select('*, faculty:faculties(id, code, name)').order('name'),
        supabase.from('users').select('id, course, faculty_id'),
      ])

      if (coursesRes.error) throw coursesRes.error

      const rawCourses = coursesRes.data || []
      const rawStudents = (studentsRes.data || []).filter((s: any) => s.role === 'student' || s.status === 'normal' || s.status === 'selected_coordinator')

      const counts: Record<string, number> = {}
      rawCourses.forEach((c: any) => {
        const count = rawStudents.filter((s: any) => {
          if (!s.course) return false
          const sc = s.course.toLowerCase().trim()
          return sc === c.code?.toLowerCase().trim() || sc === c.name?.toLowerCase().trim()
        }).length
        counts[c.id] = count
      })

      setStudentCounts(counts)
      setCourses(rawCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const userFacultyId = user?.faculty_id
  const isAdmin = user?.role === 'admin' || user?.status === 'admin'

  const availableFaculties = useMemo(() => {
    if (isAdmin) return faculties
    if (userFacultyId) {
      const matched = faculties.filter((f) => f.id === userFacultyId)
      if (matched.length > 0) return matched
    }
    if (user?.faculty) {
      const matched = faculties.filter((f) => f.name === user.faculty || f.code === user.faculty)
      if (matched.length > 0) return matched
    }
    return faculties
  }, [faculties, isAdmin, userFacultyId, user?.faculty])

  const resetForm = () => setFormValues({
    facultyId: availableFaculties[0]?.id || '',
    code: '',
    name: '',
    description: '',
    isActive: true,
  })

  const openCreateModal = () => {
    setSelectedCourse(null)
    setFormValues({
      facultyId: availableFaculties[0]?.id || '',
      code: '',
      name: '',
      description: '',
      isActive: true,
    })
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
      key: 'students_count',
      header: 'Enrolled Students',
      render: (row: any) => (
        <Badge variant="primary" className="font-mono text-xs">
          {studentCounts[row.id] || 0} {studentCounts[row.id] === 1 ? 'Student' : 'Students'}
        </Badge>
      ),
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
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Coordinator Workspace
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Academic <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Courses</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">Manage the academic programmes that appear in the system and can be linked to course units.</p>
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
              Add Course
            </Button>
          </div>
        </div>
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

      {viewMode === 'tile' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-52 rounded-2xl border border-border bg-surface animate-pulse" />
            ))
          ) : filteredCourses.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-text-muted">
              No courses found.
            </div>
          ) : (
            filteredCourses.map((course) => (
              <Card key={course.id} className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">{course.code}</p>
                      <CardTitle className="mt-1 text-xl">{course.name}</CardTitle>
                    </div>
                    <Badge variant={course.is_active ? 'success' : 'secondary'}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Faculty</p>
                      <p className="mt-0.5 text-sm text-text-primary">{course.faculty?.name || 'Unassigned faculty'}</p>
                    </div>
                    <Badge variant="primary" className="font-mono text-xs">
                      {studentCounts[course.id] || 0} {studentCounts[course.id] === 1 ? 'Student' : 'Students'}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {course.description || 'No description provided for this course.'}
                  </p>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(course)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(course.id)}>
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
          data={filteredCourses}
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage="No courses found"
        />
      )}

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
            options={availableFaculties.map((faculty) => ({ value: faculty.id, label: `${faculty.code} - ${faculty.name}` }))}
            placeholder="Select faculty"
            value={formValues.facultyId}
            onChange={(value) => setFormValues((prev) => ({ ...prev, facultyId: value }))}
            disabled={!isAdmin && availableFaculties.length === 1}
            helperText={!isAdmin && availableFaculties.length === 1 ? 'Coordinators can only create courses within their assigned faculty.' : undefined}
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
