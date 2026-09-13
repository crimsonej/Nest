'use client'

import { useState, useEffect } from 'react'
import { Users, Bell, Shield, Moon, Sun, Globe, Key, Save, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Checkbox } from '../ui/Checkbox'
import { Badge } from '../ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'

export function CoordinatorSettings() {
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [notifications, setNotifications] = useState({
    emailNewGroup: true,
    emailJoinRequest: true,
    emailGroupLocked: false,
    emailWeeklyDigest: true,
    inAppNewGroup: true,
    inAppJoinRequest: true,
    inAppTaskDeadline: true,
  })
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 60,
    requireStrongPassword: true,
  })

  useEffect(() => {
    fetchSettings()
  }, [user])

  async function fetchSettings() {
    // In a real app, fetch from user_preferences table
  }

  async function handleSave(section: string) {
    setSaving(true)
    // In a real app, save to user_preferences table
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your coordinator preferences and account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-text-primary">{user?.full_name}</p>
              <p className="text-text-muted">{user?.email}</p>
              <Badge variant="primary" className="mt-1">Coordinator</Badge>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border">
            <Input label="Full Name" defaultValue={user?.full_name} />
            <Input label="Email" defaultValue={user?.email} disabled />
          </div>
          <Button onClick={() => handleSave('profile')} loading={saving}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Theme</p>
              <p className="text-sm text-text-muted">Choose your preferred color scheme</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={theme === 'light' ? 'primary' : 'outline'}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4 mr-2" /> Light
              </Button>
              <Button
                variant={theme === 'mid' ? 'primary' : 'outline'}
                onClick={() => setTheme('mid')}
              >
                <Globe className="h-4 w-4 mr-2" /> Mid
              </Button>
              <Button
                variant={theme === 'dark' ? 'primary' : 'outline'}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4 mr-2" /> Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b border-border pb-4">
            <p className="font-medium text-text-primary mb-3">Email Notifications</p>
            <div className="space-y-3">
              <Checkbox
                label="New Group Created"
                description="Receive email when a new group is formed"
                checked={notifications.emailNewGroup}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailNewGroup: checked })}
              />
              <Checkbox
                label="Join Requests"
                description="Receive email when students request to join private groups"
                checked={notifications.emailJoinRequest}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailJoinRequest: checked })}
              />
              <Checkbox
                label="Group Locked"
                description="Receive email when a group is locked/unlocked"
                checked={notifications.emailGroupLocked}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailGroupLocked: checked })}
              />
              <Checkbox
                label="Weekly Digest"
                description="Receive weekly summary of group activity"
                checked={notifications.emailWeeklyDigest}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailWeeklyDigest: checked })}
              />
            </div>
          </div>
          <div className="pt-4">
            <p className="font-medium text-text-primary mb-3">In-App Notifications</p>
            <div className="space-y-3">
              <Checkbox
                label="New Group Created"
                checked={notifications.inAppNewGroup}
                onCheckedChange={(checked) => setNotifications({ ...notifications, inAppNewGroup: checked })}
              />
              <Checkbox
                label="Join Requests"
                checked={notifications.inAppJoinRequest}
                onCheckedChange={(checked) => setNotifications({ ...notifications, inAppJoinRequest: checked })}
              />
              <Checkbox
                label="Task Deadlines"
                description="Get notified about upcoming task deadlines"
                checked={notifications.inAppTaskDeadline}
                onCheckedChange={(checked) => setNotifications({ ...notifications, inAppTaskDeadline: checked })}
              />
            </div>
          </div>
          <Button onClick={() => handleSave('notifications')} loading={saving}>
            <Save className="h-4 w-4" />
            Save Notification Preferences
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Checkbox
              label="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              checked={security.twoFactorEnabled}
              onCheckedChange={(checked) => setSecurity({ ...security, twoFactorEnabled: checked })}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Session Timeout (minutes)"
                options={[
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '1 hour' },
                  { value: '120', label: '2 hours' },
                  { value: '240', label: '4 hours' },
                  { value: '480', label: '8 hours' },
                ]}
                value={security.sessionTimeout.toString()}
                onChange={(v) => setSecurity({ ...security, sessionTimeout: parseInt(v) })}
              />
              <Checkbox
                label="Require Strong Passwords"
                description="Enforce strong password policy for your account"
                checked={security.requireStrongPassword}
                onCheckedChange={(checked) => setSecurity({ ...security, requireStrongPassword: checked })}
              />
            </div>
          </div>
          <Button variant="outline" onClick={() => handleSave('security')} loading={saving}>
            <Shield className="h-4 w-4 mr-2" />
            Save Security Settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-danger/20">
        <CardHeader>
          <CardTitle className="text-danger">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
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