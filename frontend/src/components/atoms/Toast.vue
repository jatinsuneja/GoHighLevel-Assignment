<script setup lang="ts">
import type { ToastType } from '@/stores/notification.store'

interface Props {
  id: string
  type: ToastType
  message: string
}

defineProps<Props>()

const emit = defineEmits<{
  close: [id: string]
}>()

const typeClasses = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const iconPaths = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}
</script>

<template>
  <div
    :class="[
      'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm animate-slide-in-right',
      typeClasses[type],
    ]"
    role="alert"
  >
    <svg
      class="w-5 h-5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        :d="iconPaths[type]"
      />
    </svg>
    <p class="flex-1 text-sm font-medium">{{ message }}</p>
    <button
      type="button"
      class="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
      aria-label="Dismiss"
      @click="emit('close', id)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</template>
