'use client'

import { useRouter } from 'next/navigation'
import { Shield, User, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { User as UserType } from '@/types'
import { motion } from 'framer-motion'

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
        <div className="flex items-center gap-3.5 rounded-2xl border border-primary/25 bg-primary-light/40 p-4 backdrop-blur-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Assigned Leadership Role</p>
            <p className="text-sm font-semibold text-text-primary mt-0.5">
              You are assigned as <span className="font-bold text-primary underline decoration-primary/30">{roleTitle}</span> for your course units.
            </p>
          </div>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed">
          How would you like to view NEST for this session? You can switch between roles at any time.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectRole('student')}
            className="flex flex-col items-center rounded-2xl border border-border/80 bg-surface p-6 text-center shadow-xs transition-all hover:border-primary/40 hover:shadow-lg"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm">
              <User className="h-7 w-7" />
            </div>
            <h4 className="font-bold text-text-primary text-base">Student Portal</h4>
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">Access your group work, assignment tasks, and submission deadlines.</p>
          </motion.button>

          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectRole('coordinator')}
            className="flex flex-col items-center rounded-2xl border border-primary/40 bg-primary-light/30 p-6 text-center shadow-xs transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm">
              <Shield className="h-7 w-7" />
            </div>
            <h4 className="font-bold text-text-primary text-base">{roleTitle}</h4>
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">Manage group allocations, course units, student rosters, and AI Entry.</p>
          </motion.button>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
