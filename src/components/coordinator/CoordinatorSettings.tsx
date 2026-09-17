'use client'

import { useState, useEffect } from 'react'
import { Users, Moon, Sun, Globe, Save, LucideIcon, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'

export function CoordinatorSettings() {
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    whatsapp_phone: user?.whatsapp_phone || '',
    faculty: user?.faculty || '',
    course: user?.course || '',
  })

  useEffect(() => {
    setProfile({
      full_name: user?.full_name || '',
      email: user?.email || '',
      whatsapp_phone: user?.whatsapp_phone || '',
      faculty: user?.faculty || '',
      course: user?.course || '',
    })
  }, [user])

  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      if (!user?.id) return

      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          whatsapp_phone: profile.whatsapp_phone,
          faculty: profile.faculty,
          course: profile.course,
        })
        .eq('id', user.id)

      if (error) throw error
      setSaveSuccess(true)
      await refreshUser()
    } catch (error) {
      console.error('Failed to save profile settings:', error)
      setSaveError(error instanceof Error ? error.message : 'Unable to save profile settings.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user?.id) return

    setDeletingAccount(true)
    try {
      await supabase.from('student_course_units').delete().eq('user_id', user.id)
      await supabase.from('group_members').delete().eq('user_id', user.id)
      await supabase.from('group_join_requests').delete().eq('user_id', user.id)
      await supabase.from('selected_coordinators').delete().eq('user_id', user.id)
      await supabase.from('tasks').delete().eq('user_id', user.id)

      const { error } = await supabase.from('users').delete().eq('id', user.id)
      if (error) throw error

      await supabase.auth.signOut()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert(error instanceof Error ? error.message : 'Unable to delete account. Please try again.')
    } finally {
      setDeletingAccount(false)
    }
  }

  const themeOptions: Array<{ value: 'light' | 'mid' | 'dark'; label: string; icon: LucideIcon }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'mid', label: 'Mid', icon: Globe },
    { value: 'dark', label: 'Dark', icon: Moon },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your coordinator profile and appearance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information and coordinator details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {saveError && (
            <div className="rounded-xl border border-danger/30 bg-danger-light p-3 text-xs font-semibold text-danger" role="alert">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs font-semibold text-success">
              Profile settings updated successfully.
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-text-primary">{profile.full_name || 'Coordinator profile'}</p>
              <p className="text-text-muted">{profile.email || user?.email}</p>
              <Badge variant="primary" className="mt-1">Coordinator</Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border">
            <Input
              label="Full Name"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
            <Input
              label="Email"
              value={profile.email}
              disabled
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="WhatsApp Phone"
              value={profile.whatsapp_phone}
              onChange={(e) => setProfile({ ...profile, whatsapp_phone: e.target.value })}
              placeholder="+256 700 000 000"
            />
            <Input
              label="Faculty"
              value={profile.faculty}
              onChange={(e) => setProfile({ ...profile, faculty: e.target.value })}
              placeholder="Faculty of Computing"
            />
          </div>

          <Input
            label="Course"
            value={profile.course}
            onChange={(e) => setProfile({ ...profile, course: e.target.value })}
            placeholder="BSc Computer Science"
          />

          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the portal looks across the coordinator workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? 'primary' : 'outline'}
                onClick={() => setTheme(value)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-danger/20">
        <CardHeader>
          <CardTitle className="text-danger">Danger Zone</CardTitle>
          <CardDescription>Permanent actions that cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-text-primary">Delete account</p>
              <p className="text-sm text-text-muted">Permanently remove your account and all associated data.</p>
            </div>
            <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Account
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
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}