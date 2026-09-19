'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getStudentCourseUnitIds } from '@/lib/faculty-access'

export default function StudentSettingsPage() {
  const { user, refreshUser } = useAuth()
  const userId = user?.id
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [draftData, setDraftData] = useState({
    fullName: user?.full_name || '',
    whatsappPhone: user?.whatsapp_phone || '',
  })
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [enrolledUnitIds, setEnrolledUnitIds] = useState<string[]>([])
  const [loadingCourseUnits, setLoadingCourseUnits] = useState(true)
  const [updatingCourseUnits, setUpdatingCourseUnits] = useState(false)
  const [unitActionError, setUnitActionError] = useState('')
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    studentRegistrationNumber: user?.student_registration_number || '',
    whatsappPhone: user?.whatsapp_phone || '',
    course: user?.course || '',
  })

  async function handleDeleteAccount() {
    if (!userId) return

    setDeletingAccount(true)
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete user account.')
      }

      await supabase.auth.signOut()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete account. Please try again.')
    } finally {
      setDeletingAccount(false)
    }
  }

  useEffect(() => {
    if (!userId || !user) {
      setLoadingCourseUnits(false)
      return
    }

    async function fetchCourseUnits() {
      try {
        const allowedUnitIds = await getStudentCourseUnitIds(supabase, user!)
        const allowedSet = new Set(allowedUnitIds)

        const [unitsRes, enrollmentsRes] = await Promise.all([
          supabase.from('course_units').select('*, course:courses(code, name, faculty_id)').eq('is_active', true).order('name', { ascending: true }),
          supabase.from('student_course_units').select('course_unit_id').eq('user_id', userId).eq('status', 'active'),
        ])

        if (unitsRes.error) throw unitsRes.error
        if (enrollmentsRes.error) throw enrollmentsRes.error

        const allUnits = unitsRes.data || []
        const filteredUnits = allowedSet.size > 0
          ? allUnits.filter((u: any) => allowedSet.has(u.id))
          : allUnits

        setCourseUnits(filteredUnits)
        setEnrolledUnitIds((enrollmentsRes.data || []).map((item: any) => item.course_unit_id))
      } catch (error) {
        console.error('Error fetching registered course units:', error)
      } finally {
        setLoadingCourseUnits(false)
      }
    }

    fetchCourseUnits()
  }, [user, supabase])

  useEffect(() => {
    setDraftData({
      fullName: user?.full_name || '',
      whatsappPhone: user?.whatsapp_phone || '',
    })
    setFormData({
      fullName: user?.full_name || '',
      email: user?.email || '',
      studentRegistrationNumber: user?.student_registration_number || '',
      whatsappPhone: user?.whatsapp_phone || '',
      course: user?.course || '',
    })
  }, [user])

  const [saveError, setSaveError] = useState('')

  async function handleSave() {
    if (!userId && !user?.email) return

    setSaving(true)
    setSaveError('')
    try {
      let query = supabase
        .from('users')
        .update({
          full_name: draftData.fullName.trim(),
          whatsapp_phone: draftData.whatsappPhone,
          updated_at: new Date().toISOString(),
        })

      if (userId && user?.email) {
        query = query.or(`id.eq.${userId},email.eq.${user.email}`)
      } else if (userId) {
        query = query.eq('id', userId)
      } else if (user?.email) {
        query = query.eq('email', user.email)
      }

      const { data: updatedData, error: dbError } = await query.select('*')

      if (dbError) throw dbError

      const updatedProfile = Array.isArray(updatedData) && updatedData.length > 0 ? updatedData[0] : updatedData

      setFormData((current) => ({
        ...current,
        fullName: updatedProfile?.full_name || draftData.fullName.trim(),
        whatsappPhone: updatedProfile?.whatsapp_phone || draftData.whatsappPhone,
      }))

      setIsEditOpen(false)
      await refreshUser()
    } catch (error) {
      console.error('Save error:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save profile changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleCourseUnitEnrollment(unitId: string) {
    if (!userId) return

    const isEnrolled = enrolledUnitIds.includes(unitId)
    setUpdatingCourseUnits(true)
    setUnitActionError('')

    try {
      if (isEnrolled) {
        const { error } = await supabase
          .from('student_course_units')
          .delete()
          .eq('user_id', userId)
          .eq('course_unit_id', unitId)

        if (error) throw error

        setEnrolledUnitIds((current) => current.filter((id) => id !== unitId))
        return
      }

      const { error } = await supabase
        .from('student_course_units')
        .upsert(
          { user_id: userId, course_unit_id: unitId, status: 'active' },
          { onConflict: 'user_id,course_unit_id' }
        )

      if (error) throw error

      setEnrolledUnitIds((current) => Array.from(new Set([...current, unitId])))
    } catch (error) {
      console.error('Error updating course unit enrollment:', error)
      setUnitActionError(error instanceof Error ? error.message : 'Unable to update course unit enrollment.')
    } finally {
      setUpdatingCourseUnits(false)
    }
  }

  const openEditor = () => {
    setDraftData({
      fullName: formData.fullName,
      whatsappPhone: formData.whatsappPhone,
    })
    setIsEditOpen(true)
  }

  return (
    <div className="settings-page max-w-5xl space-y-6">
      <div className="settings-hero relative overflow-hidden rounded-3xl border border-primary/20 px-5 py-6 shadow-lg sm:px-8 sm:py-7">
        <div className="settings-hero-glow" aria-hidden="true" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary ring-4 ring-primary/5">
              <User className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Student profile</p>
              <h1 className="mt-1 break-words text-2xl font-semibold text-text-primary">{formData.fullName || 'Student name'}</h1>
              <p className="break-words text-sm text-text-muted">{formData.email || 'No email provided'}</p>
            </div>
          </div>

          <Button variant="outline" onClick={openEditor}>
            Edit profile
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="settings-stat rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Course</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{formData.course || 'Not provided'}</p>
        </div>

        <div className="settings-stat rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Registration number</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{formData.studentRegistrationNumber || 'Not provided'}</p>
        </div>

        <div className="settings-stat rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">WhatsApp</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{formData.whatsappPhone || 'Not added'}</p>
        </div>
      </div>

      <Card className="settings-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle>Profile details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="rounded-xl border border-border bg-surface-hover/50 p-4">
            <p className="text-sm font-medium text-text-primary">Account information</p>
            <p className="mt-1 text-sm text-text-muted">Your personal contact details are editable. Course and registration number are shown here as read-only academic details.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Full name</p>
              <p className="mt-2 font-medium text-text-primary">{formData.fullName || 'Not set'}</p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Email</p>
              <p className="mt-2 font-medium text-text-primary">{formData.email || 'Not available'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="settings-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle>Course units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm text-text-secondary">
            Add or remove the course units you are currently taking. This keeps your groups, coursework, and dashboard aligned to your actual registrations.
          </p>

          {unitActionError && (
            <div className="rounded-xl border border-danger/30 bg-danger-light p-3 text-xs font-semibold text-danger flex items-center justify-between">
              <span>{unitActionError}</span>
              <button onClick={() => setUnitActionError('')} className="text-xs hover:underline">Dismiss</button>
            </div>
          )}

          {loadingCourseUnits ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-surface-hover" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {courseUnits.map((unit) => {
                const isEnrolled = enrolledUnitIds.includes(unit.id)

                return (
                  <div
                    key={unit.id}
                    className="flex min-w-0 flex-col items-stretch gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                          {unit.code}
                        </span>
                        {isEnrolled && (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-success">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-2 break-words font-semibold text-text-primary">{unit.name}</p>
                      {unit.description && (
                        <p className="mt-1 break-words text-xs text-text-muted">{unit.description}</p>
                      )}
                    </div>

                    <Button
                      variant={isEnrolled ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => toggleCourseUnitEnrollment(unit.id)}
                      loading={updatingCourseUnits}
                      disabled={updatingCourseUnits}
                      className="w-full shrink-0 sm:w-auto"
                    >
                      {isEnrolled ? 'Delete' : 'Add'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="settings-card border-danger/30 bg-danger/5">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-text-primary">Delete account</p>
              <p className="text-sm text-text-muted">Permanently delete your account and all associated data.</p>
            </div>
            <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Account Deletion" size="sm">
        <div className="space-y-4">
          <div className="rounded-xl border border-danger/30 bg-danger-light p-3 text-xs font-semibold text-danger">
            Warning: This will permanently delete your account and remove all your data from Nest. This action CANNOT be undone.
          </div>
          <p className="text-sm text-text-primary">
            Are you sure you want to permanently delete your account?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deletingAccount}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount} loading={deletingAccount}>
              Delete account
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSaveError(''); }} title="Edit profile" size="md">
        <div className="space-y-4">
          {saveError && (
            <div className="rounded-xl border border-danger/30 bg-danger-light p-3 text-xs font-semibold text-danger" role="alert">
              {saveError}
            </div>
          )}
          <div className="space-y-2">
            <label className="label">Full name</label>
            <input
              type="text"
              value={draftData.fullName}
              onChange={(e) => setDraftData({ ...draftData, fullName: e.target.value })}
              className="input"
            />
          </div>

          <div className="space-y-2">
            <label className="label">WhatsApp phone number</label>
            <input
              type="tel"
              value={draftData.whatsappPhone}
              onChange={(e) => setDraftData({ ...draftData, whatsappPhone: e.target.value })}
              className="input"
              placeholder="+1 555 123 4567"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface-hover/60 p-3 text-sm text-text-muted">
            Course and registration number are displayed as academic details and cannot be changed here.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}