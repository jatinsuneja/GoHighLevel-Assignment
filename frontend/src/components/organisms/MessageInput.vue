<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'
import { Button } from '@/components/atoms'
import { useChatStore, useRoomStore, useNotificationStore } from '@/stores'
import { MAX_MESSAGE_LENGTH, TYPING_DEBOUNCE } from '@/utils/constants'
import { getSocket } from '@/services/socket'

const chatStore = useChatStore()
const roomStore = useRoomStore()
const notificationStore = useNotificationStore()

const message = ref('')
const showEmojiPicker = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

let typingTimeout: ReturnType<typeof setTimeout> | null = null

const isDisabled = ref(!roomStore.isRoomActive)

// Watch for room status changes
watch(() => roomStore.isRoomActive, (isActive) => {
  isDisabled.value = !isActive
})

// Auto-resize textarea
watch(message, () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 120)}px`
  }
})

function handleTyping() {
  const socket = getSocket()
  const roomId = roomStore.roomId

  if (!roomId) return

  // Emit typing start
  socket.emit('typing', { roomId, isTyping: true })

  // Clear previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }

  // Set timeout to stop typing indicator
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { roomId, isTyping: false })
  }, TYPING_DEBOUNCE)
}

async function sendMessage() {
  const content = message.value.trim()
  if (!content || !roomStore.roomId) return

  // Stop typing indicator
  if (typingTimeout) {
    clearTimeout(typingTimeout)
    const socket = getSocket()
    socket.emit('typing', { roomId: roomStore.roomId, isTyping: false })
  }

  try {
    // Determine if message is emoji-only (1-3 emojis with no other text)
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F){1,3}$/u
    const contentType = emojiRegex.test(content) ? 'emoji' : 'text'

    // Send via socket for real-time delivery
    const socket = getSocket()
    socket.emit('send_message', {
      roomId: roomStore.roomId,
      content,
      contentType,
    })

    message.value = ''

    // Reset textarea height
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
  } catch (error) {
    notificationStore.error((error as Error).message || 'Failed to send message')
  }
}

function handleKeyDown(event: KeyboardEvent) {
  // Send on Enter (without Shift)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function insertEmoji(emoji: { i: string }) {
  message.value += emoji.i
  showEmojiPicker.value = false
  textareaRef.value?.focus()
}

function toggleEmojiPicker() {
  console.log('Toggle emoji picker, current:', showEmojiPicker.value)
  showEmojiPicker.value = !showEmojiPicker.value
  console.log('After toggle:', showEmojiPicker.value)
}

onUnmounted(() => {
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
})
</script>

<template>
  <div class="relative border-t border-slate-200 bg-white p-4">
    <!-- Emoji Picker -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="showEmojiPicker"
        class="absolute bottom-full left-0 right-0 mb-2 px-4 z-50"
      >
        <div class="max-w-md mx-auto">
          <EmojiPicker
            :native="true"
            :display-recent="true"
            :disable-skin-tones="true"
            @select="insertEmoji"
          />
        </div>
      </div>
    </Transition>

    <div class="flex items-end gap-2">
      <!-- Emoji Button -->
      <button
        type="button"
        class="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        :class="{ 'bg-slate-100 text-slate-600': showEmojiPicker }"
        :disabled="isDisabled"
        @click="toggleEmojiPicker"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      <!-- Message Input -->
      <div class="flex-1 relative">
        <textarea
          ref="textareaRef"
          v-model="message"
          :disabled="isDisabled"
          :maxlength="MAX_MESSAGE_LENGTH"
          placeholder="Type a message..."
          class="w-full px-4 py-2.5 rounded-2xl border border-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed text-sm"
          rows="1"
          @input="handleTyping"
          @keydown="handleKeyDown"
        />
      </div>

      <!-- Send Button -->
      <Button
        :disabled="!message.trim() || isDisabled"
        size="md"
        @click="sendMessage"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </Button>
    </div>

    <!-- Room closed message -->
    <p
      v-if="isDisabled"
      class="text-center text-sm text-slate-500 mt-2"
    >
      This room is closed. You cannot send messages.
    </p>
  </div>
</template>
