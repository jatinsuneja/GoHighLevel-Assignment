<script setup lang="ts">
import { useNotificationStore } from '@/stores'
import { Toast } from '@/components/atoms'

const notificationStore = useNotificationStore()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-full"
      >
        <div
          v-for="toast in notificationStore.toasts"
          :key="toast.id"
          class="pointer-events-auto"
        >
          <Toast
            :id="toast.id"
            :type="toast.type"
            :message="toast.message"
            @close="notificationStore.removeToast"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
