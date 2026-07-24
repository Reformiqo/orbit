<template>
  <div
    class="inline-flex items-center overflow-hidden rounded-md border border-outline-gray-2 bg-surface-white text-sm"
    data-testid="filter-chip"
  >
    <button
      type="button"
      class="flex items-center gap-2 py-1.5 pl-3 pr-3 text-ink-gray-8 transition-colors hover:bg-surface-gray-2"
      @click="$emit('click', $event)"
    >
      <component v-if="icon" :is="icon" class="h-4 w-4 text-ink-gray-6" />
      <span class="font-medium">{{ label }}</span>
      <span class="text-ink-gray-5">is</span>
      <span class="text-ink-gray-9">{{ value }}</span>
    </button>
    <button
      type="button"
      class="flex items-center border-l border-outline-gray-2 px-2 py-1.5 text-ink-gray-5 transition-colors hover:bg-surface-gray-2 hover:text-ink-gray-9"
      @click.stop="$emit('remove')"
      :title="`Remove ${label} filter`"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup>
import X from '~icons/lucide/x'

defineProps({
  icon: { type: [Object, Function], default: null },
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
})
defineEmits(['click', 'remove'])
</script>
