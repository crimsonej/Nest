/**
 * Keeps the last answer for a screen on this device so returning visitors see it at once
 * while fresh data loads in the background. Everything is cleared on sign-out.
 */

const PREFIX = 'nest-cache:v1:'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function semesterPart() {
  try {
    return window.localStorage.getItem('nest-semester-id') || 'current'
  } catch {
    return 'current'
  }
}

/** Key scoped to the person and the semester they are viewing. */
export function screenKey(name: string, userId: string | null | undefined) {
  return `${name}:${userId || 'anon'}:${semesterPart()}`
}

export function readScreenCache<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as { at: number; data: T }
    if (!entry || Date.now() - entry.at > MAX_AGE_MS) return null
    return entry.data
  } catch {
    return null
  }
}

export function writeScreenCache(key: string, data: unknown) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // Storage full or blocked: the screen simply loads normally next time.
  }
}

export function clearScreenCache() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Nothing to clear.
  }
}
