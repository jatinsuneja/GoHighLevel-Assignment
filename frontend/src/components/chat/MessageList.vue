<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Message, ReactionType } from '@/types'
import { useSessionStore, useChatStore } from '@/stores'
import MessageBubble from './MessageBubble.vue'
import TypingIndicator from './TypingIndicator.vue'
import { getMessageDateGroup } from '@/utils/formatters'

const sessionStore = useSessionStore()
const chatStore = useChatStore()

const containerRef = ref<HTMLElement | null>(null)
const isAtBottom = ref(true)
const isLoadingMore = ref(false)

const messages = computed(() => chatStore.sortedMessages)
const typingUsers = computed(() => chatStore.typingUsersList)
const hasMore = computed(() => chatStore.hasMoreMessages)
const isLoading = computed(() => chatStore.isLoading)

// Group messages by date
const groupedMessages = computed(() => {
  const groups: { date: string; messages: Message[] }[] = []
  let currentGroup: { date: string; messages: Message[] } | null = null

  for (const message of messages.value) {
    const dateGroup = getMessageDateGroup(message.createdAt)

    if (!currentGroup || currentGroup.date !== dateGroup) {
      currentGroup = { date: dateGroup, messages: [] }
      groups.push(currentGroup)
    }

    currentGroup.messages.push(message)
  }

  return groups
})

// Check if we should show avatar (first message in sequence from same sender)
function shouldShowAvatar(message: Message, index: number, groupMessages: Message[]): boolean {
  if (index === 0) return true
  const prevMessage = groupMessages[index - 1]
  if (!prevMessage) return true
  return prevMessage.senderId !== message.senderId
}

// Scroll handling
function handleScroll() {
  if (!containerRef.value) return

  const { scrollTop, scrollHeight, clientHeight } = containerRef.value

  // Check if at bottom (within 50px threshold)
  isAtBottom.value = scrollHeight - scrollTop - clientHeight < 50

  // Load more when scrolled to top
  if (scrollTop < 100 && hasMore.value && !isLoadingMore.value) {
    loadMore()
  }
}

async function loadMore() {
  if (!chatStore.hasMoreMessages || isLoadingMore.value) return

  isLoadingMore.value = true
  const roomId = chatStore.messages[0]?.roomId
  if (roomId) {
    const prevScrollHeight = containerRef.value?.scrollHeight || 0
    await chatStore.loadMessages(roomId, true)

    // Maintain scroll position after loading older messages
    await nextTick()
    if (containerRef.value) {
      const newScrollHeight = containerRef.value.scrollHeight
      containerRef.value.scrollTop = newScrollHeight - prevScrollHeight
    }
  }
  isLoadingMore.value = false
}

function scrollToBottom(smooth = true) {
  if (!containerRef.value) return
  containerRef.value.scrollTo({
    top: containerRef.value.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  })
}

// Auto-scroll when new message arrives (if already at bottom)
watch(
  () => messages.value.length,
  async () => {
    if (isAtBottom.value) {
      await nextTick()
      scrollToBottom()
    }
  }
)

// Event handlers
function handleDelete(messageId: string) {
  chatStore.deleteMessage(messageId)
}

function handleReact(messageId: string, type: ReactionType) {
  chatStore.addReaction(messageId, type)
}

function handleRemoveReaction(messageId: string, type: ReactionType) {
  chatStore.removeReaction(messageId, type)
}

// Expose scrollToBottom for parent component
defineExpose({ scrollToBottom })
</script>

<template>
  <div
    ref="containerRef"
    class="flex-1 overflow-y-auto"
    @scroll="handleScroll"
  >
    <!-- Loading indicator for older messages -->
    <div
      v-if="isLoadingMore"
      class="flex justify-center py-4"
    >
      <div class="flex items-center gap-2 text-slate-500 text-sm">
        <svg
          class="animate-spin w-4 h-4"
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
        <span>Loading older messages...</span>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="messages.length === 0 && !isLoading"
      class="flex flex-col items-center justify-center h-full text-center px-4"
    >
      <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg
          class="w-8 h-8 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-slate-700 mb-2">No messages yet</h3>
      <p class="text-slate-500 text-sm">
        Be the first to send a message!
      </p>
    </div>

    <!-- Messages grouped by date -->
    <div v-else class="py-4">
      <div
        v-for="group in groupedMessages"
        :key="group.date"
      >
        <!-- Date separator -->
        <div class="flex items-center justify-center my-4">
          <div class="px-3 py-1 bg-slate-100 rounded-full">
            <span class="text-xs text-slate-500 font-medium">
              {{ group.date }}
            </span>
          </div>
        </div>

        <!-- Messages -->
        <MessageBubble
          v-for="(message, index) in group.messages"
          :key="message.messageId"
          :message="message"
          :is-own="message.senderId === sessionStore.userId"
          :show-avatar="shouldShowAvatar(message, index, group.messages)"
          @delete="handleDelete"
          @react="handleReact"
          @remove-reaction="handleRemoveReaction"
        />
      </div>
    </div>

    <!-- Typing indicator -->
    <TypingIndicator :users="typingUsers" />
  </div>
</template>
