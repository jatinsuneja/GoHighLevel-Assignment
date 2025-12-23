<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { DefaultLayout } from '@/layouts'
import { Button, Input } from '@/components/atoms'
import { useSessionStore, useRoomStore, useNotificationStore } from '@/stores'
import { ROOM_CODE_LENGTH } from '@/utils/constants'

const router = useRouter()
const route = useRoute()
const sessionStore = useSessionStore()
const roomStore = useRoomStore()
const notificationStore = useNotificationStore()

// Form state
const displayName = ref(sessionStore.displayName || '')
const roomCode = ref('')
const activeTab = ref<'create' | 'join'>('create')

// Loading states
const isCreating = ref(false)
const isJoining = ref(false)

// Validation
const displayNameError = computed(() => {
  if (displayName.value && displayName.value.trim().length < 1) {
    return 'Display name is required'
  }
  if (displayName.value.length > 50) {
    return 'Display name must be 50 characters or less'
  }
  return ''
})

const roomCodeError = computed(() => {
  if (roomCode.value && roomCode.value.length !== ROOM_CODE_LENGTH) {
    return `Room code must be ${ROOM_CODE_LENGTH} characters`
  }
  if (roomCode.value && !/^[A-Z0-9]+$/.test(roomCode.value)) {
    return 'Room code must be uppercase letters and numbers only'
  }
  return ''
})

const canCreate = computed(
  () =>
    displayName.value.trim().length > 0 &&
    !displayNameError.value &&
    !isCreating.value
)

const canJoin = computed(
  () =>
    displayName.value.trim().length > 0 &&
    roomCode.value.length === ROOM_CODE_LENGTH &&
    !displayNameError.value &&
    !roomCodeError.value &&
    !isJoining.value
)

// Format room code to uppercase
function handleRoomCodeInput(value: string) {
  roomCode.value = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

async function handleCreate() {
  if (!canCreate.value) return

  isCreating.value = true
  try {
    sessionStore.updateDisplayName(displayName.value.trim())
    const code = await roomStore.createRoom(displayName.value.trim())
    notificationStore.success('Room created successfully!')
    router.push(`/room/${code}`)
  } catch (error) {
    notificationStore.error((error as Error).message || 'Failed to create room')
  } finally {
    isCreating.value = false
  }
}

async function handleJoin() {
  if (!canJoin.value) return

  isJoining.value = true
  try {
    sessionStore.updateDisplayName(displayName.value.trim())
    await roomStore.joinRoom(roomCode.value, displayName.value.trim())
    notificationStore.success('Joined room successfully!')
    router.push(`/room/${roomCode.value}`)
  } catch (error) {
    notificationStore.error((error as Error).message || 'Failed to join room')
  } finally {
    isJoining.value = false
  }
}

// Check for room code in URL query params (from shared links)
onMounted(() => {
  const joinCode = route.query.join as string
  if (joinCode) {
    roomCode.value = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
    activeTab.value = 'join'
    notificationStore.info('Enter your name to join the room')
    // Clear the query param from URL without navigation
    router.replace({ path: '/', query: {} })
  }
})
</script>

<template>
  <DefaultLayout>
    <div class="max-w-4xl mx-auto px-4 py-8 md:py-16">
      <!-- Hero Section -->
      <div class="text-center mb-8 md:mb-12">
        <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
          Anonymous Chat
        </h1>
        <p class="text-slate-600 text-lg max-w-md mx-auto">
          Create a private room or join an existing one to start chatting instantly.
          No sign-up required.
        </p>
      </div>

      <!-- Tab Selector (Mobile) -->
      <div class="flex gap-2 mb-6 md:hidden">
        <button
          :class="[
            'flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors',
            activeTab === 'create'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200',
          ]"
          @click="activeTab = 'create'"
        >
          Create Room
        </button>
        <button
          :class="[
            'flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors',
            activeTab === 'join'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200',
          ]"
          @click="activeTab = 'join'"
        >
          Join Room
        </button>
      </div>

      <!-- Display Name Input (Shared) -->
      <div class="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
        <Input
          v-model="displayName"
          label="Your Display Name"
          placeholder="Enter your name"
          :error="displayNameError"
          :maxlength="50"
          autocomplete="name"
        />
      </div>

      <!-- Cards Container -->
      <div class="grid md:grid-cols-2 gap-6">
        <!-- Create Room Card -->
        <div
          :class="[
            'bg-white rounded-xl border border-slate-200 p-6 shadow-sm',
            activeTab !== 'create' ? 'hidden md:block' : '',
          ]"
        >
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-900">Create Room</h2>
              <p class="text-sm text-slate-500">Start a new private chat</p>
            </div>
          </div>

          <p class="text-slate-600 text-sm mb-6">
            Create a new room and share the code with someone to start chatting.
            Each room supports up to 2 participants.
          </p>

          <Button
            :loading="isCreating"
            :disabled="!canCreate"
            full-width
            @click="handleCreate"
          >
            Create New Room
          </Button>
        </div>

        <!-- Join Room Card -->
        <div
          :class="[
            'bg-white rounded-xl border border-slate-200 p-6 shadow-sm',
            activeTab !== 'join' ? 'hidden md:block' : '',
          ]"
        >
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg
                class="w-5 h-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-900">Join Room</h2>
              <p class="text-sm text-slate-500">Enter an existing chat</p>
            </div>
          </div>

          <div class="mb-6">
            <Input
              :model-value="roomCode"
              label="Room Code"
              placeholder="Enter 6-character code"
              :error="roomCodeError"
              :maxlength="ROOM_CODE_LENGTH"
              autocomplete="off"
              @update:model-value="handleRoomCodeInput"
              @keydown.enter="handleJoin"
            />
          </div>

          <Button
            :loading="isJoining"
            :disabled="!canJoin"
            full-width
            variant="secondary"
            @click="handleJoin"
          >
            Join Room
          </Button>
        </div>
      </div>

      <!-- Features Section -->
      <div class="mt-12 md:mt-16">
        <h3 class="text-center text-sm font-medium text-slate-500 uppercase tracking-wide mb-6">
          Features
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4">
            <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <span class="text-2xl">💬</span>
            </div>
            <p class="text-sm font-medium text-slate-700">Real-time Chat</p>
          </div>
          <div class="text-center p-4">
            <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <span class="text-2xl">😊</span>
            </div>
            <p class="text-sm font-medium text-slate-700">Emoji Support</p>
          </div>
          <div class="text-center p-4">
            <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <span class="text-2xl">👍</span>
            </div>
            <p class="text-sm font-medium text-slate-700">Reactions</p>
          </div>
          <div class="text-center p-4">
            <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <span class="text-2xl">🔒</span>
            </div>
            <p class="text-sm font-medium text-slate-700">Private Rooms</p>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>
