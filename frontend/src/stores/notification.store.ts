import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TOAST_DURATION } from '@/utils/constants'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
}

export const useNotificationStore = defineStore('notification', () => {
  // State
  const toasts = ref<Toast[]>([])

  // Actions
  function addToast(
    message: string,
    type: ToastType = 'info',
    duration: number = TOAST_DURATION
  ): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    toasts.value.push({ id, type, message, duration })

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  function removeToast(id: string) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  function clearAllToasts() {
    toasts.value = []
  }

  // Convenience methods
  function success(message: string, duration?: number) {
    return addToast(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    return addToast(message, 'error', duration)
  }

  function warning(message: string, duration?: number) {
    return addToast(message, 'warning', duration)
  }

  function info(message: string, duration?: number) {
    return addToast(message, 'info', duration)
  }

  return {
    // State
    toasts,
    // Actions
    addToast,
    removeToast,
    clearAllToasts,
    // Convenience methods
    success,
    error,
    warning,
    info,
  }
})
