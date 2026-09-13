'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Shuffle, UserPlus, UserMinus, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
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

export function CoordinatorInterventions() {
  const { user } = useAuth()
  const supabase = createClient()
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [courseworkFilter, setCourseworkFilter] = useState('all')
  const [autoFillLoading, setAutoFillLoading] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [assignLoading, setAssignLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)
    try {
      const [unassignedRes, groupsRes, courseworksRes] = await Promise.all([
        supabase.from('unassigned_students').select('*'),
        supabase.from('groups').select(`
          *,
          coursework:courseworks(id, title, course_unit:course_units(code)),
          members:group_members(count)
        `).in('status', ['forming', 'active']),
        supabase.from('courseworks').select('id, title, course_unit:course_units(code)').eq('is_published', true),
      ])

      setUnassignedStudents(unassignedRes.data || [])
      setGroups(groupsRes.data || [])
      setCourseworks(courseworksRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoFill = async () => {
    if (unassignedStudents.length === 0) return
    
    setAutoFillLoading(true)
    try {
      const availableGroups = groups.filter(g => 
        (g.members?.[0]?.count || 1) < g.max_members && !g.is_private
      )

      if (availableGroups.length === 0) {
        alert('No available groups with capacity')
        return
      }

      // Shuffle students for random assignment
      const shuffledStudents = [...unassignedStudents].sort(() => Math.random() - 0.5)
      
      for (const student of shuffledStudents) {
        const group = availableGroups.find(g => (g.members?.[0]?.count || 1) < g.max_members)
        if (!group) break

        const { error } = await supabase.from('group_members').insert({
          group_id: group.id,
          user_id: student.id,
          role: 'member',
        })

        if (!error) {
          group.members = [{ count: (group.members?.[0]?.count || 1) + 1 }]
        }
      }

      const { data: currentMemberships } = await supabase.from('group_members').select('group_id, user_id')
      const duplicateMembers = new Set<string>((currentMemberships || []).map((row: any) => `${row.group_id}:${row.user_id}`))
      if (duplicateMembers.size > 0) {
        await Promise.all(Array.from(duplicateMembers).map(async (key: string) => {
          const [groupId, userId] = key.split(':')
          const existing = await supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', userId)
          if ((existing.data || []).length > 1) {
            const duplicateIds = (existing.data || []).slice(1).map((row: any) => row.id)
            if (duplicateIds.length > 0) {
              await Promise.all(duplicateIds.map((duplicateId: string) => supabase.from('group_members').delete().eq('id', duplicateId)))
            }
          }
        }))
      }

      fetchData()
    } catch (error) {
      console.error('Auto-fill error:', error)
    } finally {
      setAutoFillLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedStudent || !selectedGroup) return
    
    setAssignLoading(true)
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroup.id,
        user_id: selectedStudent.id,
        role: 'member',
      })

      if (!error) {
        setAssignModalOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error('Assign error:', error)
    } finally {
      setAssignLoading(false)
    }
  }

  const handleRemove = async (groupId: string, studentId: string) => {
    if (!confirm('Remove this student from the group?')) return
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', studentId)
    if (!error) fetchData()
  }

  const filteredStudents = unassignedStudents.filter((s) => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_registration_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredGroups = groups.filter((g) => {
    const matchesCoursework = courseworkFilter === 'all' || g.coursework_id === courseworkFilter
    const hasCapacity = (g.members?.[0]?.count || 1) < g.max_members
    return matchesCoursework && hasCapacity
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Interventions & Automation</h1>
          <p className="text-text-secondary">Manage unassigned students and group assignments</p>
        </div>
        <div className="flex flex-col min-[380px]:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={fetchData} loading={loading} className="w-full min-[380px]:w-auto">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleAutoFill} loading={autoFillLoading} className="w-full min-[380px]:w-auto">
            <Shuffle className="h-4 w-4" />
            Auto-Assign All
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Unassigned Students</CardTitle>
            <Badge variant="danger">{unassignedStudents.length}</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                    <div className="h-8 w-8 rounded-full bg-secondary/20" />
                    <div className="flex-1"><div className="h-4 bg-secondary/20 rounded w-3/4" /><div className="h-3 bg-secondary/20 rounded w-1/2 mt-1" /></div>
                  </div>
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <p className="text-text-muted text-center py-8">All students are assigned to groups</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{student.full_name}</p>
                        <p className="text-sm text-text-muted">{student.course} • {student.student_registration_number}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedStudent(student); setAssignModalOpen(true); }}>
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Available Groups</CardTitle>
            <Badge variant="primary">{filteredGroups.length}</Badge>
          </CardHeader>
          <CardContent>
            <Select
              value={courseworkFilter}
              onChange={setCourseworkFilter}
              options={[
                { value: 'all', label: 'All Coursework' },
                ...courseworks.map(cw => ({ value: cw.id, label: `${cw.course_unit?.code} - ${cw.title}` })),
              ]}
              className="w-full max-w-xs mb-4"
              placeholder="Filter by coursework"
            />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredGroups.map((group) => (
                <div key={group.id} className="p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-text-primary">{group.name}</p>
                      <p className="text-sm text-text-muted">{group.coursework?.course_unit?.code} - {group.coursework?.title}</p>
                    </div>
                    <Badge variant={(group.members?.[0]?.count || 1) >= group.max_members ? 'danger' : 'success'}>
                      {(group.members?.[0]?.count || 1)} / {group.max_members}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedGroup(group); setAssignModalOpen(true); }}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Add Student
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Members Management</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'course_code', header: 'Course', render: (row: any) => row.coursework?.course_unit?.code },
              { key: 'group_name', header: 'Group', render: (row: any) => row.name },
              { key: 'student_name', header: 'Student', render: (row: any) => row.student?.full_name },
              { key: 'student_reg', header: 'Reg Number', render: (row: any) => row.student?.student_registration_number },
              { key: 'role', header: 'Role', render: (row: any) => <Badge variant={row.role === 'leader' ? 'primary' : 'secondary'}>{row.role}</Badge> },
              { key: 'joined_at', header: 'Joined', render: (row: any) => formatDate(row.joined_at) },
              { key: 'actions', header: 'Actions', render: (row: any) => row.role !== 'leader' ? (
                <Button variant="ghost" size="sm" onClick={() => handleRemove(row.group_id, row.student_id)}>
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              ) : null },
            ]}
            data={groups.flatMap(g => 
              (g.members || []).map((m: any) => ({
                ...m,
                group_id: g.id,
                group_name: g.name,
                coursework: g.coursework,
              }))
            )}
            keyExtractor={(row) => `${row.group_id}-${row.student_id}`}
            loading={loading}
            emptyMessage="No group members found"
          />
        </CardContent>
      </Card>

      <Modal isOpen={assignModalOpen} onClose={() => { setAssignModalOpen(false); setSelectedStudent(null); setSelectedGroup(null); }} title="Assign Student to Group" size="md">
        <div className="space-y-4">
          {selectedStudent && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="font-medium">Student: {selectedStudent.full_name}</p>
              <p className="text-sm text-text-muted">{selectedStudent.student_registration_number}</p>
            </div>
          )}
          {selectedGroup && (
            <div className="p-3 bg-success/5 rounded-lg border border-success/20">
              <p className="font-medium">Group: {selectedGroup.name}</p>
              <p className="text-sm text-text-muted">{selectedGroup.coursework?.course_unit?.code} - {selectedGroup.coursework?.title}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} loading={assignLoading}>Assign</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}