'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { User, Save, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

const avatarIndexes = {
  male: [1, 3, 5, 8, 12, 15, 18, 20, 22, 25, 28, 30],
  female: [1, 4, 6, 9, 11, 14, 17, 19, 21, 24, 27, 30],
  other: [2, 7, 10, 13, 16, 23, 26, 29, 32, 35, 38, 41],
} as const

function getAvatarOptions(gender: 'male' | 'female' | 'other', excluded: string[] = []) {
  const source = gender === 'female' ? 'women' : 'men'
  const excludedSet = new Set(excluded)
  const available = avatarIndexes[gender].filter(
    (index) => !excludedSet.has(`https://randomuser.me/api/portraits/${source}/${index}.jpg`)
  )
  const pool = available.length >= 6 ? available : avatarIndexes[gender]
  return [...pool]
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .map((index) => `https://randomuser.me/api/portraits/${source}/${index}.jpg`)
}

export default function StudentSettingsPage() {
  const { user, refreshUser } = useAuth()
  const userId = user?.id
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [draftData, setDraftData] = useState({
    fullName: user?.full_name || '',
    whatsappPhone: user?.whatsapp_phone || '',
  })
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [enrolledUnitIds, setEnrolledUnitIds] = useState<string[]>([])
  const [loadingCourseUnits, setLoadingCourseUnits] = useState(true)
  const [updatingCourseUnits, setUpdatingCourseUnits] = useState(false)
  const [avatarOptions, setAvatarOptions] = useState<string[]>([])
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('')
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    studentRegistrationNumber: user?.student_registration_number || '',
    whatsappPhone: user?.whatsapp_phone || '',
    course: user?.course || '',
  })

  useEffect(() => {
    if (!userId) {
      setLoadingCourseUnits(false)
      return
    }

    async function fetchCourseUnits() {
      try {
        const [unitsRes, enrollmentsRes] = await Promise.all([
          supabase.from('course_units').select('*').eq('is_active', true).order('name', { ascending: true }),
          supabase.from('student_course_units').select('course_unit_id').eq('user_id', userId).eq('status', 'active'),
        ])

        if (unitsRes.error) throw unitsRes.error
        if (enrollmentsRes.error) throw enrollmentsRes.error

        setCourseUnits(unitsRes.data || [])
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

  useEffect(() => {
    const gender = user?.gender || 'other'
    const options = getAvatarOptions(gender)
    setAvatarOptions(options)
    setSelectedAvatarUrl(user?.avatar_url || options[0] || '')
  }, [user])

  async function handleSave() {
    if (!userId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: draftData.fullName,
          whatsapp_phone: draftData.whatsappPhone,
          avatar_url: selectedAvatarUrl,
        })
        .eq('id', userId)

      if (error) throw error

      setFormData((current) => ({
        ...current,
        fullName: draftData.fullName,
        whatsappPhone: draftData.whatsappPhone,
      }))

      setIsEditOpen(false)
      await refreshUser()
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  async function toggleCourseUnitEnrollment(unitId: string) {
    if (!userId) return

    const isEnrolled = enrolledUnitIds.includes(unitId)
    setUpdatingCourseUnits(true)

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

      const { data: existingEnrollment, error: lookupError } = await supabase
        .from('student_course_units')
        .select('id, status')
        .eq('user_id', userId)
        .eq('course_unit_id', unitId)
        .maybeSingle()

      if (lookupError) throw lookupError

      if (existingEnrollment) {
        const { error } = await supabase
          .from('student_course_units')
          .update({ status: 'active' })
          .eq('id', existingEnrollment.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('student_course_units')
          .insert({ user_id: userId, course_unit_id: unitId, status: 'active' })

        if (error) throw error
      }

      setEnrolledUnitIds((current) => Array.from(new Set([...current, unitId])))
    } catch (error) {
      console.error('Error updating course unit enrollment:', error)
    } finally {
      setUpdatingCourseUnits(false)
    }
  }

  const openEditor = () => {
    setDraftData({
      fullName: formData.fullName,
      whatsappPhone: formData.whatsappPhone,
    })
    const gender = user?.gender || 'other'
    const options = getAvatarOptions(gender)
    setAvatarOptions(options)
    setSelectedAvatarUrl(user?.avatar_url || options[0] || '')
    setIsEditOpen(true)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary ring-4 ring-primary/5">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <User className="h-8 w-8" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Student profile</p>
              <h1 className="mt-1 text-2xl font-semibold text-text-primary">{formData.fullName || 'Student name'}</h1>
              <p className="text-sm text-text-muted">{formData.email || 'No email provided'}</p>
            </div>
          </div>

          <Button variant="outline" onClick={openEditor}>
            Edit profile
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Course</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{formData.course || 'Not provided'}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Registration number</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{formData.studentRegistrationNumber || 'Not provided'}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">WhatsApp</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{formData.whatsappPhone || 'Not added'}</p>
        </div>
      </div>

      <Card>
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

      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle>Course units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm text-text-secondary">
            Add or remove the course units you are currently taking. This keeps your groups, coursework, and dashboard aligned to your actual registrations.
          </p>

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
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                          {unit.code}
                        </span>
                        {isEnrolled && (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-success">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate font-semibold text-text-primary">{unit.name}</p>
                      {unit.description && (
                        <p className="mt-1 truncate text-xs text-text-muted">{unit.description}</p>
                      )}
                    </div>

                    <Button
                      variant={isEnrolled ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => toggleCourseUnitEnrollment(unit.id)}
                      loading={updatingCourseUnits}
                      disabled={updatingCourseUnits}
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

      <Card className="border-danger/20 bg-danger/5">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-text-primary">Delete account</p>
              <p className="text-sm text-text-muted">Permanently delete your account and all associated data.</p>
            </div>
            <Button variant="danger">Delete account</Button>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit profile" size="md">
        <div className="space-y-4">
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="label mb-0">Profile picture</label>
                <p className="text-[11px] text-text-muted">Choose a new avatar for your profile.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const options = getAvatarOptions(user?.gender || 'other', avatarOptions)
                  setAvatarOptions(options)
                  setSelectedAvatarUrl(options[0] || '')
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:border-primary/40 hover:text-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {avatarOptions.map((avatarUrl) => (
                <button
                  key={avatarUrl}
                  type="button"
                  onClick={() => setSelectedAvatarUrl(avatarUrl)}
                  className={`rounded-full p-0.5 ${selectedAvatarUrl === avatarUrl ? 'bg-primary ring-2 ring-primary/25' : 'bg-border hover:bg-primary/40'}`}
                  aria-label="Choose profile picture"
                  aria-pressed={selectedAvatarUrl === avatarUrl}
                >
                  <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                </button>
              ))}
            </div>
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