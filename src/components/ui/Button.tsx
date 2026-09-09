'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variantClasses = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md active:bg-primary/90',
      secondary: 'bg-secondary text-white hover:bg-secondary-hover shadow-sm hover:shadow-md',
      outline: 'border border-border bg-surface hover:bg-surface-hover text-text-primary',
      ghost: 'bg-transparent hover:bg-surface-hover text-text-primary',
      danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm hover:shadow-md',
      success: 'bg-success text-white hover:bg-success/90 shadow-sm hover:shadow-md',
    }
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: '',
      lg: 'px-6 py-3 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'