'use client'

import { forwardRef, LabelHTMLAttributes, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, onCheckedChange, onChange, ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={cn(
            'mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
          onChange={(event) => {
            onChange?.(event)
            onCheckedChange?.(event.target.checked)
          }}
        />
        <div className="flex flex-col">
          <label htmlFor={checkboxId} className="label cursor-pointer mb-0">
            {label}
          </label>
          {description && (
            <p className="text-sm text-text-muted">{description}</p>
          )}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'