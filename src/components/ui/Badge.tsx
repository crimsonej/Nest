'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
  className?: string
  dot?: boolean
}

export function Badge({ children, variant = 'secondary', className, dot = false }: BadgeProps) {
  const variantClasses = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    secondary: 'badge-secondary',
  }

  const dotColorClasses = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    secondary: 'bg-text-muted',
  }

  return (
    <span className={cn('badge shadow-xs', variantClasses[variant], className)}>
      {dot && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotColorClasses[variant])} />
          <span className={cn('relative inline-flex rounded-full h-2 w-2', dotColorClasses[variant])} />
        </span>
      )}
      {children}
    </span>
  )
}