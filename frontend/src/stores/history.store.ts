import { defineStore } from 'pinia'
import { ref } from 'vue'
import { historyApi } from '@/services/api'
import type { ChatHistoryItem } from '@/types'

export const useHistoryStore = defineStore('history', () => {
  // State
  const history = ref<ChatHistoryItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  async function fetchHistory(includeArchived = true): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await historyApi.getHistory({ includeArchived })
      history.value = response.chats
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function archiveChat(roomId: string): Promise<void> {
    try {
      await historyApi.archive(roomId)
      const item = history.value.find((h) => h.roomId === roomId)
      if (item) {
        item.isArchived = true
      }
    } catch (err) {
      error.value = (err as Error).message
      throw err
    }
  }

  async function unarchiveChat(roomId: string): Promise<void> {
    try {
      await historyApi.unarchive(roomId)
      const item = history.value.find((h) => h.roomId === roomId)
      if (item) {
        item.isArchived = false
      }
    } catch (err) {
      error.value = (err as Error).message
      throw err
    }
  }

  async function deleteChat(roomId: string): Promise<void> {
    try {
      await historyApi.delete(roomId)
      history.value = history.value.filter((h) => h.roomId !== roomId)
    } catch (err) {
      error.value = (err as Error).message
      throw err
    }
  }

  function clearHistory() {
    history.value = []
    error.value = null
  }

  return {
    // State
    history,
    isLoading,
    error,
    // Actions
    fetchHistory,
    archiveChat,
    unarchiveChat,
    deleteChat,
    clearHistory,
  }
})
