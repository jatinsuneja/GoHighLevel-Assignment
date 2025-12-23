<script setup lang="ts">
import Modal from './Modal.vue'
import Button from '../atoms/Button.vue'

interface Props {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Action',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
  loading: false,
})

const emit = defineEmits<{
  close: []
  confirm: []
  cancel: []
}>()

const iconColors = {
  danger: 'text-red-500 bg-red-100',
  warning: 'text-orange-500 bg-orange-100',
  info: 'text-blue-500 bg-blue-100',
}

const buttonVariants = {
  danger: 'danger',
  warning: 'primary',
  info: 'primary',
} as const

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('close')
  emit('cancel')
}

function handleClose() {
  if (!props.loading) {
    emit('close')
  }
}
</script>

<template>
  <Modal
    :open="open"
    :closable="!loading"
    :show-header="false"
    size="sm"
    @close="handleClose"
  >
    <div class="text-center">
      <!-- Icon -->
      <div
        :class="[
          'mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4',
          iconColors[variant],
        ]"
      >
        <!-- Danger Icon -->
        <svg
          v-if="variant === 'danger'"
          class="w-7 h-7"
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
        <!-- Warning Icon -->
        <svg
          v-else-if="variant === 'warning'"
          class="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <!-- Info Icon -->
        <svg
          v-else
          class="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <!-- Title -->
      <h3 class="text-lg font-semibold text-slate-900 mb-2">
        {{ title }}
      </h3>

      <!-- Message -->
      <p class="text-slate-600 mb-6">
        {{ message }}
      </p>

      <!-- Actions -->
      <div class="flex gap-3">
        <Button
          variant="outline"
          class="flex-1"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ cancelText }}
        </Button>
        <Button
          :variant="buttonVariants[variant]"
          class="flex-1"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </Button>
      </div>
    </div>
  </Modal>
</template>
