<script setup lang="ts">
import { ref } from 'vue'
import type { ReactionType } from '@/types'
import { REACTION_TYPES, REACTION_EMOJIS } from '@/utils/constants'

const emit = defineEmits<{
  select: [type: ReactionType]
}>()

const isOpen = ref(false)

function handleSelect(type: ReactionType) {
  emit('select', type)
  isOpen.value = false
}

function togglePicker() {
  isOpen.value = !isOpen.value
}

function closePicker() {
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <button
      class="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
      title="Add reaction"
      @click="togglePicker"
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
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>

    <!-- Reaction Picker Dropdown -->
    <Transition
      enter-active-class="transition-all duration-150"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10"
      >
        <div
          class="flex items-center gap-1 p-1.5 bg-white rounded-full shadow-lg border border-slate-200"
        >
          <button
            v-for="type in REACTION_TYPES"
            :key="type"
            class="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-lg hover:scale-125"
            :title="type"
            @click="handleSelect(type)"
          >
            {{ REACTION_EMOJIS[type] }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Backdrop to close picker -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-0"
      @click="closePicker"
    />
  </div>
</template>
