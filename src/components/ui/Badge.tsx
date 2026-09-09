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

  return (
    <span
      className={cn('badge', variantClasses[variant], className)}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full mr-1.5',
            variant === 'primary' && 'bg-primary',
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'danger' && 'bg-danger',
            variant === 'secondary' && 'bg-secondary'
          )}
        />
      )}
      {children}
    </span>
  )
}