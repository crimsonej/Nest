'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { motion, HTMLMotionProps } from 'framer-motion'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, onClick, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const variantClasses = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30',
      secondary: 'bg-secondary text-white hover:bg-secondary-hover shadow-md shadow-secondary/20 hover:shadow-lg',
      outline: 'border border-border/80 bg-surface/80 hover:bg-surface-hover text-text-primary backdrop-blur-sm',
      ghost: 'bg-transparent hover:bg-surface-hover text-text-primary',
      danger: 'bg-danger text-white hover:bg-danger/90 shadow-md shadow-danger/20 hover:shadow-lg',
      success: 'bg-success text-white hover:bg-success/90 shadow-md shadow-success/20 hover:shadow-lg',
    }

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2.5 rounded-xl',
      lg: 'px-6 py-3.5 text-base rounded-2xl',
    }

    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        disabled={isDisabled}
        onClick={onClick}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'