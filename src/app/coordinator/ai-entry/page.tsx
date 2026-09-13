'use client'

import { useMemo, useState } from 'react'
import { Bot, KeyRound, Database, Sparkles, Send, ShieldCheck, Eye, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

const providers = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'nvidia', label: 'NVIDIA' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'claude', label: 'Claude' },
]

export default function AICoordinatorEntryPage() {
  const [provider, setProvider] = useState('gemini')
  const [apiKey, setApiKey] = useState('')
  const [prompt, setPrompt] = useState('Import students from spreadsheet and flag duplicates before saving.')
  const [previewOpen, setPreviewOpen] = useState(true)
  const [lastAction, setLastAction] = useState('Awaiting confirmation')

  const summary = useMemo(() => [
    { label: 'Rows detected', value: '0' },
    { label: 'Duplicate matches', value: '0' },
    { label: 'New students', value: '0' },
    { label: 'Changes to log', value: '0' },
  ], [])

  function handlePreview() {
    setLastAction('Preview generated and awaiting approval before write.')
    setPreviewOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/15 bg-primary/[0.04] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">AI operations</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Crimson AI Entry</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            <Bot className="h-4 w-4 text-primary" />
            Faculty-coordinator access only
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">AI configuration</h2>
                <p className="text-sm text-text-secondary">Provider and secure key settings</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select options={providers} value={provider} onChange={setProvider} label="Provider" />
              <Input label="API key" type="password" value={apiKey} placeholder="Enter provider key" onChange={(event) => setApiKey(event.target.value)} icon={<KeyRound className="h-4 w-4" />} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Prompt Crimson</h2>
                <p className="text-sm text-text-secondary">Ask for data import, validation, search, or reports</p>
              </div>
            </div>

            <Textarea
              label="Request"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Summarize all students missing registration numbers and prepare a safe import preview."
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={handlePreview}>
                <Eye className="h-4 w-4" />
                Preview changes
              </Button>
              <Button variant="outline">
                <ShieldCheck className="h-4 w-4" />
                Safe write review
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {summary.map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-surface-hover/60 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-text-primary">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">Audit status</h2>
            <div className="mt-3 rounded-xl border border-success/20 bg-success/5 p-3 text-sm text-success">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {lastAction}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Change preview</h2>
            <p className="text-sm text-text-secondary">AI can only write after review and approval.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen((current) => !current)}>
            {previewOpen ? 'Hide preview' : 'Show preview'}
          </Button>
        </div>

        {previewOpen && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">
            No changes are ready for review. Connect an import source or enter a database query to generate a real preview.
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning-light p-3">
          <p className="text-sm text-warning">AI writes are locked behind a faculty-coordinator approval step and audit log tracking.</p>
          <Button variant="success" size="sm" disabled>
            <Send className="h-4 w-4" />
            Approve write
          </Button>
        </div>
      </div>
    </div>
  )
}
