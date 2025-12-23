import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSessionId, getDisplayName, setDisplayName, getUserId, setUserId as saveUserId, clearUserId } from '@/utils/storage'

export const useSessionStore = defineStore('session', () => {
  // State - load userId from storage on init
  const sessionId = ref<string>(getSessionId())
  const userId = ref<string | null>(getUserId())
  const displayName = ref<string>(getDisplayName() || '')

  // Getters
  const isSessionReady = computed(() => !!sessionId.value)
  const hasDisplayName = computed(() => displayName.value.length > 0)

  // Actions
  function setUserId(id: string) {
    userId.value = id
    saveUserId(id) // Persist to localStorage
  }

  function updateDisplayName(name: string) {
    displayName.value = name
    setDisplayName(name)
  }

  function clearUser() {
    userId.value = null
    clearUserId() // Clear from localStorage
  }

  return {
    // State
    sessionId,
    userId,
    displayName,
    // Getters
    isSessionReady,
    hasDisplayName,
    // Actions
    setUserId,
    updateDisplayName,
    clearUser,
  }
})
