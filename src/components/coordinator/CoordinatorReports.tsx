'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Download, Calendar, FileText, BarChart3, Users, Settings } from 'lucide-react'
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

export function CoordinatorReports() {
  const { user } = useAuth()
  const supabase = createClient()
  const [reportType, setReportType] = useState<'groups' | 'students' | 'coursework' | 'tasks'>('groups')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [courseworkFilter, setCourseworkFilter] = useState('all')
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchCourseworks()
  }, [user])

  async function fetchCourseworks() {
    const { data } = await supabase
      .from('courseworks')
      .select('id, title, course_unit:course_units(code)')
      .order('created_at', { ascending: false })
    setCourseworks(data || [])
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      let query: any
      let selectFields = ''

      switch (reportType) {
        case 'groups':
          selectFields = `
            id, name, description, is_private, status, max_members, created_at,
            coursework:courseworks(id, title, course_unit:course_units(code, name)),
            leader:users!groups_leader_id_fkey(full_name, email),
            members:group_members(user_id, role, joined_at, user:users(full_name, email, student_registration_number, course, whatsapp_phone))
          `
          query = supabase.from('groups').select(selectFields).order('created_at', { ascending: false })
          break
        case 'students':
          selectFields = 'id, full_name, email, student_registration_number, course, whatsapp_phone, created_at'
          query = supabase.from('users').select(selectFields).eq('role', 'student').order('created_at', { ascending: false })
          break
        case 'coursework':
          selectFields = `
            id, title, description, type, max_group_size, min_group_size, allow_self_formation, is_published, lock_at, created_at,
            course_unit:course_units(code, name)
          `
          query = supabase.from('courseworks').select(selectFields).order('created_at', { ascending: false })
          break
        case 'tasks':
          selectFields = `
            id, title, description, status, priority, due_date, submitted_at, created_at,
            user:users(full_name, email, student_registration_number),
            coursework:courseworks(title, course_unit:course_units(code)),
            group:groups(name)
          `
          query = supabase.from('tasks').select(selectFields).order('created_at', { ascending: false })
          break
      }

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from)
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to)
      }
      if (courseworkFilter !== 'all' && reportType !== 'students') {
        query = query.eq('coursework_id', courseworkFilter)
      }

      const { data: result } = await query.limit(1000)
      setData(result || [])
    } catch (error) {
      console.error('Report generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = () => {
    if (data.length === 0) return
    
    let csv = ''
    let headers: string[] = []

    switch (reportType) {
      case 'groups':
        headers = ['Group ID', 'Group Name', 'Course Code', 'Coursework', 'Leader', 'Leader Email', 'Status', 'Visibility', 'Max Members', 'Current Members', 'Created']
        csv = data.map(row => [
          row.id,
          row.name,
          row.coursework?.course_unit?.code,
          row.coursework?.title,
          row.leader?.full_name,
          row.leader?.email,
          row.status,
          row.is_private ? 'Private' : 'Public',
          row.max_members,
          row.members?.length || 0,
          formatDate(row.created_at),
        ].map(v => `"${v}"`).join(',')).join('\n')
        break
      case 'students':
        headers = ['Student ID', 'Full Name', 'Email', 'Reg Number', 'Course', 'WhatsApp', 'Created']
        csv = data.map(row => [
          row.id,
          row.full_name,
          row.email,
          row.student_registration_number,
          row.course,
          row.whatsapp_phone,
          formatDate(row.created_at),
        ].map(v => `"${v}"`).join(',')).join('\n')
        break
      case 'coursework':
        headers = ['Coursework ID', 'Title', 'Course Code', 'Course Name', 'Type', 'Min Group', 'Max Group', 'Self Formation', 'Published', 'Lock Date', 'Created']
        csv = data.map(row => [
          row.id,
          row.title,
          row.course_unit?.code,
          row.course_unit?.name,
          row.type,
          row.min_group_size,
          row.max_group_size,
          row.allow_self_formation ? 'Yes' : 'No',
          row.is_published ? 'Yes' : 'No',
          row.lock_at ? formatDate(row.lock_at) : 'None',
          formatDate(row.created_at),
        ].map(v => `"${v}"`).join(',')).join('\n')
        break
      case 'tasks':
        headers = ['Task ID', 'Title', 'Student', 'Student Email', 'Coursework', 'Course', 'Group', 'Status', 'Priority', 'Due Date', 'Submitted', 'Created']
        csv = data.map(row => [
          row.id,
          row.title,
          row.user?.full_name,
          row.user?.email,
          row.coursework?.title,
          row.coursework?.course_unit?.code,
          row.group?.name || 'Personal',
          row.status,
          row.priority,
          row.due_date ? formatDate(row.due_date) : 'None',
          row.submitted_at ? formatDate(row.submitted_at) : 'Not submitted',
          formatDate(row.created_at),
        ].map(v => `"${v}"`).join(',')).join('\n')
        break
    }

    csv = headers.join(',') + '\n' + csv
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getColumns = () => {
    switch (reportType) {
      case 'groups':
        return [
          { key: 'name', header: 'Group Name', render: (row: any) => row.name },
          { key: 'course', header: 'Course', render: (row: any) => `${row.coursework?.course_unit?.code} - ${row.coursework?.title}` },
          { key: 'leader', header: 'Leader', render: (row: any) => row.leader?.full_name },
          { key: 'members', header: 'Members', render: (row: any) => `${row.members?.length || 0} / ${row.max_members}` },
          { key: 'status', header: 'Status', render: (row: any) => <Badge variant={row.status === 'active' ? 'success' : row.status === 'forming' ? 'warning' : 'secondary'}>{row.status}</Badge> },
          { key: 'visibility', header: 'Visibility', render: (row: any) => <Badge variant={row.is_private ? 'secondary' : 'primary'}>{row.is_private ? 'Private' : 'Public'}</Badge> },
          { key: 'created', header: 'Created', render: (row: any) => formatDate(row.created_at) },
        ]
      case 'students':
        return [
          { key: 'full_name', header: 'Full Name', render: (row: any) => row.full_name },
          { key: 'email', header: 'Email', render: (row: any) => row.email },
          { key: 'reg_number', header: 'Reg Number', render: (row: any) => row.student_registration_number },
          { key: 'course', header: 'Course', render: (row: any) => row.course },
          { key: 'whatsapp', header: 'WhatsApp', render: (row: any) => row.whatsapp_phone },
          { key: 'created', header: 'Registered', render: (row: any) => formatDate(row.created_at) },
        ]
      case 'coursework':
        return [
          { key: 'title', header: 'Title', render: (row: any) => row.title },
          { key: 'course', header: 'Course', render: (row: any) => `${row.course_unit?.code} - ${row.course_unit?.name}` },
          { key: 'type', header: 'Type', render: (row: any) => <Badge variant="secondary">{row.type}</Badge> },
          { key: 'group_size', header: 'Group Size', render: (row: any) => `${row.min_group_size}-${row.max_group_size}` },
          { key: 'published', header: 'Status', render: (row: any) => row.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge> },
          { key: 'lock_at', header: 'Lock Date', render: (row: any) => row.lock_at ? formatDate(row.lock_at) : 'None' },
        ]
      case 'tasks':
        return [
          { key: 'title', header: 'Task', render: (row: any) => row.title },
          { key: 'student', header: 'Student', render: (row: any) => row.user?.full_name },
          { key: 'coursework', header: 'Coursework', render: (row: any) => row.coursework?.title },
          { key: 'course', header: 'Course', render: (row: any) => row.coursework?.course_unit?.code },
          { key: 'group', header: 'Group', render: (row: any) => row.group?.name || 'Personal' },
          { key: 'status', header: 'Status', render: (row: any) => <Badge variant={row.status === 'completed' || row.status === 'submitted' ? 'success' : row.status === 'in_progress' ? 'primary' : 'secondary'}>{row.status}</Badge> },
          { key: 'priority', header: 'Priority', render: (row: any) => <Badge variant={row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'secondary'}>{row.priority}</Badge> },
          { key: 'due_date', header: 'Due', render: (row: any) => row.due_date ? formatDate(row.due_date) : 'None' },
        ]
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Export & Reports</h1>
          <p className="text-text-secondary">Generate and export reports for administrative tracking</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full">
            <Select
              value={reportType}
              onChange={(value) => setReportType(value as typeof reportType)}
              options={[
                { value: 'groups', label: 'Groups Report' },
                { value: 'students', label: 'Students Report' },
                { value: 'coursework', label: 'Coursework Report' },
                { value: 'tasks', label: 'Tasks Report' },
              ]}
              className="w-full sm:w-48"
            />
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              placeholder="From Date"
              className="w-full sm:w-40"
            />
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              placeholder="To Date"
              className="w-full sm:w-40"
            />
            <Select
              value={courseworkFilter}
              onChange={setCourseworkFilter}
              options={[
                { value: 'all', label: 'All Coursework' },
                ...courseworks.map(cw => ({ value: cw.id, label: `${cw.course_unit?.code} - ${cw.title}` })),
              ]}
              className="w-full sm:w-56"
              disabled={reportType === 'students'}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleGenerate} loading={generating} className="w-full sm:w-auto">
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={data.length === 0} className="w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Preview ({data.length} records)</CardTitle>
          <Badge variant="primary">{reportType}</Badge>
        </CardHeader>
        <CardContent>
          {loading || generating ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse h-10 bg-secondary/20 rounded" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-text-muted text-center py-8">Generate a report to see preview</p>
          ) : (
            <DataTable
              columns={getColumns()}
              data={data}
              keyExtractor={(row) => row.id}
              loading={false}
              emptyMessage="No data for selected filters"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}