<script setup lang="ts">
import { computed } from 'vue'
import type { Message, ReactionType } from '@/types'
import { Avatar } from '@/components/atoms'
import { formatMessageTime } from '@/utils/formatters'
import { REACTION_EMOJIS } from '@/utils/constants'
import ReactionPicker from './ReactionPicker.vue'

interface Props {
  message: Message
  isOwn: boolean
  showAvatar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true,
})

const emit = defineEmits<{
  delete: [messageId: string]
  react: [messageId: string, type: ReactionType]
  removeReaction: [messageId: string, type: ReactionType]
}>()

const formattedTime = computed(() => formatMessageTime(props.message.createdAt))

const visibleReactions = computed(() =>
  props.message.reactions.filter((r) => r.count > 0)
)

const deletionText = computed(() => {
  if (!props.message.isDeleted) return ''
  return `This message was deleted`
})

function handleReaction(type: ReactionType) {
  const existing = props.message.reactions.find((r) => r.type === type)
  if (existing?.userReacted) {
    emit('removeReaction', props.message.messageId, type)
  } else {
    emit('react', props.message.messageId, type)
  }
}

function toggleReaction(type: ReactionType) {
  const existing = props.message.reactions.find((r) => r.type === type)
  if (existing?.userReacted) {
    emit('removeReaction', props.message.messageId, type)
  } else {
    emit('react', props.message.messageId, type)
  }
}
</script>

<template>
  <div
    :class="[
      'group flex gap-2 px-4 py-1',
      isOwn ? 'flex-row-reverse' : 'flex-row',
    ]"
  >
    <!-- Avatar -->
    <div v-if="showAvatar" class="flex-shrink-0 w-8">
      <Avatar
        v-if="!isOwn"
        :name="message.senderName"
        size="sm"
      />
    </div>
    <div v-else class="w-8 flex-shrink-0" />

    <!-- Message Content -->
    <div
      :class="[
        'max-w-[75%] md:max-w-[60%]',
        isOwn ? 'items-end' : 'items-start',
      ]"
    >
      <!-- Sender name (for others) -->
      <p
        v-if="!isOwn && showAvatar"
        class="text-xs text-slate-500 mb-1 ml-1"
      >
        {{ message.senderName }}
      </p>

      <!-- Message bubble -->
      <div class="relative">
        <div
          :class="[
            'relative px-4 py-2 rounded-2xl',
            message.isDeleted
              ? 'bg-slate-100 text-slate-500 italic'
              : isOwn
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-900',
            message.contentType === 'emoji' && !message.isDeleted
              ? 'text-3xl bg-transparent !px-1 !py-0 border-none'
              : '',
          ]"
        >
          <p v-if="message.isDeleted" class="text-sm">
            {{ deletionText }}
          </p>
          <p v-else class="whitespace-pre-wrap break-words">
            {{ message.content }}
          </p>
        </div>

        <!-- Actions (visible on hover) -->
        <div
          v-if="!message.isDeleted"
          :class="[
            'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity',
            'flex items-center gap-1 bg-white rounded-full shadow-md border border-slate-200 p-1',
            isOwn ? 'right-full mr-2' : 'left-full ml-2',
          ]"
        >
          <!-- Reaction Picker -->
          <ReactionPicker @select="handleReaction" />

          <!-- Delete Button (only for own messages) -->
          <button
            v-if="isOwn"
            class="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete message"
            @click="emit('delete', message.messageId)"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Reactions display -->
      <div
        v-if="visibleReactions.length > 0"
        class="flex flex-wrap gap-1 mt-1"
        :class="isOwn ? 'justify-end' : 'justify-start'"
      >
        <button
          v-for="reaction in visibleReactions"
          :key="reaction.type"
          :class="[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
            reaction.userReacted
              ? 'bg-indigo-100 border border-indigo-300'
              : 'bg-slate-100 border border-slate-200',
          ]"
          @click="toggleReaction(reaction.type)"
        >
          <span>{{ REACTION_EMOJIS[reaction.type] }}</span>
          <span class="font-medium">{{ reaction.count }}</span>
        </button>
      </div>

      <!-- Timestamp -->
      <p
        :class="[
          'text-xs text-slate-400 mt-1',
          isOwn ? 'text-right mr-1' : 'ml-1',
        ]"
      >
        {{ formattedTime }}
      </p>
    </div>
  </div>
</template>
