'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Users, BookOpen, Target, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, ArrowRight, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'
import { isLocalDataMode, subscribeLocalData } from '@/lib/local-data'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'danger'
  href?: string
}

function MetricCard({ title, value, change, changeType = 'neutral', icon, color, href }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  }

  const content = (
    <Card className={cn(href && 'transition-all hover:border-primary/40 hover:shadow-md cursor-pointer')}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
            {change && (
              <div className="mt-1 flex items-center gap-1">
                {changeType === 'increase' && <ArrowUpRight className="h-4 w-4 text-success" />}
                {changeType === 'decrease' && <ArrowDownRight className="h-4 w-4 text-danger" />}
                <p className={cn('text-sm font-medium', {
                  'text-success': changeType === 'increase',
                  'text-danger': changeType === 'decrease',
                  'text-text-muted': changeType === 'neutral',
                })}>
                  {change}
                </p>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

export function CoordinatorDashboard() {
  const { user } = useAuth()
  const supabase = createClient()
  const [metrics, setMetrics] = useState({
    activeCourseUnits: 0,
    totalStudents: 0,
    totalGroups: 0,
    groupFormationRate: 0,
    unassignedStudents: 0,
    pendingJoinRequests: 0,
  })
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [recentGroups, setRecentGroups] = useState<any[]>([])
  const [recentCourseworks, setRecentCourseworks] = useState<any[]>([])
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([])
  const [dataVersion, setDataVersion] = useState(0)

  useEffect(() => {
    if (!isLocalDataMode()) return
    return subscribeLocalData(() => setDataVersion((version) => version + 1))
  }, [])

  useEffect(() => {
    fetchMetrics()
    fetchRecentData()
  }, [user, dataVersion])

  async function fetchMetrics() {
    try {
      const [unitsRes, studentsRes, groupsRes, membersRes, requestsRes] = await Promise.all([
        supabase.from('course_units').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('groups').select('id', { count: 'exact' }).in('status', ['forming', 'active']),
        supabase.from('group_members').select('user_id, groups!inner(status)').in('groups.status', ['forming', 'active']),
        supabase.from('group_join_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      ])

      const queryError = unitsRes.error || studentsRes.error || groupsRes.error || membersRes.error || requestsRes.error
      if (queryError) throw queryError

      const activeCourseUnits = unitsRes.count || 0
      const totalStudents = studentsRes.count || 0
      const totalGroups = groupsRes.count || 0
      const groupedStudents = new Set(membersRes.data?.map((m: { user_id: string }) => m.user_id) || []).size
      const groupFormationRate = totalStudents > 0 ? Math.round((groupedStudents / totalStudents) * 100) : 0
      const unassignedStudents = totalStudents - groupedStudents
      const pendingJoinRequests = requestsRes.count || 0

      setMetrics({
        activeCourseUnits,
        totalStudents,
        totalGroups,
        groupFormationRate,
        unassignedStudents,
        pendingJoinRequests,
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
      setDataError(error instanceof Error ? error.message : 'Unable to load coordinator metrics from Supabase.')
    }
  }

  async function fetchRecentData() {
    try {
      const [groupsRes, courseworksRes, unassignedRes] = await Promise.all([
        supabase
          .from('groups')
          .select(`
            *,
            coursework:courseworks(title, course_unit:course_units(code)),
            leader:users!groups_leader_id_fkey(full_name),
            members:group_members(count)
          `)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('courseworks')
          .select(`
            *,
            course_unit:course_units(code),
            groups:groups(count)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('users')
          .select('id, full_name, email, student_registration_number, course, whatsapp_phone')
          .eq('role', 'student')
          .limit(10),
      ])

      const queryError = groupsRes.error || courseworksRes.error || unassignedRes.error
      if (queryError) throw queryError

      setRecentGroups(groupsRes.data || [])
      setRecentCourseworks(courseworksRes.data || [])

      const groupedStudentIds = new Set(
        (await supabase.from('group_members').select('user_id, groups!inner(status)').in('groups.status', ['forming', 'active'])).data?.map((m: { user_id: string }) => m.user_id) || []
      )
      const unassigned = (unassignedRes.data || []).filter((s: { id: string }) => !groupedStudentIds.has(s.id))
      setUnassignedStudents(unassigned)
    } catch (error) {
      console.error('Error fetching recent data:', error)
      setDataError(error instanceof Error ? error.message : 'Unable to load coordinator data from Supabase.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-secondary/20 rounded w-3/4" />
                  <div className="h-8 bg-secondary/20 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dataError && (
        <div className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm text-danger" role="alert">
          Unable to load live dashboard data: {dataError}
        </div>
      )}
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary">Coordinator overview</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary sm:text-3xl">Keep every group moving.</h1>
          <p className="mt-1 text-text-secondary">Monitor course activity and resolve the next priority from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/coordinator/coursework">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              New coursework
            </Button>
          </Link>
          <Link href="/coordinator/interventions">
            <Button size="sm">
              Review priorities
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {(metrics.unassignedStudents > 0 || metrics.pendingJoinRequests > 0) && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning-light/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <p className="text-sm text-text-primary">
              <span className="font-semibold">Attention needed:</span>{' '}
              {metrics.unassignedStudents > 0 && `${metrics.unassignedStudents} student${metrics.unassignedStudents === 1 ? '' : 's'} without a group`}
              {metrics.unassignedStudents > 0 && metrics.pendingJoinRequests > 0 && ' and '}
              {metrics.pendingJoinRequests > 0 && `${metrics.pendingJoinRequests} pending join request${metrics.pendingJoinRequests === 1 ? '' : 's'}`}.
            </p>
          </div>
          <Link href="/coordinator/interventions" className="inline-flex items-center gap-1 text-sm font-semibold text-warning hover:underline">
            Open interventions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Active Course Units"
          value={metrics.activeCourseUnits}
          icon={<BookOpen className="h-6 w-6" />}
          color="primary"
        />
        <MetricCard
          title="Total Students"
          value={formatNumber(metrics.totalStudents)}
          icon={<Users className="h-6 w-6" />}
          color="success"
          href="/coordinator/students"
        />
        <MetricCard
          title="Active Groups"
          value={formatNumber(metrics.totalGroups)}
          icon={<Target className="h-6 w-6" />}
          color="warning"
        />
        <MetricCard
          title="Group Formation Rate"
          value={`${metrics.groupFormationRate}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="primary"
        />
        <MetricCard
          title="Unassigned Students"
          value={formatNumber(metrics.unassignedStudents)}
          icon={<AlertCircle className="h-6 w-6" />}
          color="danger"
          href="/coordinator/students?status=orphan"
        />
        <MetricCard
          title="Pending Requests"
          value={formatNumber(metrics.pendingJoinRequests)}
          icon={<AlertCircle className="h-6 w-6" />}
          color="warning"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-5 py-4 sm:px-6">
            <CardTitle>Recent Groups</CardTitle>
            <Badge variant="primary">{recentGroups.length}</Badge>
          </CardHeader>
          <CardContent className="px-5 py-4 sm:px-6">
            {recentGroups.length === 0 ? (
              <p className="text-text-muted text-center py-8">No groups formed yet</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'name', header: 'Group Name', render: (row: any) => (
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-sm text-text-muted">{row.coursework?.course_unit?.code} - {row.coursework?.title}</p>
                    </div>
                  )},
                  { key: 'leader', header: 'Leader', render: (row: any) => row.leader?.full_name || 'Unknown' },
                  { key: 'members', header: 'Members', render: (row: any) => `${row.members?.[0]?.count || 1} / ${row.max_members}` },
                  { key: 'status', header: 'Status', render: (row: any) => <Badge variant={row.status === 'active' ? 'success' : row.status === 'forming' ? 'warning' : 'secondary'}>{row.status}</Badge> },
                  { key: 'actions', header: 'Actions', render: () => <Button variant="ghost" size="sm">View</Button> },
                ]}
                data={recentGroups}
                keyExtractor={(row) => row.id}
                emptyMessage="No recent groups"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-5 py-4 sm:px-6">
            <CardTitle>Unassigned Students</CardTitle>
            <Badge variant="danger">{unassignedStudents.length}</Badge>
          </CardHeader>
          <CardContent className="px-5 py-4 sm:px-6">
            {unassignedStudents.length === 0 ? (
              <p className="text-text-muted text-center py-8">All students are assigned to groups</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {unassignedStudents.slice(0, 10).map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{student.full_name}</p>
                        <p className="text-sm text-text-muted">{student.course} • {student.student_registration_number}</p>
                      </div>
                    </div>
                    <Badge variant="warning">Unassigned</Badge>
                  </div>
                ))}
                {unassignedStudents.length > 10 && (
                  <p className="text-sm text-text-muted text-center mt-2">+{unassignedStudents.length - 10} more students</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-5 py-4 sm:px-6">
          <CardTitle>Recent Coursework</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4 sm:px-6">
          <DataTable
            columns={[
              { key: 'title', header: 'Coursework', render: (row: any) => (
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-text-muted">{row.course_unit?.code}</p>
                </div>
              )},
              { key: 'type', header: 'Type', render: (row: any) => <Badge variant="secondary" dot>{row.type}</Badge> },
              { key: 'groups', header: 'Groups', render: (row: any) => row.groups?.[0]?.count || 0 },
              { key: 'is_published', header: 'Status', render: (row: any) => row.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge> },
              { key: 'lock_at', header: 'Lock Date', render: (row: any) => row.lock_at ? formatDate(row.lock_at) : 'No lock' },
            ]}
            data={recentCourseworks}
            keyExtractor={(row) => row.id}
            emptyMessage="No coursework created yet"
          />
        </CardContent>
      </Card>
    </div>
  )
}