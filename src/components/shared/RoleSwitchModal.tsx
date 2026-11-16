'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Building2, CalendarRange, Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { semesterLabel, useSemester } from '@/hooks/useSemester'
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
  const { semesters, viewingSemester, selectSemester } = useSemester()

  if (!user || (user.role !== 'admin' && user.status !== 'admin' && user.status !== 'coordinator' && user.status !== 'selected_coordinator')) {
    return null
  }

  const roleTitle = user.role === 'admin' || user.status === 'admin' ? 'Administrator' : user.status === 'selected_coordinator' ? 'Selected Coordinator (SC)' : 'Faculty Coordinator'

  function handleSelectRole(role: 'student' | 'coordinator' | 'admin') {
    onClose()
    if (role === 'admin') {
      router.push('/admin/dashboard')
    } else if (role === 'coordinator') {
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
            <Image src="/logo.png" alt="NEST Logo" width={24} height={24} className="rounded-lg" />
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

        {semesters.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" /> Semester
            </legend>
            <div className="flex flex-wrap gap-2">
              {semesters.map((semester) => {
                const active = semester.id === viewingSemester?.id
                return (
                  <button
                    key={semester.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectSemester(semester.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'border-primary bg-primary text-white shadow-md shadow-primary/25'
                        : 'border-border/80 bg-surface text-text-secondary hover:border-primary/40 hover:text-text-primary'
                    )}
                  >
                    {semesterLabel(semester)}
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wider',
                        active ? 'bg-white/20 text-white' : semester.is_current ? 'bg-success-light text-success' : semester.status === 'upcoming' ? 'bg-warning-light text-warning' : 'bg-surface-hover text-text-muted'
                      )}
                    >
                      {semester.is_current ? 'Current' : semester.status}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        <div className={`grid gap-3 sm:gap-4 grid-cols-1 ${user.role === 'admin' || user.status === 'admin' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectRole('student')}
            className="flex flex-col items-center rounded-2xl border border-border/80 bg-surface p-4 sm:p-6 text-center shadow-xs transition-all hover:border-primary/40 hover:shadow-lg"
          >
            <div className="mb-2.5 sm:mb-4 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary-light text-primary shadow-sm">
              <User className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <h4 className="font-bold text-text-primary text-sm sm:text-base">Student Portal</h4>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">Access your group work, assignment tasks, and submission deadlines.</p>
          </motion.button>

          {(user.role === 'admin' || user.status === 'admin') && (
            <motion.button
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectRole('admin')}
              className="flex flex-col items-center rounded-2xl border border-success/40 bg-success-light/50 p-4 sm:p-6 text-center shadow-xs transition-all hover:border-success hover:shadow-lg"
            >
              <div className="mb-2.5 sm:mb-4 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-success-light text-success shadow-sm">
                <Building2 className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <h4 className="font-bold text-text-primary text-sm sm:text-base">Administrator</h4>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">View and manage all faculties, courses, course units, and students.</p>
            </motion.button>
          )}

          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectRole('coordinator')}
            className="flex flex-col items-center rounded-2xl border border-primary/40 bg-primary-light/30 p-4 sm:p-6 text-center shadow-xs transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="mb-2.5 sm:mb-4 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-warning-light text-warning shadow-sm">
              <Shield className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <h4 className="font-bold text-text-primary text-sm sm:text-base">Coordinator</h4>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">Manage group allocations, course units, student rosters, and AI Entry.</p>
          </motion.button>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
