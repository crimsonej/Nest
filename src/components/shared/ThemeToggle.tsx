'use client'

import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Anchor, Flame, Leaf } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/animation'

const palettes = [
  { id: 'harbor', name: 'Harbor', primary: '#24586a', secondary: '#a95535', icon: Anchor },
  { id: 'crimson', name: 'Crimson', primary: '#ae2642', secondary: '#e5a02a', icon: Flame },
  { id: 'canopy', name: 'Canopy', primary: '#2c6249', secondary: '#456b86', icon: Leaf },
] as const

type PaletteId = (typeof palettes)[number]['id']

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [palette, setPalette] = useState<PaletteId>('harbor')
  const reducedMotion = useReducedMotion()

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

  const currentIndex = palettes.findIndex((item) => item.id === palette)
  const currentPalette = palettes[currentIndex] || palettes[0]
  const nextPalette = palettes[(currentIndex + 1) % palettes.length]

  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        aria-label={`Change palette from ${currentPalette.name} to ${nextPalette.name}`}
        title={`Color palette: ${currentPalette.name}. Click for ${nextPalette.name}.`}
        onClick={(event) => selectPalette(nextPalette.id, event)}
        className="palette-option flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface/90 shadow-sm backdrop-blur-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
        suppressHydrationWarning
      >
        <span className="palette-swatches relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-white" style={{ backgroundColor: currentPalette.primary }} aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={currentPalette.id}
              initial={reducedMotion ? false : { opacity: 0, rotate: -30, scale: 0.75 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, rotate: 30, scale: 0.75 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <currentPalette.icon className="h-4 w-4" strokeWidth={2.2} />
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
    </div>
  )
}
