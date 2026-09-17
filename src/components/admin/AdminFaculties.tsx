'use client'

import { useEffect, useState } from 'react'
import { Building2, Pencil, Plus, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function AdminFaculties() {
  const supabase = createClient()
  const [faculties, setFaculties] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', is_active: true })
  const [error, setError] = useState('')

  async function load() {
    const { data, error: queryError } = await supabase.from('faculties').select('id, code, name, is_active').order('name')
    if (queryError) setError(queryError.message)
    setFaculties(data || [])
  }

  useEffect(() => { load() }, [])

  function start(faculty?: any) {
    setEditing(faculty || null)
    setFormOpen(true)
    setForm(faculty ? { code: faculty.code, name: faculty.name, is_active: faculty.is_active } : { code: '', name: '', is_active: true })
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim()) return setError('Faculty code and name are required.')
    const payload = { code: form.code.trim().toUpperCase(), name: form.name.trim(), is_active: form.is_active }
    const result = editing ? await supabase.from('faculties').update(payload).eq('id', editing.id) : await supabase.from('faculties').insert(payload)
    if (result.error) return setError(result.error.message)
    setEditing(null)
    setFormOpen(false)
    await load()
  }

  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Administrator workspace</p><h1 className="mt-2 text-3xl font-black text-text-primary">Faculties</h1><p className="mt-2 text-sm text-text-secondary">Create and maintain faculties without mixing their academic records.</p></div><button onClick={() => start()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add faculty</button></div>{error && <p className="rounded-xl border border-danger/30 bg-danger-light/40 p-3 text-sm text-danger">{error}</p>}{formOpen && <div className="grid gap-3 rounded-2xl border border-emerald-500/30 bg-surface p-5 sm:grid-cols-[180px_1fr_auto_auto] sm:items-end"><label className="text-xs font-bold text-text-secondary">Code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-text-secondary">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label><button onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><Save className="h-4 w-4" />Save</button><button onClick={() => { setEditing(null); setFormOpen(false) }} className="rounded-xl border border-border p-2 text-text-secondary" aria-label="Cancel"><X className="h-4 w-4" /></button></div>}<div className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="divide-y divide-border">{faculties.map((faculty) => <div key={faculty.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Building2 className="h-5 w-5" /></div><div><p className="font-bold text-text-primary">{faculty.name}</p><p className="text-xs text-text-muted">{faculty.code} · {faculty.is_active ? 'Active' : 'Inactive'}</p></div></div><button onClick={() => start(faculty)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold text-text-primary"><Pencil className="h-3.5 w-3.5" />Edit</button></div>)}</div></div></div>
}