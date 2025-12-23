<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
})

const variantClasses = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <slot />
  </span>
</template>
