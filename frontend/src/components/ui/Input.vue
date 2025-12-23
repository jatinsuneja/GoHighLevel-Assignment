<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string
  type?: 'text' | 'email' | 'password' | 'search'
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  id?: string
  maxlength?: number
  autocomplete?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
}>()

const inputId = computed(() => props.id || `input-${Math.random().toString(36).substring(2, 9)}`)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const inputClasses = computed(() => [
  'w-full px-4 py-2.5 rounded-lg border text-sm transition-colors',
  'focus:outline-none focus:ring-2 focus:ring-offset-0',
  'placeholder:text-slate-400',
  props.error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200',
  props.disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white',
])
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-slate-700 mb-1.5"
    >
      {{ label }}
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      :class="inputClasses"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
      @keydown="$emit('keydown', $event)"
    />
    <p v-if="error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
  </div>
</template>
