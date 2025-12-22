import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSessionId, getDisplayName, setDisplayName } from '@/utils/storage'

export const useSessionStore = defineStore('session', () => {
  // State
  const sessionId = ref<string>(getSessionId())
  const userId = ref<string | null>(null)
  const displayName = ref<string>(getDisplayName() || '')

  // Getters
  const isSessionReady = computed(() => !!sessionId.value)
  const hasDisplayName = computed(() => displayName.value.length > 0)

  // Actions
  function setUserId(id: string) {
    userId.value = id
  }

  function updateDisplayName(name: string) {
    displayName.value = name
    setDisplayName(name)
  }

  function clearUser() {
    userId.value = null
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
