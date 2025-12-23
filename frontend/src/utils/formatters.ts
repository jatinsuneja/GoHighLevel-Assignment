import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns'

/**
 * Format a message timestamp for display
 * - Today: "2:30 PM"
 * - Yesterday: "Yesterday 2:30 PM"
 * - This week: "Mon 2:30 PM"
 * - Older: "Dec 20, 2:30 PM"
 */
export function formatMessageTime(dateString: string): string {
  const date = parseISO(dateString)

  if (isToday(date)) {
    return format(date, 'h:mm a')
  }

  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`
  }

  // Within the last 7 days
  const daysDiff = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysDiff < 7) {
    return format(date, 'EEE h:mm a')
  }

  // Older
  return format(date, 'MMM d, h:mm a')
}

/**
 * Format a relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = parseISO(dateString)
  return formatDistanceToNow(date, { addSuffix: true })
}

/**
 * Format a date for chat history list
 * - Today: "Today"
 * - Yesterday: "Yesterday"
 * - This year: "Dec 20"
 * - Older: "Dec 20, 2024"
 */
export function formatHistoryDate(dateString: string): string {
  const date = parseISO(dateString)

  if (isToday(date)) {
    return 'Today'
  }

  if (isYesterday(date)) {
    return 'Yesterday'
  }

  const isThisYear = date.getFullYear() === new Date().getFullYear()
  return format(date, isThisYear ? 'MMM d' : 'MMM d, yyyy')
}

/**
 * Group messages by date for display
 */
export function getMessageDateGroup(dateString: string): string {
  const date = parseISO(dateString)

  if (isToday(date)) {
    return 'Today'
  }

  if (isYesterday(date)) {
    return 'Yesterday'
  }

  return format(date, 'MMMM d, yyyy')
}
