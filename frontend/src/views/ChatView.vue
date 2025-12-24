<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ToastContainer } from '@/components/molecules'
import { ChatHeader, MessageList, MessageInput } from '@/components/organisms'
import {
  useSessionStore,
  useRoomStore,
  useChatStore,
  useNotificationStore,
} from '@/stores'
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket'
import type {
  RoomJoinedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  UserTypingPayload,
  MessageDeletedPayload,
  ReactionUpdatedPayload,
  RoomClosedPayload,
  SocketErrorPayload,
  ParticipantsUpdatedPayload,
} from '@/types'
import type { Message } from '@/types'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const roomStore = useRoomStore()
const chatStore = useChatStore()
const notificationStore = useNotificationStore()

const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)
const isConnecting = ref(true)
const connectionError = ref<string | null>(null)

const roomCode = route.params.roomCode as string

// Validate room code from URL
if (!roomCode || roomCode === 'undefined') {
  router.push('/')
}

// Socket event handlers
function handleRoomJoined(payload: RoomJoinedPayload) {
  isConnecting.value = false
  connectionError.value = null

  // Set user ID from the server
  sessionStore.setUserId(payload.userId)

  // Update room store with participants
  roomStore.updateParticipants(payload.participants)

  // Set initial messages
  chatStore.setMessages(payload.recentMessages)

  // Scroll to bottom after messages load
  setTimeout(() => {
    messageListRef.value?.scrollToBottom(false)
  }, 100)
}

function handleUserJoined(payload: UserJoinedPayload) {
  roomStore.addParticipant({
    userId: payload.userId,
    displayName: payload.displayName,
    isActive: true,
    joinedAt: payload.joinedAt || payload.timestamp || new Date().toISOString(),
    isOnline: true,
  })
  notificationStore.info(`${payload.displayName} joined the room`)
}

function handleUserLeft(payload: UserLeftPayload) {
  roomStore.removeParticipant(payload.userId)
  if (payload.displayName) {
    notificationStore.info(`${payload.displayName} left the room`)
  }
}

function handleParticipantsUpdated(payload: ParticipantsUpdatedPayload) {
  // This is the authoritative source for participants list
  // Replaces the entire participants array with fresh data from server
  roomStore.updateParticipants(payload.participants)
}

function handleNewMessage(message: Message) {
  chatStore.addMessage(message)
}

function handleUserTyping(payload: UserTypingPayload) {
  // Don't show typing indicator for own messages
  if (payload.userId === sessionStore.userId) return
  chatStore.setUserTyping(payload.userId, payload.displayName, payload.isTyping)
}

function handleMessageDeleted(payload: MessageDeletedPayload) {
  chatStore.updateMessageDeleted(payload.messageId, payload.deletedBy)
}

function handleReactionUpdated(payload: ReactionUpdatedPayload) {
  chatStore.updateMessageReactions(payload.messageId, payload.reactions)
}

function handleRoomClosed(payload: RoomClosedPayload) {
  roomStore.setRoomClosed()
  notificationStore.warning('This room has been closed')
}

function handleSocketError(payload: SocketErrorPayload) {
  connectionError.value = payload.message
  notificationStore.error(payload.message)
  
  // If room not found, redirect to home
  if (
    payload.message.includes('not found') ||
    payload.message.includes('has been closed') ||
    payload.message.includes('Not a participant')
  ) {
    setTimeout(() => {
      roomStore.clearCurrentRoom()
      router.push('/')
    }, 2000)
  }
}

function handleDisconnect() {
  notificationStore.warning('Connection lost. Reconnecting...')
}

function handleConnect() {
  // Emit join_room when socket connects (or reconnects)
  const socket = getSocket()
  if (roomStore.roomId) {
    socket.emit('join_room', { roomId: roomStore.roomId })
  }
}

async function initializeChat() {
  isConnecting.value = true
  connectionError.value = null

  // Validate room code
  if (!roomCode || roomCode === 'undefined') {
    router.push('/')
    return
  }

  try {
    // Check if user is already in this specific room (same session, same room)
    const alreadyInThisRoom = roomStore.isInRoom && roomStore.roomCode === roomCode

    if (!alreadyInThisRoom) {
      // User is not in this room - redirect to home to enter/confirm name
      // This prevents auto-joining and gives user control
      router.push({ path: '/', query: { join: roomCode } })
      return
    }

    // User is already in this room, just reconnect the socket

    // Connect to socket
    const socket = connectSocket()

    // Set up event listeners
    socket.on('room_joined', handleRoomJoined)
    socket.on('user_joined', handleUserJoined)
    socket.on('user_left', handleUserLeft)
    socket.on('participants_updated', handleParticipantsUpdated)
    socket.on('new_message', handleNewMessage)
    socket.on('user_typing', handleUserTyping)
    socket.on('message_deleted', handleMessageDeleted)
    socket.on('reaction_updated', handleReactionUpdated)
    socket.on('room_closed', handleRoomClosed)
    socket.on('error', handleSocketError)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect', handleConnect)

    // If socket is already connected, emit join_room immediately
    // Otherwise, it will be emitted when 'connect' event fires
    if (socket.connected && roomStore.roomId) {
      socket.emit('join_room', { roomId: roomStore.roomId })
    }
  } catch (error) {
    connectionError.value = (error as Error).message
    notificationStore.error((error as Error).message || 'Failed to join room')

    // Redirect to home if room doesn't exist or is closed
    setTimeout(() => {
      router.push('/')
    }, 2000)
  }
}

function cleanup() {
  const socket = getSocket()

  // Remove event listeners
  socket.off('room_joined', handleRoomJoined)
  socket.off('user_joined', handleUserJoined)
  socket.off('user_left', handleUserLeft)
  socket.off('participants_updated', handleParticipantsUpdated)
  socket.off('new_message', handleNewMessage)
  socket.off('user_typing', handleUserTyping)
  socket.off('message_deleted', handleMessageDeleted)
  socket.off('reaction_updated', handleReactionUpdated)
  socket.off('room_closed', handleRoomClosed)
  socket.off('error', handleSocketError)
  socket.off('disconnect', handleDisconnect)
  socket.off('connect', handleConnect)

  // Clear stores
  chatStore.clearMessages()
  chatStore.clearTypingUsers()
}

onMounted(() => {
  initializeChat()
})

onUnmounted(() => {
  cleanup()
})

// Handle route changes (e.g., browser back button)
watch(
  () => route.params.roomCode,
  (newCode) => {
    if (newCode && newCode !== roomCode) {
      cleanup()
      initializeChat()
    }
  }
)
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- Loading State -->
    <div
      v-if="isConnecting"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <svg
          class="animate-spin w-8 h-8 text-indigo-600 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p class="text-slate-600">Connecting to room...</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="connectionError"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center px-4">
        <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg
            class="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-slate-900 mb-2">Connection Error</h2>
        <p class="text-slate-600 mb-4">{{ connectionError }}</p>
        <p class="text-sm text-slate-500">Redirecting to home...</p>
      </div>
    </div>

    <!-- Chat Interface -->
    <template v-else>
      <ChatHeader />

      <MessageList ref="messageListRef" />

      <MessageInput />
    </template>

    <!-- Toast Container -->
    <ToastContainer />
  </div>
</template>
