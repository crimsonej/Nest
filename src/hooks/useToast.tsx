'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Toaster, dynaura } from 'dynaura'
// The font-free stylesheet: the default one downloads a Google font on every page.
import 'dynaura/styles-no-font.css'

/**
 * App-wide notifications, shown as a Dynamic Island style pill (dynaura).
 * Pages keep calling toast.success / error / info as before.
 */

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  dismiss: (id?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

// Errors stay up longer so there is time to read them.
const DURATION_MS = { success: 4000, info: 5000, error: 7000 } as const

// The island's title is a single line, so longer messages get a short heading and the
// full sentence underneath, where it can wrap.
const HEADINGS = { success: 'Done', error: 'Couldn’t complete that', info: 'Note' } as const
const MAX_TITLE_LENGTH = 34

function show(variant: keyof typeof DURATION_MS, message: string) {
  const short = message.length <= MAX_TITLE_LENGTH
  dynaura[variant]({
    title: short ? message : HEADINGS[variant],
    description: short ? undefined : message,
    duration: DURATION_MS[variant],
  })
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
      dismiss: (id) => dynaura.dismiss(id),
    }),
    []
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/*
        Always the black island, as on an iPhone, in light and dark mode alike.
        queue keeps a second message from replacing the first before it is read.
      */}
      <Toaster position="top" offset={10} theme="dark" queue maxQueue={3} haptics={false} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
