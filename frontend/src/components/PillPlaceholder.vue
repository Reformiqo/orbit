<template>
  <button
    type="button"
    class="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-dashed border-outline-gray-2 px-3 py-1.5 text-sm text-ink-gray-5 opacity-60"
    :title="`${label} — coming soon`"
  >
    <component v-if="icon" :is="icon" class="h-4 w-4" />
    {{ label }}
  </button>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  icon: { type: [Object, Function], default: null },
})
</script>
