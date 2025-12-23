<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'

interface Props {
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
  closable?: boolean
  showHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  closable: true,
  showHeader: true,
})

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  if (props.closable) {
    emit('close')
  }
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})

// Prevent body scroll when modal is open
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click="handleBackdropClick"
      >
        <div
          :class="[
            'w-full bg-white rounded-xl shadow-xl animate-slide-up',
            sizeClasses[size],
          ]"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <div
            v-if="showHeader && (title || closable)"
            class="flex items-center justify-between px-6 py-4 border-b border-slate-200"
          >
            <h2 class="text-lg font-semibold text-slate-900">
              {{ title }}
            </h2>
            <button
              v-if="closable"
              type="button"
              class="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
              @click="handleClose"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-4">
            <slot />
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
