import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, ReactionCount } from '@/types'
import { messageApi } from '@/services/api'
import { getSocket } from '@/services/socket'
import { MESSAGES_PER_PAGE } from '@/utils/constants'

interface TypingUser {
  userId: string
  displayName: string
  timestamp: number
}

export const useChatStore = defineStore('chat', () => {
  // State
  const messages = ref<Message[]>([])
  const typingUsers = ref<Map<string, TypingUser>>(new Map())
  const isLoading = ref(false)
  const isSending = ref(false)
  const hasMoreMessages = ref(true)
  const oldestMessageId = ref<string | null>(null)
  const error = ref<string | null>(null)

  // Getters
  const sortedMessages = computed(() => {
    return [...messages.value].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  })

  const typingUsersList = computed(() => {
    const now = Date.now()
    const active: TypingUser[] = []
    typingUsers.value.forEach((user) => {
      // Only show typing users from the last 5 seconds
      if (now - user.timestamp < 5000) {
        active.push(user)
      }
    })
    return active
  })

  const typingText = computed(() => {
    const users = typingUsersList.value
    if (users.length === 0) return ''
    const firstUser = users[0]
    if (users.length === 1 && firstUser) return `${firstUser.displayName} is typing...`
    return `${users.map((u) => u.displayName).join(' and ')} are typing...`
  })

  // Actions
  async function loadMessages(roomId: string, loadMore = false): Promise<void> {
    if (isLoading.value) return
    if (loadMore && !hasMoreMessages.value) return

    isLoading.value = true
    error.value = null

    try {
      const response = await messageApi.getMessages({
        roomId,
        limit: MESSAGES_PER_PAGE,
        before: loadMore ? oldestMessageId.value || undefined : undefined,
      })

      if (loadMore) {
        // Prepend older messages
        messages.value = [...response.messages, ...messages.value]
      } else {
        // Initial load
        messages.value = response.messages
      }

      hasMoreMessages.value = response.pagination.hasMore
      const firstMessage = response.messages[0]
      if (response.messages.length > 0 && firstMessage) {
        oldestMessageId.value = firstMessage.messageId
      }
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function sendMessage(
    roomId: string,
    content: string,
    contentType: 'text' | 'emoji' = 'text'
  ): Promise<Message> {
    isSending.value = true
    error.value = null

    try {
      const message = await messageApi.send({ roomId, content, contentType })
      // Don't add to messages here - it will come through the socket
      return message
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isSending.value = false
    }
  }

  function deleteMessage(messageId: string): void {
    error.value = null
    // Use socket event instead of REST API for real-time broadcast
    const socket = getSocket()
    if (socket) {
      socket.emit('delete_message', { messageId })
    }
  }

  function addReaction(messageId: string, type: string): void {
    error.value = null
    // Use socket event instead of REST API for real-time broadcast
    const socket = getSocket()
    if (socket) {
      socket.emit('add_reaction', { messageId, type })
    }
  }

  function removeReaction(messageId: string, type: string): void {
    error.value = null
    // Use socket event instead of REST API for real-time broadcast
    const socket = getSocket()
    if (socket) {
      socket.emit('remove_reaction', { messageId, type })
    }
  }

  // Socket event handlers
  function addMessage(message: Message) {
    // Check if message already exists
    const exists = messages.value.find((m) => m.messageId === message.messageId)
    if (!exists) {
      messages.value.push(message)
    }
  }

  function setMessages(newMessages: Message[]) {
    messages.value = newMessages
    const firstMessage = newMessages[0]
    if (newMessages.length > 0 && firstMessage) {
      oldestMessageId.value = firstMessage.messageId
    }
  }

  function updateMessageDeleted(
    messageId: string,
    deletedByName: string
  ) {
    const message = messages.value.find((m) => m.messageId === messageId)
    if (message) {
      message.isDeleted = true
      message.deletedByName = deletedByName
    }
  }

  function updateMessageReactions(
    messageId: string,
    reactions: ReactionCount[]
  ) {
    const message = messages.value.find((m) => m.messageId === messageId)
    if (message) {
      message.reactions = reactions
    }
  }

  function setUserTyping(userId: string, displayName: string, isTyping: boolean) {
    if (isTyping) {
      typingUsers.value.set(userId, {
        userId,
        displayName,
        timestamp: Date.now(),
      })
    } else {
      typingUsers.value.delete(userId)
    }
  }

  function clearTypingUsers() {
    typingUsers.value.clear()
  }

  function clearMessages() {
    messages.value = []
    typingUsers.value.clear()
    hasMoreMessages.value = true
    oldestMessageId.value = null
    error.value = null
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    messages,
    typingUsers,
    isLoading,
    isSending,
    hasMoreMessages,
    error,
    // Getters
    sortedMessages,
    typingUsersList,
    typingText,
    // Actions
    loadMessages,
    sendMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    // Socket handlers
    addMessage,
    setMessages,
    updateMessageDeleted,
    updateMessageReactions,
    setUserTyping,
    clearTypingUsers,
    clearMessages,
    clearError,
  }
})
