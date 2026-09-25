'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Users, BookOpen, Target, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, ArrowRight, Plus, BookCopy } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'
import { motion } from 'framer-motion'

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
    primary: 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30',
    success: 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30',
    warning: 'bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30',
    danger: 'bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/30',
  }

  const content = (
    <Card hover={Boolean(href)} className="group">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">{title}</p>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-text-primary tracking-tight">{value}</p>
            {change && (
              <div className="mt-1.5 flex items-center gap-1">
                {changeType === 'increase' && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                {changeType === 'decrease' && <ArrowDownRight className="h-4 w-4 text-rose-500" />}
                <p
                  className={cn('text-xs font-semibold', {
                    'text-emerald-500': changeType === 'increase',
                    'text-rose-500': changeType === 'decrease',
                    'text-text-muted': changeType === 'neutral',
                  })}
                >
                  {change}
                </p>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-2xl shrink-0', colorClasses[color])}>{icon}</div>
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
    totalCourses: 0,
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
  const [dataVersion] = useState(0)

  useEffect(() => {
    fetchMetrics()
    fetchRecentData()
  }, [user, dataVersion])

  async function fetchMetrics() {
    try {
      const [unitsRes, coursesRes, studentsRes, groupsRes, membersRes, requestsRes] = await Promise.all([
        supabase.from('course_units').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('courses').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('groups').select('id', { count: 'exact' }).in('status', ['forming', 'active']),
        supabase.from('group_members').select('user_id, groups!inner(status)').in('groups.status', ['forming', 'active']),
        supabase.from('group_join_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      ])

      const queryError = unitsRes.error || coursesRes.error || studentsRes.error || groupsRes.error || membersRes.error || requestsRes.error
      if (queryError) throw queryError

      const activeCourseUnits = unitsRes.count || 0
      const totalCourses = coursesRes.count || 0
      const totalStudents = studentsRes.count || 0
      const totalGroups = groupsRes.count || 0
      const groupedStudents = new Set(membersRes.data?.map((m: { user_id: string }) => m.user_id) || []).size
      const groupFormationRate = totalStudents > 0 ? Math.round((groupedStudents / totalStudents) * 100) : 0
      const unassignedStudents = totalStudents - groupedStudents
      const pendingJoinRequests = requestsRes.count || 0

      setMetrics({
        activeCourseUnits,
        totalCourses,
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {dataError && (
        <div className="rounded-2xl border border-danger/20 bg-danger-light p-4 text-xs font-semibold text-danger" role="alert">
          Unable to load live dashboard data: {dataError}
        </div>
      )}

      {/* Header Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/20 via-teal-900/10 to-surface/90 p-6 sm:p-8 shadow-xl backdrop-blur-2xl"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 backdrop-blur-md mb-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Coordinator Center · Real-Time Supervision</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-4xl">
              Keep every group moving <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">forward</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-text-secondary font-medium max-w-xl">
              Monitor course activity, auto-assign unassigned students, track lock dates, and supervise academic performance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/coordinator/coursework">
              <Button variant="outline" size="sm" className="border-emerald-500/30 hover:border-emerald-500/60 shadow-xs">
                <Plus className="h-4 w-4 mr-1.5 text-emerald-500" />
                New Coursework
              </Button>
            </Link>
            <Link href="/coordinator/groups">
              <Button size="sm" className="bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 border-0">
                Review Groups
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Attention Alert */}
      {(metrics.unassignedStudents > 0 || metrics.pendingJoinRequests > 0) && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-light/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning animate-pulse" />
            <p className="text-xs font-semibold text-text-primary leading-relaxed">
              <span className="font-extrabold text-warning">Attention Needed:</span>{' '}
              {metrics.unassignedStudents > 0 && `${metrics.unassignedStudents} student${metrics.unassignedStudents === 1 ? '' : 's'} without a group`}
              {metrics.unassignedStudents > 0 && metrics.pendingJoinRequests > 0 && ' and '}
              {metrics.pendingJoinRequests > 0 && `${metrics.pendingJoinRequests} pending join request${metrics.pendingJoinRequests === 1 ? '' : 's'}`}.
            </p>
          </div>
          <Link href="/coordinator/groups" className="inline-flex items-center gap-1 text-xs font-bold text-warning hover:underline">
            Open groups
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}

      {/* Metric Cards Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active Course Units" value={metrics.activeCourseUnits} icon={<BookOpen className="h-6 w-6" />} color="primary" href="/coordinator/course-units" />
        <MetricCard title="Available Courses" value={formatNumber(metrics.totalCourses)} icon={<BookCopy className="h-6 w-6" />} color="success" href="/coordinator/courses" />
        <MetricCard title="Total Students" value={formatNumber(metrics.totalStudents)} icon={<Users className="h-6 w-6" />} color="success" href="/coordinator/students" />
        <MetricCard title="Active Groups" value={formatNumber(metrics.totalGroups)} icon={<Target className="h-6 w-6" />} color="warning" />
        <MetricCard title="Formation Rate" value={`${metrics.groupFormationRate}%`} icon={<TrendingUp className="h-6 w-6" />} color="primary" />
        <MetricCard title="Unassigned Students" value={formatNumber(metrics.unassignedStudents)} icon={<AlertCircle className="h-6 w-6" />} color="danger" href="/coordinator/students?status=orphan" />
        <MetricCard title="Pending Requests" value={formatNumber(metrics.pendingJoinRequests)} icon={<AlertCircle className="h-6 w-6" />} color="warning" />
      </motion.div>

      {/* Tables Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
            <CardTitle>Recent Groups</CardTitle>
            <Badge variant="primary">{recentGroups.length}</Badge>
          </CardHeader>
          <CardContent className="px-6 py-4">
            {recentGroups.length === 0 ? (
              <p className="text-text-muted text-center py-10 text-xs">No groups formed yet</p>
            ) : (
              <DataTable
                columns={[
                  {
                    key: 'name',
                    header: 'Group Name',
                    render: (row: any) => (
                      <div>
                        <p className="font-bold text-sm text-text-primary">{row.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {row.coursework?.course_unit?.code} - {row.coursework?.title}
                        </p>
                      </div>
                    ),
                  },
                  { key: 'leader', header: 'Leader', render: (row: any) => row.leader?.full_name || 'Unknown' },
                  { key: 'members', header: 'Members', render: (row: any) => `${row.members?.[0]?.count || 1} / ${row.max_members}` },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row: any) => (
                      <Badge variant={row.status === 'active' ? 'success' : row.status === 'forming' ? 'warning' : 'secondary'} dot>
                        {row.status}
                      </Badge>
                    ),
                  },
                ]}
                data={recentGroups}
                keyExtractor={(row) => row.id}
                emptyMessage="No recent groups"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
            <CardTitle>Unassigned Students</CardTitle>
            <Badge variant="danger">{unassignedStudents.length}</Badge>
          </CardHeader>
          <CardContent className="px-6 py-4">
            {unassignedStudents.length === 0 ? (
              <p className="text-text-muted text-center py-10 text-xs font-medium">All students are assigned to groups</p>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto scrollbar-thin">
                {unassignedStudents.slice(0, 10).map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-surface hover:bg-surface-hover/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary-light flex items-center justify-center text-primary font-bold">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-text-primary">{student.full_name}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {student.course} • {student.student_registration_number}
                        </p>
                      </div>
                    </div>
                    <Badge variant="warning" dot>
                      Unassigned
                    </Badge>
                  </div>
                ))}
                {unassignedStudents.length > 10 && (
                  <p className="text-xs text-text-muted text-center mt-2 font-medium">+{unassignedStudents.length - 10} more students</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Coursework Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle>Recent Coursework</CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-4">
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Coursework',
                  render: (row: any) => (
                    <div>
                      <p className="font-bold text-sm text-text-primary">{row.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{row.course_unit?.code}</p>
                    </div>
                  ),
                },
                { key: 'type', header: 'Type', render: (row: any) => <Badge variant="secondary" dot>{row.type}</Badge> },
                { key: 'groups', header: 'Groups', render: (row: any) => row.groups?.[0]?.count || 0 },
                { key: 'is_published', header: 'Status', render: (row: any) => (row.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge>) },
                { key: 'lock_at', header: 'Lock Date', render: (row: any) => (row.lock_at ? formatDate(row.lock_at) : 'No lock') },
              ]}
              data={recentCourseworks}
              keyExtractor={(row) => row.id}
              emptyMessage="No coursework created yet"
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}