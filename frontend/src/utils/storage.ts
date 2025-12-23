const SESSION_ID_KEY = 'chat_session_id'
const DISPLAY_NAME_KEY = 'chat_display_name'
const USER_ID_KEY = 'chat_user_id'

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Get or create a session ID from localStorage
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

/**
 * Clear the session ID (for logout/reset)
 */
export function clearSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY)
}

/**
 * Get the saved display name
 */
export function getDisplayName(): string | null {
  return localStorage.getItem(DISPLAY_NAME_KEY)
}

/**
 * Save the display name
 */
export function setDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name)
}

/**
 * Clear the display name
 */
export function clearDisplayName(): void {
  localStorage.removeItem(DISPLAY_NAME_KEY)
}

/**
 * Get the saved user ID
 */
export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY)
}

/**
 * Save the user ID
 */
export function setUserId(id: string): void {
  localStorage.setItem(USER_ID_KEY, id)
}

/**
 * Clear the user ID
 */
export function clearUserId(): void {
  localStorage.removeItem(USER_ID_KEY)
}
