'use client'

import { useRouter } from 'next/navigation'
import { Shield, User, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { User as UserType } from '@/types'

interface RoleSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserType | null
}

export function RoleSwitchModal({ isOpen, onClose, user }: RoleSwitchModalProps) {
  const router = useRouter()

  if (!user || (user.status !== 'coordinator' && user.status !== 'selected_coordinator')) {
    return null
  }

  const roleTitle = user.status === 'selected_coordinator' ? 'Selected Coordinator (SC)' : 'Faculty Coordinator'

  function handleSelectRole(role: 'student' | 'coordinator') {
    onClose()
    if (role === 'coordinator') {
      router.push('/coordinator/dashboard')
    } else {
      router.push('/student/dashboard')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Active Workspace" size="md">
      <div className="space-y-6 pt-2">
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Assigned Leadership Role</p>
            <p className="text-sm font-medium text-text-primary">
              You are assigned as <span className="font-bold text-primary">{roleTitle}</span> for your course units.
            </p>
          </div>
        </div>

        <p className="text-sm text-text-secondary">
          How would you like to view NEST for this session? You can switch back at any time.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => handleSelectRole('student')}
            className="flex flex-col items-center rounded-2xl border border-border bg-surface p-5 text-center transition-all hover:border-primary hover:bg-surface-hover hover:shadow-md"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <User className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-text-primary">Normal Student</h4>
            <p className="mt-1 text-xs text-text-muted">Access your group work, tasks, and coursework deadlines.</p>
          </button>

          <button
            onClick={() => handleSelectRole('coordinator')}
            className="flex flex-col items-center rounded-2xl border border-primary/40 bg-primary/5 p-5 text-center transition-all hover:border-primary hover:bg-primary/10 hover:shadow-md"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-text-primary">{roleTitle}</h4>
            <p className="mt-1 text-xs text-text-muted">Manage groups, course units, student rosters, and AI Entry.</p>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
