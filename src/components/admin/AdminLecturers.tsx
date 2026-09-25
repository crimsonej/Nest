'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCheck,
  UserPlus,
  Trash2,
  KeyRound,
  Search,
  Building2,
  BookOpen,
  Mail,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Users,
  Lock,
} from 'lucide-react'

interface Faculty {
  id: string
  name: string
  code: string
}

interface CourseUnit {
  id: string
  name: string
  code: string
  faculty_id?: string
  lecturer_id?: string
}

interface Lecturer {
  id: string
  name: string
  email: string
  phone_number?: string
  faculty_id?: string
  course_unit_id?: string
  temp_password?: string
  must_change_password?: boolean
  created_at: string
  faculties?: Faculty
  course_units?: CourseUnit
}

export function AdminLecturers() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('all')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [targetLecturer, setTargetLecturer] = useState<Lecturer | null>(null)

  // Add Form state
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    faculty_id: '',
    course_unit_id: '',
    password: 'Lecturer123!',
  })
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Reset Password state
  const [resetPassword, setResetPassword] = useState('Lecturer123!')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [submittingReset, setSubmittingReset] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  // Delete state
  const [submittingDelete, setSubmittingDelete] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/lecturers')
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch lecturers data')
      }
      const data = await res.json()
      setLecturers(data.lecturers || [])
      setFaculties(data.faculties || [])
      setCourseUnits(data.courseUnits || [])
    } catch (err: any) {
      setError(err.message || 'Error loading lecturers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Filtered Lecturers
  const filteredLecturers = lecturers.filter((lect) => {
    const matchesSearch =
      lect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lect.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lect.course_units?.code && lect.course_units.code.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesFaculty =
      selectedFacultyFilter === 'all' || lect.faculty_id === selectedFacultyFilter

    return matchesSearch && matchesFaculty
  })

  // Open Add Modal
  function openAddModal() {
    setAddForm({
      name: '',
      email: '',
      faculty_id: faculties[0]?.id || '',
      course_unit_id: '',
      password: 'Lecturer123!',
    })
    setIsAddModalOpen(true)
    setError(null)
  }

  // Handle Add Submit
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setSubmittingAdd(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/lecturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create lecturer profile.')

      setSuccessMessage(`Lecturer profile created successfully for ${addForm.name}!`)
      setIsAddModalOpen(false)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to create lecturer profile.')
    } finally {
      setSubmittingAdd(false)
    }
  }

  // Open Reset Password Modal
  function openResetModal(lecturer: Lecturer) {
    setTargetLecturer(lecturer)
    setResetPassword('Lecturer123!')
    setIsResetModalOpen(true)
    setCopiedKey(false)
    setError(null)
  }

  // Handle Reset Submit
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetLecturer || !resetPassword.trim()) return

    setSubmittingReset(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/lecturers/reset-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecturer_id: targetLecturer.id,
          password: resetPassword.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.')

      setSuccessMessage(`Default password reset to "${resetPassword.trim()}" for ${targetLecturer.name}.`)
      setIsResetModalOpen(false)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.')
    } finally {
      setSubmittingReset(false)
    }
  }

  // Open Delete Modal
  function openDeleteModal(lecturer: Lecturer) {
    setTargetLecturer(lecturer)
    setIsDeleteModalOpen(true)
    setError(null)
  }

  // Handle Delete Submit
  async function handleDeleteSubmit() {
    if (!targetLecturer) return

    setSubmittingDelete(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/lecturers?id=${targetLecturer.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove lecturer profile.')

      setSuccessMessage(`Lecturer profile for ${targetLecturer.name} has been removed.`)
      setIsDeleteModalOpen(false)
      setTargetLecturer(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to remove lecturer.')
    } finally {
      setSubmittingDelete(false)
    }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#'
    let result = ''
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <Shield className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
              Administrator Platform
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Lecturer <span className="bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent">Management</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary max-w-2xl">
              Create lecturer profiles in Supabase, assign faculties & course units, set initial login credentials, and perform default password resets.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:from-rose-700 hover:to-amber-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add New Lecturer</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="p-1 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {error && !isAddModalOpen && !isResetModalOpen && !isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between rounded-2xl border border-danger/30 bg-danger-light/40 p-4 text-danger shadow-lg"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-1 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Total Lecturers</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-text-primary">{lecturers.length}</p>
          <p className="mt-1 text-xs text-text-muted">Active profiles in Supabase</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Assigned Course Units</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-text-primary">
            {lecturers.filter((l) => l.course_unit_id).length}
          </p>
          <p className="mt-1 text-xs text-text-muted">Teaching active units</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Default Password Active</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-text-primary">
            {lecturers.filter((l) => l.must_change_password !== false).length}
          </p>
          <p className="mt-1 text-xs text-text-muted">Awaiting first login password change</p>
        </div>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by lecturer name, email or course code..."
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-text-muted" />
            <select
              value={selectedFacultyFilter}
              onChange={(e) => setSelectedFacultyFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="all">All Faculties</option>
              {faculties.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            title="Refresh list"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lecturers Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
            <p className="text-sm font-medium text-text-secondary">Loading lecturer profiles from Supabase...</p>
          </div>
        ) : filteredLecturers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">No Lecturers Found</h3>
            <p className="mt-1 text-sm text-text-muted max-w-sm">
              {searchQuery || selectedFacultyFilter !== 'all'
                ? 'No lecturer profiles matched your search or faculty filter.'
                : 'Click "Add New Lecturer" to create a new lecturer profile in Supabase.'}
            </p>
            {!searchQuery && selectedFacultyFilter === 'all' && (
              <button
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" /> Add Lecturer Profile
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-primary">
              <thead className="border-b border-border bg-background/50 text-xs font-bold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-6 py-4">Lecturer Profile</th>
                  <th className="px-6 py-4">Faculty</th>
                  <th className="px-6 py-4">Assigned Course Unit</th>
                  <th className="px-6 py-4">Default Password</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLecturers.map((lecturer) => (
                  <tr key={lecturer.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 font-bold shrink-0">
                          {lecturer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">{lecturer.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                            <Mail className="h-3 w-3" />
                            <span>{lecturer.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {lecturer.faculties ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-text-secondary">
                            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                            {lecturer.faculties.name} ({lecturer.faculties.code})
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {lecturer.course_units ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary text-xs">
                            {lecturer.course_units.name}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {lecturer.course_units.code}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted italic">No course unit assigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {lecturer.temp_password ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg w-fit border border-amber-500/20">
                            <KeyRound className="h-3 w-3 shrink-0" />
                            <span>{lecturer.temp_password}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted font-mono">••••••••</span>
                        )}
                        <span className="text-[10px] text-text-muted">
                          {lecturer.must_change_password !== false ? 'Requires first-login update' : 'Password verified'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Reset Password Button */}
                        <button
                          onClick={() => openResetModal(lecturer)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                          title="Reset lecturer password to default password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Reset Password</span>
                        </button>

                        {/* Remove Button */}
                        <button
                          onClick={() => openDeleteModal(lecturer)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger-light/20 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20 transition-colors"
                          title="Remove lecturer profile"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD LECTURER MODAL --- */}
      <AnimatePresence>
        {isAddModalOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">Add New Lecturer</h2>
                    <p className="text-xs text-text-muted">Create a Supabase lecturer profile & credentials</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-border p-2 text-text-muted hover:bg-surface-hover transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-danger/30 bg-danger-light/30 p-3 text-xs text-danger flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Lecturer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Dr. Jane Smith"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Login Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="e.g. j.smith@university.ac.ug"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <p className="mt-1 text-[11px] text-text-muted">The lecturer will use this email to log in to NEST.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Faculty
                    </label>
                    <select
                      value={addForm.faculty_id}
                      onChange={(e) => setAddForm({ ...addForm, faculty_id: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="">Select Faculty</option>
                      {faculties.map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name} ({fac.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Lecturing Course Unit
                    </label>
                    <select
                      value={addForm.course_unit_id}
                      onChange={(e) => setAddForm({ ...addForm, course_unit_id: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="">Select Course Unit</option>
                      {courseUnits.map((cu) => (
                        <option key={cu.id} value={cu.id}>
                          {cu.code} - {cu.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Default Login Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, password: generateRandomPassword() })}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                    >
                      <Sparkles className="h-3 w-3" /> Generate Random
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      placeholder="e.g. Lecturer123!"
                      className="w-full rounded-xl border border-border bg-background pl-3.5 pr-10 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    This default password allows fast initial login. The lecturer will be prompted to change it.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {submittingAdd ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Creating Profile...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Create Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* --- RESET PASSWORD MODAL --- */}
      <AnimatePresence>
        {isResetModalOpen && targetLecturer && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsResetModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Reset Lecturer Password</h2>
                    <p className="text-xs text-text-muted">Choose a default login password</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="rounded-xl border border-border p-2 text-text-muted hover:bg-surface-hover transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-danger/30 bg-danger-light/30 p-3 text-xs text-danger flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Target Profile</p>
                <p className="mt-1 font-extrabold text-text-primary">{targetLecturer.name}</p>
                <p className="text-xs text-text-secondary">{targetLecturer.email}</p>
              </div>

              <form onSubmit={handleResetSubmit} className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                      New Default Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setResetPassword(generateRandomPassword())}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:underline"
                    >
                      <Sparkles className="h-3 w-3" /> Generate Random
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="e.g. Lecturer123!"
                      className="w-full rounded-xl border border-border bg-background pl-3.5 pr-10 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface-hover/60 p-3 text-xs">
                  <span className="font-mono text-text-secondary">{resetPassword}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetPassword)
                      setCopiedKey(true)
                      setTimeout(() => setCopiedKey(false), 2000)
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReset}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {submittingReset ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Resetting...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" /> Set Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* --- REMOVE LECTURER MODAL --- */}
      <AnimatePresence>
        {isDeleteModalOpen && targetLecturer && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsDeleteModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-2xl z-10"
            >
              <div className="flex items-center gap-3 text-danger mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-light/30 text-danger">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Remove Lecturer Profile</h2>
                  <p className="text-xs text-text-muted">Delete profile from Supabase</p>
                </div>
              </div>

              <p className="text-sm text-text-secondary">
                Are you sure you want to remove <strong className="text-text-primary">{targetLecturer.name}</strong> ({targetLecturer.email})?
              </p>
              <p className="mt-2 text-xs text-text-muted bg-danger-light/20 border border-danger/20 p-3 rounded-xl">
                This action will delete their Supabase Auth user account and remove their assignment from course unit{' '}
                {targetLecturer.course_units?.code || 'if assigned'}.
              </p>

              <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={submittingDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white hover:bg-danger/90 disabled:opacity-50 transition-colors"
                >
                  {submittingDelete ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" /> Remove Profile
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}
