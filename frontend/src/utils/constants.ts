// Reaction emoji mappings
export const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
}

// Reaction types in display order
export const REACTION_TYPES = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'] as const

// Room code length
export const ROOM_CODE_LENGTH = 6

// Message limits
export const MAX_MESSAGE_LENGTH = 2000

// Pagination
export const MESSAGES_PER_PAGE = 50

// Typing indicator timeout (ms)
export const TYPING_TIMEOUT = 3000

// Debounce delay for typing indicator (ms)
export const TYPING_DEBOUNCE = 500

// Toast auto-dismiss duration (ms)
export const TOAST_DURATION = 3000

// Socket reconnection settings
export const SOCKET_RECONNECTION_ATTEMPTS = 5
export const SOCKET_RECONNECTION_DELAY = 1000
