'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  helperText?: string
  disabled?: boolean
  searchable?: boolean
  multi?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  helperText,
  disabled = false,
  searchable = false,
  multi = false,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) && !opt.disabled
      )
    : options.filter((opt) => !opt.disabled)

  const selectedOptions: SelectOption[] = multi
    ? value?.split(',').map((v) => options.find((o) => o.value === v)).filter((o): o is SelectOption => Boolean(o)) || []
    : value
    ? options.filter((o) => o.value === value)
    : []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return
    if (multi) {
      const currentValues = value?.split(',') || []
      const newValues = currentValues.includes(option.value)
        ? currentValues.filter((v) => v !== option.value)
        : [...currentValues, option.value]
      onChange(newValues.join(','))
    } else {
      onChange(option.value)
      setIsOpen(false)
    }
  }

  const displayValue = multi
    ? selectedOptions.filter((o): o is SelectOption => Boolean(o)).map((o) => o.label).join(', ') || placeholder
    : selectedOptions[0]?.label || placeholder

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'input w-full text-left justify-between',
            !value && 'text-text-muted',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger/20'
          )}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={label}
        >
          <span>{displayValue}</span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-border bg-surface shadow-lg animate-fade-in">
            {searchable && (
              <div className="p-2 border-b border-border sticky top-0 bg-surface">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="input py-1.5 text-sm"
                />
              </div>
            )}
            <ul role="listbox" className="py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-center text-text-muted text-sm">No options found</li>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = multi
                    ? selectedOptions.some((o) => o.value === option.value)
                    : value === option.value
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        'px-4 py-2 cursor-pointer transition-colors',
                        isSelected && 'bg-primary/10 text-primary',
                        option.disabled && 'opacity-50 cursor-not-allowed',
                        !isSelected && !option.disabled && 'hover:bg-surface-hover'
                      )}
                      onClick={() => handleSelect(option)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center gap-2">
                        {multi ? (
                          isSelected ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <div className="h-4 w-4 rounded border border-border" />
                          )
                        ) : isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                        <span>{option.label}</span>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-danger" role="alert">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>}
    </div>
  )
}