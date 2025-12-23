<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name?: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
  online?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  name: '',
  size: 'md',
  online: false,
})

const initials = computed(() => {
  if (!props.name) return '?'
  const words = props.name.trim().split(/\s+/)
  const firstWord = words[0]
  const lastWord = words[words.length - 1]
  if (!firstWord) return '?'
  if (words.length === 1) {
    return firstWord.substring(0, 2).toUpperCase()
  }
  const firstChar = firstWord[0] || ''
  const lastChar = lastWord?.[0] || ''
  return (firstChar + lastChar).toUpperCase()
})

// Generate a consistent color based on the name
const backgroundColor = computed(() => {
  if (props.color) return props.color

  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]

  if (!props.name) return colors[0]

  let hash = 0
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

const onlineIndicatorClasses = {
  sm: 'w-2 h-2 right-0 bottom-0',
  md: 'w-2.5 h-2.5 right-0 bottom-0',
  lg: 'w-3 h-3 right-0.5 bottom-0.5',
}
</script>

<template>
  <div class="relative inline-flex">
    <div
      :class="[
        'flex items-center justify-center rounded-full font-medium text-white',
        backgroundColor,
        sizeClasses[size],
      ]"
      :title="name"
    >
      {{ initials }}
    </div>
    <span
      v-if="online"
      :class="[
        'absolute rounded-full bg-green-500 ring-2 ring-white',
        onlineIndicatorClasses[size],
      ]"
    />
  </div>
</template>
