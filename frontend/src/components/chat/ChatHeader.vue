<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Avatar, Badge, Button } from '@/components/ui'
import { useRoomStore, useSessionStore, useNotificationStore } from '@/stores'

const router = useRouter()
const roomStore = useRoomStore()
const sessionStore = useSessionStore()
const notificationStore = useNotificationStore()

const roomCode = computed(() => roomStore.roomCode || '')
const isRoomActive = computed(() => roomStore.isRoomActive)

const otherParticipant = computed(() => {
  return roomStore.participants.find(
    (p) => p.userId !== sessionStore.userId && p.isActive
  )
})

const isOtherOnline = computed(() => {
  return otherParticipant.value?.isOnline ?? false
})

async function copyRoomCode() {
  try {
    await navigator.clipboard.writeText(roomCode.value)
    notificationStore.success('Room code copied to clipboard!')
  } catch {
    notificationStore.error('Failed to copy room code')
  }
}

async function shareRoom() {
  const shareUrl = `${window.location.origin}/room/${roomCode.value}`
  
  // Use native share API if available (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Join my chat room',
        text: `Join my anonymous chat! Room code: ${roomCode.value}`,
        url: shareUrl,
      })
      return
    } catch (err) {
      // User cancelled or share failed, fall back to clipboard
      if ((err as Error).name === 'AbortError') return
    }
  }
  
  // Fall back to copying link
  try {
    await navigator.clipboard.writeText(shareUrl)
    notificationStore.success('Room link copied to clipboard!')
  } catch {
    notificationStore.error('Failed to copy link')
  }
}

async function handleLeave() {
  try {
    await roomStore.leaveRoom()
    notificationStore.info('You left the room')
    router.push('/')
  } catch (error) {
    notificationStore.error((error as Error).message || 'Failed to leave room')
  }
}
</script>

<template>
  <header class="bg-white border-b border-slate-200 px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <!-- Left: Other participant info -->
      <div class="flex items-center gap-3 min-w-0">
        <Avatar
          v-if="otherParticipant"
          :name="otherParticipant.displayName"
          :online="isOtherOnline"
          size="md"
        />
        <div
          v-else
          class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
        >
          <svg
            class="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <h1 class="font-semibold text-slate-900 truncate">
            {{ otherParticipant?.displayName || 'Waiting for someone...' }}
          </h1>
          <p class="text-sm text-slate-500">
            <span v-if="otherParticipant && isOtherOnline" class="text-green-600">
              Online
            </span>
            <span v-else-if="otherParticipant">Offline</span>
            <span v-else>Share the room code to invite</span>
          </p>
        </div>
      </div>

      <!-- Right: Room code & actions -->
      <div class="flex items-center gap-2">
        <!-- Room Code -->
        <button
          class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
          title="Click to copy room code"
          @click="copyRoomCode"
        >
          <span class="text-sm font-mono font-medium text-slate-700">
            {{ roomCode }}
          </span>
          <svg
            class="w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>

        <!-- Share Button -->
        <button
          class="p-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 transition-colors"
          title="Share room link"
          @click="shareRoom"
        >
          <svg
            class="w-5 h-5 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>

        <!-- Mobile: Copy button -->
        <button
          class="sm:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
          title="Copy room code"
          @click="copyRoomCode"
        >
          <svg
            class="w-5 h-5 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>

        <!-- Room Status -->
        <Badge v-if="!isRoomActive" variant="warning" size="sm">
          Closed
        </Badge>

        <!-- Leave Button -->
        <Button
          v-if="isRoomActive"
          variant="ghost"
          size="sm"
          @click="handleLeave"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span class="hidden sm:inline">Leave</span>
        </Button>
      </div>
    </div>
  </header>
</template>
