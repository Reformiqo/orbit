<template>
  <div
    class="flex items-center gap-3 rounded-md border border-outline-gray-1 bg-surface-white px-4 py-3.5"
  >
    <span
      class="h-3 w-3 flex-shrink-0 rounded-full"
      :style="{ backgroundColor: color }"
    />
    <div class="flex flex-col">
      <span class="text-sm text-ink-gray-6">{{ label }}</span>
      <span class="text-2xl font-semibold text-ink-gray-9">{{ value }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: 0 },
  color: { type: String, default: '#94A3B8' },
})
</script>
