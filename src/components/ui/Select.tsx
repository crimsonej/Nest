'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface SelectOption {
  value: string
  label: string
  searchText?: string
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

interface MenuStyle {
  top?: number
  bottom?: number
  left: number
  width: number
  maxHeight: number
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
  const [mounted, setMounted] = useState(false)
  const [menuStyle, setMenuStyle] = useState<MenuStyle | null>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          (opt.label.toLowerCase().includes(searchQuery.toLowerCase()) && !opt.disabled) ||
          (opt.searchText?.toLowerCase().includes(searchQuery.toLowerCase()) && !opt.disabled)
      )
    : options.filter((opt) => !opt.disabled)

  const selectedOptions: SelectOption[] = multi
    ? value?.split(',').map((v) => options.find((o) => o.value === v)).filter((o): o is SelectOption => Boolean(o)) || []
    : value
    ? options.filter((o) => o.value === value)
    : []

  useEffect(() => {
    setMounted(true)
  }, [])

  const calcPosition = useCallback((): MenuStyle | null => {
    if (!buttonRef.current) return null
    const rect = buttonRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const estimatedHeight = 240

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      const availableMax = Math.min(spaceAbove - 16, 320)
      return {
        bottom: viewportHeight - rect.top + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(availableMax, 120),
      }
    } else {
      const availableMax = Math.min(spaceBelow - 16, 320)
      return {
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(availableMax, 120),
      }
    }
  }, [])

  const toggleOpen = () => {
    if (disabled) return
    if (!isOpen) {
      const pos = calcPosition()
      if (pos) setMenuStyle(pos)
      setIsOpen(true)
    } else {
      setIsOpen(false)
      setMenuStyle(null)
    }
  }

  useLayoutEffect(() => {
    if (isOpen) {
      const pos = calcPosition()
      if (pos) setMenuStyle(pos)
    }
  }, [isOpen, calcPosition])

  useEffect(() => {
    if (!isOpen) return

    function handleScrollOrResize() {
      const pos = calcPosition()
      if (pos) setMenuStyle(pos)
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
        setMenuStyle(null)
      }
    }

    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, calcPosition])

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
      setMenuStyle(null)
      setSearchQuery('')
    }
  }

  const displayValue = multi
    ? selectedOptions.filter((o): o is SelectOption => Boolean(o)).map((o) => o.label).join(', ') || placeholder
    : selectedOptions[0]?.label || placeholder

  const dropdownMenu = isOpen && menuStyle !== null && (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${menuStyle.left}px`,
        width: `${menuStyle.width}px`,
        top: menuStyle.top !== undefined ? `${menuStyle.top}px` : undefined,
        bottom: menuStyle.bottom !== undefined ? `${menuStyle.bottom}px` : undefined,
        maxHeight: `${menuStyle.maxHeight}px`,
        zIndex: 99999,
      }}
      className="overflow-auto rounded-2xl border border-border/80 bg-surface/95 p-1 shadow-2xl backdrop-blur-2xl animate-fade-in scrollbar-thin transition-all"
    >
      {searchable && (
        <div className="p-2 border-b border-border/60 sticky top-0 bg-surface/90 backdrop-blur-md z-10">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="input py-1.5 px-3 text-sm rounded-xl"
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
                  'px-4 py-2 cursor-pointer transition-colors text-sm rounded-xl mx-0.5 my-0.5',
                  isSelected && 'bg-primary/10 text-primary font-semibold',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  !isSelected && !option.disabled && 'hover:bg-surface-hover text-text-primary'
                )}
                onClick={() => handleSelect(option)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex items-center gap-2">
                  {multi ? (
                    isSelected ? (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded border border-border shrink-0" />
                    )
                  ) : (
                    isSelected && <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )

  return (
    <div className={cn('w-full', className)}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
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
          <span className="truncate">{displayValue}</span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-text-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />}
        </button>
        {mounted && dropdownMenu && createPortal(dropdownMenu, document.body)}
      </div>
      {error && <p className="mt-1.5 text-sm text-danger" role="alert">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>}
    </div>
  )
}