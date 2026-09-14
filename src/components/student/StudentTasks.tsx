'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Clock3, ListChecks, LockKeyhole } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

function daysUntil(date: string) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000))
}

export function StudentTasks() {
  const { user } = useAuth()
  const supabase = createClient()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dataVersion, setDataVersion] = useState(0)

  useEffect(() => {
    async function loadTasks() {
      if (!user) return
      setLoading(true)
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true })
      setTasks(data || [])
      setLoading(false)
    }
    loadTasks()
  }, [user, dataVersion])

  async function toggleTask(task: any) {
    if (!task.due_date || new Date(task.due_date) <= new Date()) return
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed'
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id).eq('user_id', user?.id)
  }

  const activeTasks = tasks.filter((task) => task.status !== 'completed' && (!task.due_date || new Date(task.due_date) > new Date()))
  const nearestTask = activeTasks.find((task) => task.due_date)

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Your academic rhythm</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Tasks & deadlines</h1>
          <p className="mt-2 max-w-xl text-text-secondary">Keep the small commitments visible so the bigger group work stays calm.</p>
        </div>
        <Link href="/student/coursework"><Button variant="outline"><ListChecks className="h-4 w-4" />Browse coursework</Button></Link>
      </div>

      <section className="overflow-hidden rounded-2xl bg-[#20312d] p-6 text-[#f4f1e9] shadow-xl shadow-[#20312d]/10 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f0a35b]">Next on your desk</p>
            <h2 className="mt-4 text-2xl font-semibold">{nearestTask?.title || 'Nothing urgent yet'}</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#bdcbc1]">{nearestTask?.description || 'When a coordinator publishes a task, your next deadline will appear here.'}</p>
          </div>
          <Clock3 className="h-7 w-7 shrink-0 text-[#f0a35b]" />
        </div>
        {nearestTask && <div className="mt-8 flex items-end justify-between border-t border-white/10 pt-5"><div><p className="text-4xl font-semibold">{daysUntil(nearestTask.due_date)}</p><p className="text-sm text-[#bdcbc1]">days remaining</p></div><p className="text-sm text-[#bdcbc1]">Due {formatDate(nearestTask.due_date)}</p></div>}
      </section>

      <div className="grid gap-6 xl:grid-cols-1">
        <TaskList title="Active work" tasks={activeTasks} loading={loading} onToggle={toggleTask} />
      </div>
    </div>
  )
}

function TaskList({ title, tasks, loading, onToggle, past = false }: { title: string; tasks: any[]; loading: boolean; onToggle: (task: any) => void; past?: boolean }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{title}</CardTitle><Badge variant={past ? 'secondary' : 'primary'}>{tasks.length}</Badge></CardHeader><CardContent className="space-y-3">
    {loading ? <div className="h-20 animate-pulse rounded-xl bg-surface-hover" /> : tasks.length === 0 ? <p className="py-8 text-center text-sm text-text-muted">No tasks in this list.</p> : tasks.map((task) => { const locked = past || !task.due_date || new Date(task.due_date) <= new Date(); return <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-surface-hover"><button type="button" onClick={() => onToggle(task)} disabled={locked} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${task.status === 'completed' ? 'border-success bg-success text-white' : 'border-border text-transparent'} ${locked && task.status !== 'completed' ? 'cursor-not-allowed bg-surface-hover' : ''}`} aria-label={task.status === 'completed' ? 'Mark task incomplete' : 'Mark task complete'}>{task.status === 'completed' ? <Check className="h-4 w-4" /> : locked ? <LockKeyhole className="h-4 w-4 text-text-muted" /> : <Check className="h-4 w-4" />}</button><div className="min-w-0 flex-1"><p className={`font-medium text-text-primary ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>{task.title}</p><p className="mt-1 truncate text-sm text-text-muted">{task.description}</p></div><div className="shrink-0 text-right"><Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'secondary'}>{task.priority}</Badge><p className="mt-2 text-xs text-text-muted">{task.due_date ? formatDate(task.due_date) : 'No deadline'}</p></div></div> })}
  </CardContent></Card>
}