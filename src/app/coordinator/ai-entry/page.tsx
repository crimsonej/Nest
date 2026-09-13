'use client'

import { useState } from 'react'
import { Bot, KeyRound, Database, Sparkles, Send, ShieldCheck, Eye, CheckCircle2, AlertTriangle, UserCheck, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'

const providers = [
  { value: 'gemini', label: 'Google Gemini (Default)' },
  { value: 'nvidia', label: 'NVIDIA AI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'claude', label: 'Anthropic Claude' },
]

interface Message {
  id: string
  sender: 'user' | 'crimson'
  text: string
  timestamp: string
}

export default function AICoordinatorEntryPage() {
  const [provider, setProvider] = useState('gemini')
  const [apiKey, setApiKey] = useState('')
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'crimson',
      text: 'Greetings Coordinator! I am Crimson, your NEST AI Data Agent. Paste student list data, spreadsheets, or ask queries about Ndejje University rosters. I will validate reg numbers, prevent duplicate records, and present a live preview before committing changes.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ])
  const [loading, setLoading] = useState(false)
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalDetected: 0, newRecords: 0, duplicates: 0 })
  const [commitStatus, setCommitStatus] = useState('')
  const [committing, setCommitting] = useState(false)

  async function handleSendPrompt() {
    if (!inputText.trim()) return

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages((prev) => [...prev, userMsg])
    const currentInput = inputText
    setInputText('')
    setLoading(true)

    try {
      const res = await fetch('/api/coordinator/ai-entry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          prompt: currentInput,
          provider,
          apiKey,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process AI query')

      setPreviewRows(data.rows || [])
      setSummary(data.summary || { totalDetected: 0, newRecords: 0, duplicates: 0 })

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'crimson',
        text: `I processed your input. Detected ${data.summary.totalDetected} records: ${data.summary.newRecords} new valid students ready to insert, and ${data.summary.duplicates} duplicate records flagged for skipping. Review the preview table below and click "Approve & Commit to DB" to write to the system.`,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'crimson',
        text: `Error: ${err instanceof Error ? err.message : 'Unable to parse AI request.'}`,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  async function handleCommit() {
    setCommitting(true)
    setCommitStatus('')

    try {
      const res = await fetch('/api/coordinator/ai-entry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          rows: previewRows,
          provider,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Commit failed')

      setCommitStatus(data.message)
      setPreviewRows([])
      setSummary({ totalDetected: 0, newRecords: 0, duplicates: 0 })

      const aiMsg: Message = {
        id: String(Date.now()),
        sender: 'crimson',
        text: `Database write completed! ${data.committedCount} new student profiles have been added to the system and logged in the Security Audit Trail.`,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      setCommitStatus(`Error during DB write: ${err instanceof Error ? err.message : 'Write error'}`)
    } finally {
      setCommitting(false)
    }
  }

  const columns = [
    { key: 'full_name', header: 'Student Name' },
    { key: 'student_registration_number', header: 'Reg Number' },
    { key: 'email', header: 'Email' },
    { key: 'gender', header: 'Gender' },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <Badge variant={row.status === 'valid_new' ? 'success' : row.status === 'duplicate_skipped' ? 'warning' : 'danger'}>
          {row.status === 'valid_new' ? 'Valid New' : row.status === 'duplicate_skipped' ? 'Duplicate (Skip)' : 'Invalid Reg'}
        </Badge>
      ),
    },
    { key: 'notes', header: 'AI Validation Notes' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/15 bg-primary/[0.04] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Faculty Intelligence Engine</p>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">Crimson AI Entry Agent</h1>
            <p className="text-xs text-text-muted mt-1">Ndejje University - Kampala Campus Data Management</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface px-4 py-2 text-xs font-semibold text-primary shadow-sm">
            <Bot className="h-4 w-4" />
            Faculty Coordinator Access Granted
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary">AI Provider & Credentials</h2>
                <p className="text-xs text-text-muted">Configure API provider key for Crimson agent</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select options={providers} value={provider} onChange={setProvider} label="AI Provider" />
              <Input
                label="API Key (Optional / Dev Override)"
                type="password"
                value={apiKey}
                placeholder="Paste API key or use system default"
                onChange={(event) => setApiKey(event.target.value)}
                icon={<KeyRound className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <Bot className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-text-primary">Crimson AI Agent Workspace</h2>
              </div>
              <Badge variant="primary">Active Agent</Badge>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 p-3.5 rounded-2xl text-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary/10 border border-primary/20 ml-8'
                      : 'bg-surface-hover/80 border border-border mr-8'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {msg.sender === 'user' ? (
                      <div className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">U</div>
                    ) : (
                      <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
                      <span className="font-semibold">{msg.sender === 'user' ? 'You (Coordinator)' : 'Crimson Agent'}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste CSV rows, student names & reg numbers (e.g. 26/2/299/D/2299), or ask Crimson to generate a report..."
                className="min-h-[90px]"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInputText('Mariam Nansubuga, 26/2/250/D/2250, female, female@nest.edu\nJoshua Mugisha, 26/2/251/D/2251, male, male@nest.edu')}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                    Load Sample Roster
                  </Button>
                </div>

                <Button onClick={handleSendPrompt} loading={loading} disabled={!inputText.trim()}>
                  <Send className="h-4 w-4 mr-1.5" />
                  Process & Preview
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-base font-semibold text-text-primary border-b border-border pb-3 mb-4">Inspection Metrics</h2>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-xl border border-border bg-surface-hover p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-text-muted">Total Detected</p>
                <p className="mt-1 text-2xl font-bold text-text-primary">{summary.totalDetected}</p>
              </div>
              <div className="rounded-xl border border-success/30 bg-success/5 p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-success">New Valid Records</p>
                <p className="mt-1 text-2xl font-bold text-success">{summary.newRecords}</p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-warning">Duplicates Flagged</p>
                <p className="mt-1 text-2xl font-bold text-warning">{summary.duplicates}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
            <h2 className="text-base font-semibold text-text-primary border-b border-border pb-3">Security & Audit Policy</h2>
            <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Ndejje University reg number regex pattern (`26/2/222/D/2222`) is automatically enforced.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Duplicate emails and registration numbers are filtered out automatically to maintain database integrity.</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span>All writes require explicit coordinator review and generate entries in `audit_logs`.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewRows.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Staging Preview & Validation Roster</h2>
              <p className="text-xs text-text-muted">Review detected rows before approving database commit</p>
            </div>

            <Button variant="success" onClick={handleCommit} loading={committing} disabled={summary.newRecords === 0}>
              <Send className="h-4 w-4 mr-1.5" />
              Approve & Commit {summary.newRecords} Records to DB
            </Button>
          </div>

          {commitStatus && (
            <div className={`p-3.5 rounded-xl border text-sm ${commitStatus.includes('Error') ? 'border-danger/30 bg-danger/10 text-danger' : 'border-success/30 bg-success/10 text-success'}`}>
              {commitStatus}
            </div>
          )}

          <DataTable
            columns={columns}
            data={previewRows}
            keyExtractor={(row: any) => `${row.email}-${row.student_registration_number || Math.random()}`}
            loading={false}
            emptyMessage="No rows in preview stage"
          />

        </div>
      )}
    </div>
  )
}

