<template>
  <button
    type="button"
    class="flex h-9 w-9 items-center justify-center rounded transition-colors"
    :class="
      isActive
        ? 'bg-surface-gray-3 text-ink-gray-9'
        : 'text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9'
    "
    :title="title"
    @mousedown.prevent
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  isActive: { type: Boolean, default: false },
  title: { type: String, default: '' },
})
defineEmits(['click'])
</script>
