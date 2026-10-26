'use client'

import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Anchor, Flame, Leaf } from 'lucide-react'
import { motion } from 'framer-motion'

const palettes = [
  { id: 'harbor', name: 'Harbor', primary: '#24586a', secondary: '#a95535', icon: Anchor },
  { id: 'crimson', name: 'Crimson', primary: '#963b4b', secondary: '#836227', icon: Flame },
  { id: 'canopy', name: 'Canopy', primary: '#2c6249', secondary: '#456b86', icon: Leaf },
] as const

type PaletteId = (typeof palettes)[number]['id']

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [palette, setPalette] = useState<PaletteId>('harbor')

  useEffect(() => {
    const storedPalette = window.localStorage.getItem('nest-color-palette')
    const initialPalette = palettes.find((item) => item.id === storedPalette)?.id ?? 'harbor'
    setPalette(initialPalette)
    document.documentElement.dataset.palette = initialPalette
    setMounted(true)

    function syncPalette(event: Event) {
      const nextPalette = (event as CustomEvent<PaletteId>).detail
      if (palettes.some((item) => item.id === nextPalette)) setPalette(nextPalette)
    }

    window.addEventListener('nest-palette-change', syncPalette)
    return () => window.removeEventListener('nest-palette-change', syncPalette)
  }, [])

  function selectPalette(nextPalette: PaletteId, event: React.MouseEvent<HTMLButtonElement>) {
    if (nextPalette === palette) return

    const root = document.documentElement
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const applyPalette = () => {
      setPalette(nextPalette)
      root.dataset.palette = nextPalette
      window.localStorage.setItem('nest-color-palette', nextPalette)
      window.dispatchEvent(new CustomEvent('nest-palette-change', { detail: nextPalette }))
    }

    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown
    }

    if (prefersReducedMotion) {
      applyPalette()
      return
    }

    root.style.setProperty('--click-x', `${event.clientX}px`)
    root.style.setProperty('--click-y', `${event.clientY}px`)

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => flushSync(applyPalette))
      return
    }

    root.classList.remove('palette-transitioning')
    void root.offsetWidth
    root.classList.add('palette-transitioning')
    applyPalette()
    root.addEventListener('animationend', () => root.classList.remove('palette-transitioning'), { once: true })
  }

  return (
    <div className="palette-switcher relative inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface/90 p-1 shadow-sm backdrop-blur-xl sm:gap-1" role="group" aria-label="Color palette" suppressHydrationWarning>
      {palettes.map((option) => {
        const isActive = palette === option.id

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            aria-label={`${option.name} palette`}
            title={`${option.name} palette`}
            onClick={(event) => selectPalette(option.id, event)}
            className={`palette-option relative z-10 flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3 ${isActive ? 'text-white' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {isActive && (
              <motion.span
                layoutId="palette-selection"
                className="palette-selection absolute inset-0 rounded-full"
                transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.9 }}
                aria-hidden="true"
              />
            )}
            <span className="palette-swatches relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: option.primary, color: '#fff' }} aria-hidden="true">
              <option.icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
