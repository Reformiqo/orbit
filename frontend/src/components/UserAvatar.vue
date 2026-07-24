<template>
  <span
    class="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-surface-gray-3 font-medium text-ink-gray-8"
    :class="sizeClass"
    :title="name || email"
  >
    <img
      v-if="image"
      :src="image"
      :alt="name || email"
      class="h-full w-full rounded-full object-cover"
    />
    <span v-else>{{ initials }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  email: { type: String, default: '' },
  name: { type: String, default: '' },
  image: { type: String, default: '' },
  size: { type: String, default: 'sm' }, // xs | sm | md
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'h-5 w-5 text-[10px]'
    case 'lg':
      return 'h-10 w-10 text-base'
    case 'md':
      return 'h-9 w-9 text-sm'
    case 'sm':
    default:
      return 'h-7 w-7 text-xs'
  }
})

const initials = computed(() => {
  const source = props.name || props.email || '?'
  const parts = source.split(/[@\s]+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
})
</script>
