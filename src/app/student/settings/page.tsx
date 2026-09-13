'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Phone, Contact, Save, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function StudentSettingsPage() {
  const { user, refreshUser } = useAuth()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    studentRegistrationNumber: user?.student_registration_number || '',
    whatsappPhone: user?.whatsapp_phone || '',
    course: user?.course || '',
  })

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
          student_registration_number: formData.studentRegistrationNumber,
          whatsapp_phone: formData.whatsappPhone,
          course: formData.course,
        })
        .eq('id', user?.id)

      if (error) throw error
      await refreshUser()
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-text-primary">{formData.fullName}</p>
              <p className="text-text-muted">{formData.email}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border">
            <div className="space-y-2">
              <label className="label">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="input opacity-50"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="label">Student Registration Number</label>
              <input
                type="text"
                value={formData.studentRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, studentRegistrationNumber: e.target.value })}
                className="input"
                placeholder="CS2024001"
              />
            </div>
            <div className="space-y-2">
              <label className="label">Course</label>
              <input
                type="text"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="input"
                placeholder="Computer Science"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="label">WhatsApp Phone Number</label>
            <input
              type="tel"
              value={formData.whatsappPhone}
              onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
              className="input"
              placeholder="+1 555 123 4567"
            />
          </div>
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="border-danger/20">
        <CardHeader>
          <CardTitle className="text-danger">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Delete Account</p>
              <p className="text-sm text-text-muted">Permanently delete your account and all associated data</p>
            </div>
            <Button variant="danger">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}