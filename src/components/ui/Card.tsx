'use client'

import { cn } from '@/lib/utils'
import { motion, HTMLMotionProps } from 'framer-motion'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = false, onClick, ...props }: CardProps) {
  if (hover || onClick) {
    return (
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={onClick ? { scale: 0.99 } : undefined}
        onClick={onClick}
        className={cn(
          'card rounded-2xl border border-border/80 bg-surface/95 shadow-sm backdrop-blur-md transition-all duration-200 cursor-pointer hover:shadow-xl hover:border-primary/30',
          className
        )}
        {...(props as HTMLMotionProps<'div'>)}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      className={cn(
        'card rounded-2xl border border-border/80 bg-surface/95 shadow-sm backdrop-blur-md transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('card-header border-b border-border/60 px-4 sm:px-6 py-3.5 sm:py-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-base sm:text-lg font-bold tracking-tight text-text-primary', className)}>{children}</h3>
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed', className)}>{children}</p>
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('card-content px-4 sm:px-6 py-4 sm:py-5', className)}>{children}</div>
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border/60 bg-surface-hover/40 rounded-b-2xl',
        className
      )}
    >
      {children}
    </div>
  )
}