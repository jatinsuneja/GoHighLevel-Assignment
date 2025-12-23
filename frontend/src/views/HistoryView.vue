<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DefaultLayout } from '@/layouts'
import { Button, Badge } from '@/components/ui'
import { useNotificationStore } from '@/stores'
import { historyApi } from '@/services/api'
import type { ChatHistoryItem } from '@/types'
import { formatHistoryDate } from '@/utils/formatters'

const router = useRouter()
const notificationStore = useNotificationStore()

const chats = ref<ChatHistoryItem[]>([])
const isLoading = ref(true)
const activeTab = ref<'active' | 'archived'>('active')
const actionLoading = ref<string | null>(null)

const filteredChats = computed(() => {
  if (activeTab.value === 'archived') {
    return chats.value.filter((c) => c.isArchived)
  }
  return chats.value.filter((c) => !c.isArchived)
})

const hasChats = computed(() => filteredChats.value.length > 0)

async function loadHistory() {
  isLoading.value = true
  try {
    const response = await historyApi.getHistory({ includeArchived: true })
    chats.value = response.chats
  } catch (error) {
    notificationStore.error((error as Error).message || 'Failed to load history')
  } finally {
    isLoading.value = false
  }
}

function openChat(chat: ChatHistoryItem) {
  router.push(`/room/${chat.roomCode}`)
}

async function archiveChat(chat: ChatHistoryItem) {
  actionLoading.value = chat.roomId
  try {
    if (chat.isArchived) {
      await historyApi.unarchive(chat.roomId)
      notificationStore.success('Chat unarchived')
    } else {
      await historyApi.archive(chat.roomId)
      notificationStore.success('Chat archived')
    }
    chat.isArchived = !chat.isArchived
  } catch (error) {
    notificationStore.error((error as Error).message || 'Failed to update chat')
  } finally {
    actionLoading.value = null
  }
}

async function deleteChat(chat: ChatHistoryItem) {
  if (!confirm('Are you sure you want to delete this chat from your history?')) {
    return
  }

  actionLoading.value = chat.roomId
  try {
    await historyApi.delete(chat.roomId)
    chats.value = chats.value.filter((c) => c.roomId !== chat.roomId)
    notificationStore.success('Chat deleted from history')
  } catch (error) {
    notificationStore.error((error as Error).message || 'Failed to delete chat')
  } finally {
    actionLoading.value = null
  }
}

onMounted(() => {
  loadHistory()
})
</script>

<template>
  <DefaultLayout>
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 mb-2">Chat History</h1>
        <p class="text-slate-600">View and manage your past conversations.</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6">
        <button
          :class="[
            'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            activeTab === 'active'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
          ]"
          @click="activeTab = 'active'"
        >
          Active
        </button>
        <button
          :class="[
            'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            activeTab === 'archived'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
          ]"
          @click="activeTab = 'archived'"
        >
          Archived
        </button>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="flex justify-center py-12"
      >
        <svg
          class="animate-spin w-8 h-8 text-indigo-600"
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
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!hasChats"
        class="text-center py-12"
      >
        <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
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
        <h3 class="text-lg font-medium text-slate-700 mb-2">
          {{ activeTab === 'archived' ? 'No archived chats' : 'No chat history' }}
        </h3>
        <p class="text-slate-500 text-sm mb-6">
          {{
            activeTab === 'archived'
              ? 'Archived chats will appear here.'
              : 'Start a conversation to see it here.'
          }}
        </p>
        <Button v-if="activeTab === 'active'" @click="router.push('/')">
          Start a New Chat
        </Button>
      </div>

      <!-- Chat List -->
      <div v-else class="space-y-3">
        <div
          v-for="chat in filteredChats"
          :key="chat.roomId"
          class="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <!-- Chat Info -->
            <div
              class="flex-1 min-w-0 cursor-pointer"
              @click="openChat(chat)"
            >
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-medium text-slate-900 truncate">
                  {{ chat.otherParticipant || 'Solo Chat' }}
                </h3>
                <Badge
                  :variant="chat.status === 'active' ? 'success' : 'default'"
                  size="sm"
                >
                  {{ chat.status }}
                </Badge>
              </div>
              <p
                v-if="chat.lastMessage"
                class="text-sm text-slate-600 truncate mb-1"
              >
                {{ chat.lastMessage }}
              </p>
              <p class="text-xs text-slate-400">
                <span class="font-mono">{{ chat.roomCode }}</span>
                <span class="mx-1">•</span>
                <span>{{ formatHistoryDate(chat.lastMessageAt || chat.createdAt) }}</span>
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <button
                class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                :title="chat.isArchived ? 'Unarchive' : 'Archive'"
                :disabled="actionLoading === chat.roomId"
                @click.stop="archiveChat(chat)"
              >
                <svg
                  v-if="chat.isArchived"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3 3m0 0l3-3m-3 3V9"
                  />
                </svg>
              </button>
              <button
                class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete"
                :disabled="actionLoading === chat.roomId"
                @click.stop="deleteChat(chat)"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>
