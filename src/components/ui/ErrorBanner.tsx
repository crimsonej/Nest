import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorBannerProps {
  title?: string
  message: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

export function ErrorBanner({ title = 'Something went wrong', message, onRetry, retrying, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-light/60 p-4 sm:flex-row sm:items-center sm:justify-between', className)}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-text-primary">{title}</p>
          <p className="mt-0.5 text-xs text-text-secondary">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl border border-danger/40 bg-surface px-3 py-1.5 text-xs font-bold text-danger transition-colors hover:bg-danger-light disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger sm:self-center"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} aria-hidden="true" />
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  )
}
