import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const actionClasses =
    'mt-4 inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-light/60 px-3.5 py-2 text-xs font-bold text-primary transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  return (
    <div className={cn('flex flex-col items-center px-4 py-10 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover text-text-muted" aria-hidden="true">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-semibold text-text-secondary">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-text-muted">{description}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className={actionClasses}>
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={actionClasses}>
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ))}
    </div>
  )
}
