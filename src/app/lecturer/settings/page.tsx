import { PasskeySettings } from '@/components/shared/PasskeySettings'

export default function LecturerSettingsPage() {
  return (
    <div className="settings-page max-w-5xl space-y-6">
      <div className="settings-heading">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Account security</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-text-primary">Settings</h1>
        <p className="mt-1 text-text-secondary">Manage how you sign in to Nest.</p>
      </div>
      <PasskeySettings />
    </div>
  )
}