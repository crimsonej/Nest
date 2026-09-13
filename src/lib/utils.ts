import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  })
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(d)
}

export function generateGroupName(courseCode: string, courseworkTitle: string): string {
  const prefix = courseCode.replace(/\s+/g, '').toUpperCase()
  const shortTitle = courseworkTitle.split(' ').slice(0, 2).join(' ').toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${shortTitle}-${random}`
}

export function validateWhatsAppPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 15
}

export function validateStudentRegNumber(regNumber: string): boolean {
  return /^[A-Z0-9]{6,15}$/i.test(regNumber.trim())
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    forming: 'badge-warning',
    active: 'badge-success',
    locked: 'badge-secondary',
    completed: 'badge-primary',
    disbanded: 'badge-danger',
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    todo: 'badge-secondary',
    in_progress: 'badge-primary',
    submitted: 'badge-success',
    graded: 'badge-primary',
  }
  return colors[status] || 'badge-secondary'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'badge-secondary',
    medium: 'badge-warning',
    high: 'badge-danger',
  }
  return colors[priority] || 'badge-secondary'
}

export function calculateGroupFormationRate(totalStudents: number, groupedStudents: number): number {
  if (totalStudents === 0) return 0
  return Math.round((groupedStudents / totalStudents) * 100)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split('\n')
  return lines.map((line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  })
}