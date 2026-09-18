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
    const baseClasses = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation'

    const variantClasses = {
      primary: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/40 hover:brightness-110 active:brightness-95',
      secondary: 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/40 hover:brightness-110 active:brightness-95',
      outline: 'border border-border/80 bg-surface/75 hover:bg-surface-hover/90 text-text-primary backdrop-blur-md hover:border-primary/40 shadow-xs',
      ghost: 'bg-transparent hover:bg-surface-hover/80 text-text-primary',
      danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/40',
      success: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/40',
    }

    const sizeClasses = {
      sm: 'min-h-10 px-3 py-1.5 text-xs rounded-lg',
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