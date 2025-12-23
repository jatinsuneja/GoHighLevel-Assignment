<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  users: { displayName: string }[]
}

const props = defineProps<Props>()

const text = computed(() => {
  if (props.users.length === 0) return ''
  const firstUser = props.users[0]
  if (props.users.length === 1 && firstUser) return `${firstUser.displayName} is typing`
  return `${props.users.map((u) => u.displayName).join(' and ')} are typing`
})
</script>

<template>
  <div v-if="users.length > 0" class="flex items-center gap-2 px-4 py-2">
    <div class="flex gap-1">
      <span
        v-for="i in 3"
        :key="i"
        class="w-2 h-2 rounded-full bg-slate-400"
        :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
        style="animation: typing-dot 1.4s infinite ease-in-out"
      />
    </div>
    <span class="text-sm text-slate-500">{{ text }}</span>
  </div>
</template>
